import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, CheckCircle2, XCircle, Clock, Trophy, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DailyProgress {
  id: string;
  date: string;
  goal_words: number;
  words_written: number;
  status: string;
  refund_earned_mmk: number;
}

interface RefundTrackerProps {
  taskId: string;
  depositAmount: number;
  totalDays: number;
}

export const RefundTracker = ({ taskId, depositAmount, totalDays }: RefundTrackerProps) => {
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchDailyProgress();
  }, [taskId]);

  const fetchDailyProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('task_id', taskId)
        .order('date', { ascending: true });

      if (error) throw error;

      setDailyProgress(data || []);
      calculateStreak(data || []);
    } catch (error) {
      console.error('Error fetching daily progress:', error);
      toast({
        title: "Error",
        description: "Failed to load progress data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStreak = (progress: DailyProgress[]) => {
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    
    for (let i = progress.length - 1; i >= 0; i--) {
      if (progress[i].date > today) continue;
      if (progress[i].status === 'completed') {
        currentStreak++;
      } else {
        break;
      }
    }
    setStreak(currentStreak);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'skipped':
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-success text-success-foreground">Completed</Badge>;
      case 'skipped':
        return <Badge variant="destructive">Skipped</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const completedDays = dailyProgress.filter(day => day.status === 'completed').length;
  const totalRefundEarned = dailyProgress.reduce((sum, day) => sum + day.refund_earned_mmk, 0);
  const completionPercentage = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
  const expectedRefund = Math.floor((completedDays / totalDays) * depositAmount);

  if (isLoading) {
    return (
      <Card className="gradient-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Completion Rate</p>
                <p className="text-2xl font-bold text-primary">{completionPercentage.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{completedDays} of {totalDays} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-accent" />
              <div>
                <p className="text-sm font-medium">Current Streak</p>
                <p className="text-2xl font-bold text-accent">{streak} days</p>
                <p className="text-xs text-muted-foreground">
                  {streak > 0 ? "Keep it up!" : "Start your streak today!"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CalendarDays className="w-5 h-5 text-success" />
              <div>
                <p className="text-sm font-medium">Refund Earned</p>
                <p className="text-2xl font-bold text-success">{expectedRefund.toLocaleString()} MMK</p>
                <p className="text-xs text-muted-foreground">of {depositAmount.toLocaleString()} MMK</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <Card className="gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5" />
            <span>Progress Overview</span>
          </CardTitle>
          <CardDescription>Track your daily writing progress and refund earnings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{completionPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>

          {streak > 2 && (
            <div className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-lg p-4 border border-accent/20">
              <p className="text-sm font-medium text-accent">🔥 {streak} days in a row!</p>
              <p className="text-xs text-muted-foreground">You're on fire! Keep the momentum going.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Timeline */}
      <Card className="gradient-card">
        <CardHeader>
          <CardTitle>Daily Timeline</CardTitle>
          <CardDescription>Your writing journey day by day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dailyProgress.map((day, index) => (
              <div
                key={day.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(day.status)}
                  <div>
                    <p className="font-medium">Day {index + 1}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(day.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {day.words_written} / {day.goal_words} words
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Goal: {day.goal_words} words
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-success">
                      {day.refund_earned_mmk.toLocaleString()} MMK
                    </p>
                    <p className="text-xs text-muted-foreground">Earned</p>
                  </div>
                  {getStatusBadge(day.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};