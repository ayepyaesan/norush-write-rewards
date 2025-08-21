import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Target, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { RichTextEditor } from "@/components/RichTextEditor";

interface Task {
  id: string;
  task_name: string;
  word_count: number;
  duration_days: number;
  deposit_amount: number;
  status: string;
  created_at: string;
  deadline: string | null;
  payments?: any[];
}

interface TaskFile {
  id: string;
  task_id: string;
  user_id: string;
  day_number: number;
  title: string;
  content: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

const DailyTextEditor = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [taskFiles, setTaskFiles] = useState<TaskFile[]>([]);
  const [activeDay, setActiveDay] = useState(1);
  const [currentContent, setCurrentContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUserAndLoadTask();
  }, [taskId]);

  useEffect(() => {
    if (taskFiles.length > 0) {
      const activeFile = taskFiles.find(file => file.day_number === activeDay);
      setCurrentContent(activeFile?.content || "");
    }
  }, [activeDay, taskFiles]);

  const checkUserAndLoadTask = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/workspace");
      return;
    }

    setUser(user);
    await loadTask(user.id);
  };

  const loadTask = async (userId: string) => {
    try {
      // Load task details
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          payments (*)
        `)
        .eq('id', taskId)
        .eq('user_id', userId)
        .single();

      if (taskError) {
        toast({
          title: "Error",
          description: "Failed to load task details.",
          variant: "destructive",
        });
        navigate("/user/dashboard");
        return;
      }

      // Check if payment is verified
      if (taskData.payments?.[0]?.payment_status !== 'verified') {
        toast({
          title: "Payment Required",
          description: "Please complete payment before accessing the workspace.",
          variant: "destructive",
        });
        navigate(`/payment/${taskId}`);
        return;
      }

      setTask(taskData);

      // Load existing task files
      const { data: filesData, error: filesError } = await supabase
        .from('task_files')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .order('day_number', { ascending: true });

      if (filesError) {
        console.error('Error loading task files:', filesError);
      } else {
        setTaskFiles(filesData || []);
      }

      // Generate daily task files if they don't exist
      await generateDailyFiles(taskData, userId);

    } catch (error) {
      console.error('Error loading task:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateDailyFiles = async (taskData: Task, userId: string) => {
    try {
      const { data: existingFiles } = await supabase
        .from('task_files')
        .select('day_number')
        .eq('task_id', taskId)
        .eq('user_id', userId);

      const existingDays = existingFiles?.map(file => file.day_number) || [];
      const filesToCreate = [];

      // Create files for each day if they don't exist
      for (let day = 1; day <= taskData.duration_days; day++) {
        if (!existingDays.includes(day)) {
          filesToCreate.push({
            task_id: taskId,
            user_id: userId,
            day_number: day,
            title: `Day ${day}`,
            content: '',
            word_count: 0
          });
        }
      }

      if (filesToCreate.length > 0) {
        const { error } = await supabase
          .from('task_files')
          .insert(filesToCreate);

        if (error) {
          console.error('Error creating daily files:', error);
        } else {
          // Reload files after creation
          const { data: updatedFiles } = await supabase
            .from('task_files')
            .select('*')
            .eq('task_id', taskId)
            .eq('user_id', userId)
            .order('day_number', { ascending: true });

          setTaskFiles(updatedFiles || []);
        }
      }
    } catch (error) {
      console.error('Error generating daily files:', error);
    }
  };

  const saveContent = async () => {
    console.log('Save button clicked - debugging info:', {
      user: user?.id,
      task: task?.id,
      taskId,
      activeDay,
      currentContent: currentContent.substring(0, 100) + '...',
      contentLength: currentContent.length
    });
    
    if (!user || !task || activeDay < 1) {
      console.log('Save failed - missing required data:', { user: !!user, task: !!task, activeDay });
      toast({
        title: "Error",
        description: "Missing required data for saving. Please try refreshing the page.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Count words from HTML content (strip HTML tags first)
      const textContent = currentContent.replace(/<[^>]*>/g, '');
      const wordCount = textContent.trim().split(/\s+/).filter(word => word.length > 0).length;

      console.log('Attempting to save to Supabase:', {
        task_id: taskId,
        user_id: user.id,
        day_number: activeDay,
        word_count: wordCount
      });

      const { data, error } = await supabase
        .from('task_files')
        .upsert({
          task_id: taskId,
          user_id: user.id,
          day_number: activeDay,
          title: `Day ${activeDay}`,
          content: currentContent,
          word_count: wordCount
        }, {
          onConflict: 'task_id,day_number'
        })
        .select();

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error details:', error);
        toast({
          title: "Error",
          description: `Failed to save your writing: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log('Save successful:', data);
        toast({
          title: "Saved!",
          description: `Day ${activeDay} content saved successfully.`,
        });

        // Update local state
        setTaskFiles(prev => prev.map(file => 
          file.day_number === activeDay 
            ? { ...file, content: currentContent, word_count: wordCount }
            : file
        ));

        // Force re-render of progress bar by updating task state
        if (task) {
          setTask({ ...task });
        }
      }
    } catch (error) {
      console.error('Unexpected error during save:', error);
      toast({
        title: "Error",
        description: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getCurrentWordCount = () => {
    // Count words from HTML content (strip HTML tags first)
    const textContent = currentContent.replace(/<[^>]*>/g, '');
    return textContent.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getDailyTarget = () => {
    return task ? Math.ceil(task.word_count / task.duration_days) : 0;
  };

  const getTotalWordsWritten = () => {
    return taskFiles.reduce((total, file) => total + (file.word_count || 0), 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Task not found</h2>
          <Button onClick={() => navigate("/user/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/user/dashboard")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{task.task_name}</h1>
              <p className="text-muted-foreground">
                {task.word_count?.toLocaleString()} words in {task.duration_days} days
              </p>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <Card className="gradient-card border-0 shadow-warm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Writing Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{getTotalWordsWritten()}</div>
                <div className="text-sm text-muted-foreground">Words Written</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{task.word_count?.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Target</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-foreground">{getDailyTarget()}</div>
                <div className="text-sm text-muted-foreground">Daily Target</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((getTotalWordsWritten() / task.word_count) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Complete</div>
              </div>
            </div>
            <div className="mt-6">
              <Progress 
                value={Math.min((getTotalWordsWritten() / task.word_count) * 100, 100)} 
                className="h-3"
              />
            </div>
          </CardContent>
        </Card>

        {/* Daily Writing Tabs */}
        <Tabs value={activeDay.toString()} onValueChange={(value) => setActiveDay(parseInt(value))}>
          <Card className="gradient-card border-0 shadow-warm mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Daily Writing Pages
              </CardTitle>
              <CardDescription>
                Write {getDailyTarget()} words per day to meet your goal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TabsList className="grid grid-cols-5 lg:grid-cols-10 gap-2 h-auto p-2">
                {Array.from({ length: task.duration_days }, (_, i) => i + 1).map((day) => {
                  const dayFile = taskFiles.find(file => file.day_number === day);
                  const hasContent = dayFile && dayFile.content.trim().length > 0;
                  const wordsWritten = dayFile?.word_count || 0;
                  const isComplete = wordsWritten >= getDailyTarget();
                  
                  return (
                    <TabsTrigger 
                      key={day} 
                      value={day.toString()}
                      className={`relative ${isComplete ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : hasContent ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : ''}`}
                    >
                      Day {day}
                      {isComplete && (
                        <CheckCircle className="absolute -top-1 -right-1 w-3 h-3 text-green-500" />
                      )}
                      {hasContent && !isComplete && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </CardContent>
          </Card>

          {Array.from({ length: task.duration_days }, (_, i) => i + 1).map((day) => (
            <TabsContent key={day} value={day.toString()} className="space-y-6">
              <RichTextEditor
                content={currentContent}
                onChange={setCurrentContent}
                onSave={saveContent}
                isSaving={isSaving}
                placeholder={`Start writing for Day ${day} of "${task.task_name}"...`}
                wordCount={getCurrentWordCount()}
                targetWords={getDailyTarget()}
                title={`Day ${day} - ${task.task_name}`}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default DailyTextEditor;