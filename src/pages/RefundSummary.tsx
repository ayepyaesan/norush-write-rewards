import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, ArrowLeft, Download, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  task_name: string;
  word_count: number;
  deposit_amount: number;
  duration_days: number;
  status: string;
}

interface DailyProgress {
  id: string;
  date: string;
  goal_words: number;
  words_written: number;
  status: string;
  refund_earned_mmk: number;
}

const RefundSummary = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (taskId) {
      fetchTaskAndProgress();
    }
  }, [taskId]);

  const fetchTaskAndProgress = async () => {
    try {
      // Fetch task details
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      // Fetch daily progress
      const { data: progressData, error: progressError } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('task_id', taskId)
        .order('date', { ascending: true });

      if (progressError) throw progressError;

      setTask(taskData);
      setDailyProgress(progressData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load task data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefundRequest = async () => {
    if (!task) return;

    try {
      const completedDays = dailyProgress.filter(day => day.status === 'completed').length;
      const refundAmount = Math.floor((completedDays / task.duration_days) * task.deposit_amount);

      const { error } = await supabase
        .from('refunds')
        .insert({
          task_id: task.id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          refund_amount_mmk: refundAmount,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Refund Requested",
        description: "Your refund request has been submitted for processing.",
      });
    } catch (error) {
      console.error('Error requesting refund:', error);
      toast({
        title: "Error",
        description: "Failed to request refund.",
        variant: "destructive",
      });
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
      <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 flex items-center justify-center">
        <Card className="gradient-card">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Task not found</p>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedDays = dailyProgress.filter(day => day.status === 'completed').length;
  const skippedDays = dailyProgress.filter(day => day.status === 'skipped').length;
  const finalRefund = Math.floor((completedDays / task.duration_days) * task.deposit_amount);
  const completionRate = (completedDays / task.duration_days) * 100;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'skipped':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRefundStatus = () => {
    if (completionRate === 100) return "full";
    if (completionRate > 0) return "partial";
    return "none";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Button>
          <h1 className="text-2xl font-bold">Refund Summary</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="gradient-card">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Deposit</p>
              <p className="text-2xl font-bold text-primary">{task.deposit_amount.toLocaleString()} MMK</p>
            </CardContent>
          </Card>
          <Card className="gradient-card">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Completed Days</p>
              <p className="text-2xl font-bold text-success">{completedDays}/{task.duration_days}</p>
            </CardContent>
          </Card>
          <Card className="gradient-card">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Final Refund</p>
              <p className="text-2xl font-bold text-accent">{finalRefund.toLocaleString()} MMK</p>
            </CardContent>
          </Card>
          <Card className="gradient-card">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={getRefundStatus() === "full" ? "default" : getRefundStatus() === "partial" ? "secondary" : "destructive"}>
                {getRefundStatus() === "full" ? "Full Refund" : getRefundStatus() === "partial" ? "Partial Refund" : "No Refund"}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Progress Chart */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle>Task Progress Overview</CardTitle>
            <CardDescription>{task.task_name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completion Rate</span>
                <span>{completionRate.toFixed(1)}%</span>
              </div>
              <Progress value={completionRate} className="h-3" />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-success">{completedDays}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{skippedDays}</p>
                <p className="text-sm text-muted-foreground">Skipped</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-muted-foreground">{task.duration_days - completedDays - skippedDays}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Breakdown */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle>Daily Breakdown</CardTitle>
            <CardDescription>Detailed view of your daily writing progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dailyProgress.map((day, index) => (
                <div
                  key={day.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background/50"
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(day.status)}
                    <div>
                      <p className="font-medium">Day {index + 1}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(day.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {day.refund_earned_mmk.toLocaleString()} MMK
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {day.words_written}/{day.goal_words} words
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <Button 
            onClick={handleRefundRequest}
            className="gradient-warm hover-lift"
            size="lg"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Request Refund
          </Button>
          <Button 
            variant="outline"
            size="lg"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RefundSummary;