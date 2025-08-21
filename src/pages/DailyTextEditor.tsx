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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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

  const handleSubmit = async () => {
    console.log('Submit button clicked - debugging info:', {
      user: user?.id,
      task: task?.id,
      taskId,
      activeDay,
      currentContent: currentContent.substring(0, 100) + '...',
      contentLength: currentContent.length,
      taskFiles: taskFiles.map(f => ({ day: f.day_number, id: f.id }))
    });

    if (!user || !task || activeDay < 1 || !currentContent.trim()) {
      console.log('Submit failed - validation:', { 
        hasUser: !!user, 
        hasTask: !!task, 
        activeDay, 
        hasContent: !!currentContent.trim() 
      });
      toast({
        title: "Error",
        description: "Please write some content before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setValidationErrors([]);

    try {
      // Get the current day file title
      const activeFile = taskFiles.find(file => file.day_number === activeDay);
      const title = activeFile?.title || `Day ${activeDay}`;

      // Strip HTML and count words
      const textContent = currentContent.replace(/<[^>]*>/g, '');
      const wordCount = textContent.trim().split(/\s+/).filter(word => word.length > 0).length;
      const targetWords = getDailyTarget();

      console.log('Preparing validation call:', { 
        title, 
        wordCount, 
        targetWords, 
        activeFileId: activeFile?.id,
        textContentLength: textContent.length
      });

      // Get or create milestone for this day
      let milestoneId = null;
      const { data: existingMilestones } = await supabase
        .from('daily_milestones')
        .select('id')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .eq('day_number', activeDay)
        .single();

      if (existingMilestones) {
        milestoneId = existingMilestones.id;
      }

      console.log('Using milestone ID:', milestoneId);

      // Call validation edge function
      console.log('Calling ai-content-evaluator edge function...');
      const { data: validationResult, error } = await supabase.functions.invoke('ai-content-evaluator', {
        body: {
          content: textContent,
          title,
          userId: user.id,
          taskId,
          milestoneId,
          targetWords,
          action: 'validate'
        }
      });

      console.log('Edge function response:', { validationResult, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Validation service error: ${error.message || 'Unknown error'}`);
      }

      if (!validationResult) {
        throw new Error('No response from validation service');
      }

      console.log('Validation result:', validationResult);

      if (!validationResult.isValid) {
        // Show validation errors
        const errorMessages = validationResult.errors || ['Validation failed'];
        setValidationErrors(errorMessages);
        console.log('Validation failed with errors:', errorMessages);
        toast({
          title: "Submission Failed",
          description: "Your text does not meet submission criteria. Please revise and try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('Validation passed, proceeding with submission...');

      // If validation passes, save the content first
      await saveContent();

      // Then create refund request
      console.log('Creating refund request...');
      const refundAmount = Math.floor(task.deposit_amount / task.duration_days);
      const { data: refundData, error: refundError } = await supabase
        .from('refund_requests')
        .insert({
          user_id: user.id,
          task_id: taskId,
          milestone_id: milestoneId,
          amount: refundAmount,
          status: 'awaiting_review'
        })
        .select();

      console.log('Refund request result:', { refundData, refundError });

      if (refundError) {
        console.error('Error creating refund request:', refundError);
        toast({
          title: "Error", 
          description: "Failed to submit refund request. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Success
      console.log('Submit successful!');
      toast({
        title: "Submission Successful! ✅",
        description: "Your refund request has been sent for review.",
        variant: "default",
        duration: 5000,
      });

      setValidationErrors([]);

    } catch (error) {
      console.error('Submit error details:', error);
      toast({
        title: "Submit Error",
        description: `Failed to submit content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
              {/* Validation Errors Display */}
              {validationErrors.length > 0 && (
                <div className="bg-destructive/10 border-l-4 border-destructive rounded-lg p-6 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-destructive-foreground text-sm font-bold">!</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-destructive font-semibold text-lg mb-3">
                        Your text does not meet submission criteria. Please revise and try again.
                      </h4>
                      <ul className="space-y-2">
                        {validationErrors.map((error, index) => (
                          <li key={index} className="text-destructive flex items-start gap-2">
                            <span className="text-destructive mt-1.5 w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0"></span>
                            <span className="text-sm leading-relaxed">{error}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 p-3 bg-muted/30 rounded border-l-2 border-muted-foreground/30">
                        <p className="text-sm text-muted-foreground">
                          <strong>Note:</strong> Only validated content that meets all criteria will be sent to the Admin Panel for refund review.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <RichTextEditor
                content={currentContent}
                onChange={setCurrentContent}
                onSave={saveContent}
                onSubmit={handleSubmit}
                isSaving={isSaving}
                isSubmitting={isSubmitting}
                placeholder={`Start writing for Day ${day} of "${task.task_name}"...`}
                wordCount={getCurrentWordCount()}
                targetWords={getDailyTarget()}
                title={`Day ${day} - ${task.task_name}`}
                showSubmitButton={true}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default DailyTextEditor;