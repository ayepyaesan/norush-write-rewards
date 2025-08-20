import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefundTracker } from "@/components/RefundTracker";
import DailyMilestoneCounter from "@/components/DailyMilestoneCounter";
import AccessGate from "@/components/AccessGate";
import { ArrowLeft, Save, FileText, Target, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Task {
  id: string;
  task_name: string;
  word_count: number;
  duration_days: number;
  deposit_amount: number;
  deadline: string;
  status: string;
  created_at: string;
}

interface DailyProgress {
  id: string;
  date: string;
  goal_words: number;
  words_written: number;
  status: string;
}

const TaskWorkspace = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [todayProgress, setTodayProgress] = useState<DailyProgress | null>(null);
  const [writingText, setWritingText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user && taskId) {
      fetchTask();
      fetchTodayProgress();
    }
  }, [user, taskId]);

  useEffect(() => {
    // Count words in real-time
    const words = writingText.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [writingText]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/workspace");
      return;
    }

    setUser(user);
  };

  const fetchTask = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) throw error;
      setTask(data);
    } catch (error) {
      console.error('Error fetching task:', error);
      toast({
        title: "Error",
        description: "Failed to load task details.",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTodayProgress = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('task_id', taskId)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setTodayProgress(data);
    } catch (error) {
      console.error('Error fetching today\'s progress:', error);
    }
  };

  const handleSaveProgress = async () => {
    if (!todayProgress || !task) return;

    setIsSaving(true);
    try {
      const isCompleted = wordCount >= todayProgress.goal_words;
      const refundEarned = isCompleted ? Math.floor(task.deposit_amount / task.duration_days) : 0;

      const { error } = await supabase
        .from('daily_progress')
        .update({
          words_written: wordCount,
          status: isCompleted ? 'completed' : 'pending',
          refund_earned_mmk: refundEarned
        })
        .eq('id', todayProgress.id);

      if (error) throw error;

      toast({
        title: "Progress Saved!",
        description: isCompleted 
          ? `Great job! You've earned ${refundEarned.toLocaleString()} MMK today.`
          : "Your progress has been saved. Keep writing to reach your daily goal!",
      });

      // Refresh today's progress
      fetchTodayProgress();
    } catch (error) {
      console.error('Error saving progress:', error);
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
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

  const daysRemaining = Math.ceil((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const progressPercentage = todayProgress ? (wordCount / todayProgress.goal_words) * 100 : 0;

  return (
    <AccessGate taskId={taskId!}>
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
          
          <Badge variant={daysRemaining > 0 ? "default" : "destructive"}>
            {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Deadline passed"}
          </Badge>
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
                    {todayProgress ? todayProgress.goal_words.toLocaleString() : "N/A"} words
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="write" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="write">Write Today</TabsTrigger>
            <TabsTrigger value="progress">Progress Tracker</TabsTrigger>
          </TabsList>

          <TabsContent value="write" className="space-y-6">
            {/* Today's Progress */}
            {todayProgress && (
              <Card className="gradient-card">
                <CardHeader>
                  <CardTitle>Today's Progress</CardTitle>
                  <CardDescription>
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Words Written</span>
                    <span className="text-lg font-bold text-primary">
                      {wordCount} / {todayProgress.goal_words}
                    </span>
                  </div>
                  <Progress value={Math.min(progressPercentage, 100)} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progressPercentage.toFixed(1)}% complete</span>
                    <span>
                      {progressPercentage >= 100 
                        ? "🎉 Goal achieved!" 
                        : `${todayProgress.goal_words - wordCount} words to go`
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Writing Area - Full Width */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Your Writing Space</span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/editor/${taskId}`)}
                      className="hover-lift"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Rich Text Editor
                    </Button>
                    <Button
                      onClick={handleSaveProgress}
                      disabled={isSaving || !todayProgress}
                      className="gradient-warm hover-lift"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Progress"}
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  Write your content here. Your progress will be automatically tracked. Use the Rich Text Editor for Microsoft Word-like formatting.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Start writing your content here..."
                  value={writingText}
                  onChange={(e) => setWritingText(e.target.value)}
                  className="min-h-[600px] resize-none border-0 bg-background/30 focus:bg-background/50 transition-all duration-300"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress">
            <RefundTracker
              taskId={task.id}
              depositAmount={task.deposit_amount}
              totalDays={task.duration_days}
            />
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </AccessGate>
  );
};

export default TaskWorkspace;