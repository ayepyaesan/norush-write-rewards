import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Save, FileText, Calendar, Target, 
  CheckCircle, AlertCircle, Clock, DollarSign,
  Edit3, Eye, ChevronLeft, ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Task {
  id: string;
  task_name: string;
  word_count: number;
  duration_days: number;
  deposit_amount: number;
  status: string;
  created_at: string;
  deadline: string | null;
}

interface TaskFile {
  id: string;
  task_id: string;
  day_number: number;
  title: string;
  content: string;
  word_count: number;
  updated_at: string;
}

interface DailyMilestone {
  id: string;
  task_id: string;
  day_number: number;
  target_date: string;
  required_words: number;
  words_written: number;
  status: string;
  refund_amount: number;
  refund_status: string;
  content_validated: boolean;
  words_carried_forward: number;
}

const TaskEditor = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [taskFiles, setTaskFiles] = useState<TaskFile[]>([]);
  const [dailyMilestones, setDailyMilestones] = useState<DailyMilestone[]>([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [currentContent, setCurrentContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("write");

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user && taskId) {
      fetchTaskData();
    }
  }, [user, taskId]);

  useEffect(() => {
    // Load content for current day
    const dayFile = taskFiles.find(file => file.day_number === currentDay);
    setCurrentContent(dayFile?.content || "");
  }, [currentDay, taskFiles]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/workspace");
      return;
    }

    setUser(user);
  };

  const fetchTaskData = async () => {
    try {
      // Fetch task details
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', user?.id)
        .single();

      if (taskError) throw taskError;
      setTask(taskData);

      // Fetch task files
      const { data: filesData, error: filesError } = await supabase
        .from('task_files')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', user?.id)
        .order('day_number');

      if (filesError && filesError.code !== 'PGRST116') throw filesError;
      setTaskFiles(filesData || []);

      // Fetch daily milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('daily_milestones')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', user?.id)
        .order('day_number');

      if (milestonesError && milestonesError.code !== 'PGRST116') throw milestonesError;
      setDailyMilestones(milestonesData || []);

      // If no milestones exist, generate them
      if (!milestonesData || milestonesData.length === 0) {
        await generateMilestones(taskData);
      }

      // Initialize task files for each day if they don't exist
      if (!filesData || filesData.length === 0) {
        await initializeTaskFiles(taskData);
      }

    } catch (error) {
      console.error('Error fetching task data:', error);
      toast({
        title: "Error",
        description: "Failed to load task data.",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const generateMilestones = async (taskData: Task) => {
    try {
      await supabase.rpc('generate_daily_milestones', {
        p_task_id: taskData.id,
        p_user_id: user?.id,
        p_word_count: taskData.word_count,
        p_duration_days: taskData.duration_days
      });
      
      // Refresh milestones
      const { data: milestonesData } = await supabase
        .from('daily_milestones')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', user?.id)
        .order('day_number');
      
      setDailyMilestones(milestonesData || []);
    } catch (error) {
      console.error('Error generating milestones:', error);
    }
  };

  const initializeTaskFiles = async (taskData: Task) => {
    try {
      const filesToCreate = [];
      
      // Create main editor file (day 0)
      filesToCreate.push({
        task_id: taskData.id,
        user_id: user?.id,
        day_number: 0,
        title: "Main Editor",
        content: ""
      });
      
      // Create daily editor files
      for (let i = 1; i <= taskData.duration_days; i++) {
        filesToCreate.push({
          task_id: taskData.id,
          user_id: user?.id,
          day_number: i,
          title: `Day ${i}`,
          content: ""
        });
      }
      
      const { data } = await supabase
        .from('task_files')
        .insert(filesToCreate)
        .select();
      
      setTaskFiles(data || []);
    } catch (error) {
      console.error('Error initializing task files:', error);
    }
  };

  const handleSaveContent = async () => {
    if (!task || !user) return;

    setIsSaving(true);
    try {
      // Disable paste functionality by removing pasted content
      const cleanContent = currentContent.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width characters
      
      // Count words (excluding empty strings)
      const wordCount = cleanContent.trim().split(/\s+/).filter(word => word.length > 0).length;
      
      // Update task file
      const { error: fileError } = await supabase
        .from('task_files')
        .upsert({
          task_id: task.id,
          user_id: user.id,
          day_number: currentDay,
          title: `Day ${currentDay}`,
          content: cleanContent,
        });

      if (fileError) throw fileError;

      // Update daily milestone
      const milestone = dailyMilestones.find(m => m.day_number === currentDay);
      if (milestone) {
        const isCompleted = wordCount >= milestone.required_words;
        
        const { error: milestoneError } = await supabase
          .from('daily_milestones')
          .update({
            words_written: wordCount,
            status: isCompleted ? 'completed' : 'pending',
            refund_status: isCompleted ? 'eligible' : 'pending'
          })
          .eq('id', milestone.id);

        if (milestoneError) throw milestoneError;
      }

      toast({
        title: "Saved!",
        description: `Day ${currentDay} content saved successfully.`,
      });

      // Refresh data
      fetchTaskData();

    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: "Error",
        description: "Failed to save content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast({
      title: "Paste Disabled",
      description: "Pasting is not allowed. Please type your content.",
      variant: "destructive",
    });
  };

  const getTodayMilestone = () => {
    const today = new Date().toISOString().split('T')[0];
    return dailyMilestones.find(milestone => milestone.target_date === today);
  };

  const getCurrentDayMilestone = () => {
    return dailyMilestones.find(milestone => milestone.day_number === currentDay);
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
      <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">Task not found</p>
            <Button onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const todayMilestone = getTodayMilestone();
  const currentMilestone = getCurrentDayMilestone();
  const mainFile = taskFiles.find(file => file.day_number === 0);
  const currentWordCount = currentContent.trim().split(/\s+/).filter(word => word.length > 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="hover-lift"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center gap-2">
            {todayMilestone && (
              <Badge variant={todayMilestone.status === 'completed' ? "default" : "secondary"}>
                Today: {todayMilestone.words_written} / {todayMilestone.required_words} words
              </Badge>
            )}
          </div>
        </div>

        {/* Task Overview */}
        <Card className="gradient-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>{task.task_name}</span>
            </CardTitle>
            <CardDescription>
              Created on {new Date(task.created_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Total Words</p>
                  <p className="text-lg font-bold">{task.word_count.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-sm font-medium">Duration</p>
                  <p className="text-lg font-bold">{task.duration_days} days</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-success" />
                <div>
                  <p className="text-sm font-medium">Deposit</p>
                  <p className="text-lg font-bold">{task.deposit_amount.toLocaleString()} MMK</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Daily Goal</p>
                  <p className="text-lg font-bold">
                    {Math.ceil(task.word_count / task.duration_days)} words
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="write">Daily Editors</TabsTrigger>
            <TabsTrigger value="main">Main Editor</TabsTrigger>
            <TabsTrigger value="progress">Progress Track</TabsTrigger>
          </TabsList>

          {/* Daily Editors Tab */}
          <TabsContent value="write" className="space-y-6">
            {/* Day Navigation */}
            <Card className="gradient-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Day {currentDay} Editor</CardTitle>
                    <CardDescription>
                      {currentMilestone ? `Target: ${currentMilestone.required_words} words` : 'No target set'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentDay(Math.max(1, currentDay - 1))}
                      disabled={currentDay <= 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium px-3">
                      Day {currentDay} of {task.duration_days}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentDay(Math.min(task.duration_days, currentDay + 1))}
                      disabled={currentDay >= task.duration_days}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress for current day */}
                {currentMilestone && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{currentWordCount} / {currentMilestone.required_words} words</span>
                    </div>
                    <Progress 
                      value={Math.min((currentWordCount / currentMilestone.required_words) * 100, 100)} 
                      className="h-2" 
                    />
                  </div>
                )}

                {/* Writing Area */}
                <div className="space-y-2">
                  <Label htmlFor="content">Write your content for Day {currentDay}</Label>
                  <textarea
                    id="content"
                    value={currentContent}
                    onChange={(e) => setCurrentContent(e.target.value)}
                    onPaste={handlePaste}
                    placeholder={`Start writing for Day ${currentDay}...`}
                    className="w-full h-96 p-4 border rounded-md bg-background/50 focus:bg-background transition-all duration-300 resize-none"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Word count: {currentWordCount}
                    </span>
                    <Button
                      onClick={handleSaveContent}
                      disabled={isSaving}
                      className="gradient-warm hover-lift"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Progress"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Main Editor Tab */}
          <TabsContent value="main" className="space-y-6">
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Main Editor (Read-Only)
                </CardTitle>
                <CardDescription>
                  All your daily content is automatically synced here
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-background/30 border rounded-md p-4 min-h-96">
                  {mainFile?.content ? (
                    <div className="whitespace-pre-wrap">{mainFile.content}</div>
                  ) : (
                    <div className="text-muted-foreground text-center py-8">
                      <FileText className="w-12 h-12 mx-auto mb-4" />
                      <p>Start writing in the daily editors to see content here</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  Total words: {mainFile?.word_count || 0} / {task.word_count}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Track Tab */}
          <TabsContent value="progress" className="space-y-6">
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle>Daily Progress Overview</CardTitle>
                <CardDescription>Track your progress and refund eligibility</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dailyMilestones.map((milestone) => (
                    <div key={milestone.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">Day {milestone.day_number}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(milestone.target_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={milestone.status === 'completed' ? "default" : "secondary"}>
                            {milestone.status === 'completed' ? 'Completed' : 'Pending'}
                          </Badge>
                          {milestone.status === 'completed' && (
                            <Badge variant="outline" className="text-success">
                              {milestone.refund_amount.toLocaleString()} MMK
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{milestone.words_written} / {milestone.required_words} words</span>
                        </div>
                        <Progress 
                          value={Math.min((milestone.words_written / milestone.required_words) * 100, 100)} 
                          className="h-2" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TaskEditor;