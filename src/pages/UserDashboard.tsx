import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  LogOut, FileText, Plus,
  DollarSign, Target, TrendingUp, CheckCircle,
  AlertCircle, Edit3, Lock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import RefundRequestTracker from "@/components/RefundRequestTracker";
import RefundHistory from "@/components/RefundHistory";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  kpay_name: string | null;
  kpay_phone: string | null;
  total_refund_earned: number;
}

interface Task {
  id: string;
  task_name: string;
  word_count: number;
  duration_days: number;
  deposit_amount: number;
  status: string;
  created_at: string;
  deadline: string | null;
  base_rate_per_word: number;
  payments?: Payment[];
  daily_milestones?: DailyMilestone[];
  task_files?: TaskFile[];
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
  words_carried_forward: number;
  status: string;
  refund_amount: number;
  refund_status: string;
}

interface Payment {
  id: string;
  task_id: string;
  user_id: string;
  amount: number;
  payment_status: string;
  screenshot_url: string | null;
  payment_code: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

const UserDashboard = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState("tasks");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  // Set up real-time subscriptions for payment and profile updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user-dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Payment update received:', payload);
          
          // If payment status changed to verified, show toast and refresh tasks
          if (payload.new.payment_status === 'verified' && payload.old.payment_status !== 'verified') {
            toast({
              title: "Payment Approved! 🎉",
              description: "Your payment has been verified. You can now start writing!",
              duration: 5000,
            });
            
            // Refresh tasks to update UI
            fetchTasks(user.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Profile update received:', payload);
          
          // Update profile state with new total_refund_earned
          if (payload.new.total_refund_earned !== payload.old.total_refund_earned) {
            setProfile(prev => prev ? { ...prev, total_refund_earned: payload.new.total_refund_earned } : null);
            toast({
              title: "Refund Received! 💰",
              description: `Your refund has been processed. Total earned: ${payload.new.total_refund_earned.toLocaleString()} MMK`,
              duration: 5000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'refund_requests',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refresh tasks when refund requests change
          fetchTasks(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, toast]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/workspace");
      return;
    }

    setUser(user);
    
    // Fetch user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
      return;
    }

    // Check if user role is 'user' (not admin)
    if (profile?.role !== 'user') {
      navigate("/admin/dashboard");
      return;
    }

    setProfile(profile);
    await fetchTasks(user.id);
  };

  const fetchTasks = async (userId: string) => {
    try {
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select(`
          *,
          payments (*),
          daily_milestones (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load tasks.",
          variant: "destructive",
        });
      } else {
        // Fetch task_files separately to avoid query issues
        const tasksWithFiles = await Promise.all((tasksData || []).map(async (task) => {
          const { data: taskFiles } = await supabase
            .from('task_files')
            .select('*')
            .eq('task_id', task.id);
          
          return {
            ...task,
            task_files: taskFiles || []
          };
        }));
        
        setTasks(tasksWithFiles);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getTaskStatusText = (task: Task) => {
    const payment = task.payments?.[0];
    if (!payment) return "Payment Required";
    if (payment.payment_status === 'verified') return "Active";
    if (payment.screenshot_url && payment.payment_status === 'pending') return "Verification Pending";
    if (payment.payment_status === 'pending' && !payment.screenshot_url) return "Upload Payment Proof";
    return "Payment Required";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const completedTasks = tasks.filter(task => task.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome back, {profile.full_name}!</h1>
            <p className="text-muted-foreground">Manage your writing tasks with deposit commitment system</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Total Refund Earned Card */}
            <Card className="gradient-card border-0 shadow-warm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/10 rounded-lg">
                    <DollarSign className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Refund Earned</div>
                    <div className="text-xl font-bold text-success">
                      {(profile.total_refund_earned || 0).toLocaleString()} MMK
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button onClick={handleSignOut} variant="outline" className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tasks">My Tasks</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="refunds">Refund History</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Tasks Tab - Main Task File Boxes */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">My Writing Tasks</h2>
                <p className="text-muted-foreground">Manage your daily writing commitments</p>
              </div>
              <Button 
                onClick={() => navigate("/task-creation")}
                className="gradient-warm hover-lift flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create New Task
              </Button>
            </div>

            <div className="grid gap-6">
              {tasks.map((task) => {
                const payment = task.payments?.[0];
                const isVerified = payment?.payment_status === 'verified';
                const dailyTarget = Math.ceil(task.word_count / task.duration_days);
                const totalRefundEarned = task.daily_milestones?.reduce((sum, milestone) => 
                  sum + (milestone.refund_status === 'approved' ? milestone.refund_amount : 0), 0) || 0;
                
                return (
                  <Card key={task.id} className="gradient-card border-0 shadow-warm hover-lift">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-xl">{task.task_name}</CardTitle>
                            <Badge variant={isVerified ? "default" : "secondary"}>
                              {getTaskStatusText(task)}
                            </Badge>
                          </div>
                          <CardDescription>
                            Created {new Date(task.created_at).toLocaleDateString()} • 
                            {task.duration_days} day challenge
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {isVerified ? (
                            <Button 
                              onClick={() => navigate(`/task-editor/${task.id}`)}
                              className="gradient-warm hover-lift"
                            >
                              <Edit3 className="w-4 h-4 mr-2" />
                              Open Task Editor
                            </Button>
                          ) : (
                            <Button 
                              onClick={() => navigate(`/payment/${task.id}`)}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              <DollarSign className="w-4 h-4" />
                              {payment?.screenshot_url ? 'Check Payment' : 'Make Payment'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Task Overview Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary">{task.word_count.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">Total Words</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-accent">{task.duration_days}</div>
                          <div className="text-xs text-muted-foreground">Days</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-success">{task.deposit_amount.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">Deposit (MMK)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary">{dailyTarget}</div>
                          <div className="text-xs text-muted-foreground">Words/Day</div>
                        </div>
                      </div>

                      {/* Task Structure Overview */}
                      {isVerified ? (
                        <div className="bg-muted/30 rounded-lg p-4">
                          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Task Structure
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <Lock className="w-3 h-3 text-muted-foreground" />
                                Main Editor (Read-only)
                              </span>
                              <span className="text-muted-foreground">Synced from daily pages</span>
                            </div>
                            <div className="grid grid-cols-5 md:grid-cols-10 gap-1 mt-2">
                              {Array.from({ length: task.duration_days }, (_, i) => i + 1).map((day) => {
                                const milestone = task.daily_milestones?.find(m => m.day_number === day);
                                const isCompleted = milestone?.status === 'completed';
                                const isToday = milestone?.target_date === new Date().toISOString().split('T')[0];
                                
                                return (
                                  <div 
                                    key={day} 
                                    className={`h-8 rounded text-xs flex items-center justify-center font-medium ${
                                      isCompleted ? 'bg-success text-success-foreground' :
                                      isToday ? 'bg-primary text-primary-foreground ring-2 ring-primary-glow' :
                                      'bg-muted text-muted-foreground'
                                    }`}
                                  >
                                    {day}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                              💡 Each box represents a daily writing page. Green = completed, Blue = today
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                            <div>
                              <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200">
                                💰 Deposit Required: {task.deposit_amount.toLocaleString()} MMK
                              </h4>
                              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                {payment?.screenshot_url 
                                  ? "Your payment is being verified. You'll receive access once approved by admin."
                                  : `Pay ${task.deposit_amount.toLocaleString()} MMK deposit (${task.word_count} words × 10 MMK per word) to unlock your task editor and start writing.`
                                }
                              </p>
                              <div className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                                ℹ️ Refund Formula: Complete daily targets to earn back {Math.floor(task.deposit_amount / task.duration_days)} MMK per day
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              
              {tasks.length === 0 && (
                <Card className="gradient-card border-0 shadow-warm">
                  <CardContent className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Writing Tasks Yet</h3>
                    <p className="text-muted-foreground mb-6">Create your first writing commitment with deposit to get started</p>
                    <Button 
                      onClick={() => navigate("/task-creation")}
                      className="gradient-warm hover-lift"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Task
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>


          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Payment & Refund History</h2>
              <p className="text-muted-foreground">Track your deposits and refund earnings</p>
            </div>

            <div className="grid gap-4">
              {tasks.map((task) => {
                const payment = task.payments?.[0];
                if (!payment) return null;
                
                return (
                  <Card key={task.id} className="gradient-card border-0 shadow-warm">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{task.task_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Paid on {new Date(payment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={payment.payment_status === 'verified' ? "default" : "secondary"}>
                          {payment.payment_status === 'verified' ? 'Verified' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="text-lg font-bold text-primary mb-2">
                        Deposit: {payment.amount.toLocaleString()} MMK
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {tasks.every(task => !task.payments?.[0]) && (
                <Card className="gradient-card border-0 shadow-warm">
                  <CardContent className="text-center py-12">
                    <DollarSign className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Payment History</h3>
                    <p className="text-muted-foreground">Create a task and make your first deposit to see payment history</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Refund History Tab */}
          <TabsContent value="refunds" className="space-y-6">
            {user && <RefundHistory userId={user.id} />}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Writing Reports</h2>
              <p className="text-muted-foreground">Analyze your writing performance and refund history</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="gradient-card border-0 shadow-warm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Words Written</CardTitle>
                  <Target className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {tasks.reduce((total, task) => 
                      total + (task.task_files?.reduce((sum, file) => sum + (file.word_count || 0), 0) || 0), 0
                    ).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Across all tasks</p>
                </CardContent>
              </Card>

               <Card className="gradient-card border-0 shadow-warm">
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                   <CardTitle className="text-sm font-medium">Total Refunds Earned</CardTitle>
                   <DollarSign className="h-4 w-4 text-success" />
                 </CardHeader>
                 <CardContent>
                   <div className="text-2xl font-bold">
                     {(profile.total_refund_earned || 0).toLocaleString()} MMK
                   </div>
                   <p className="text-xs text-muted-foreground">Successfully earned back</p>
                 </CardContent>
               </Card>

            </div>

            <Card className="gradient-card border-0 shadow-warm">
              <CardHeader>
                <CardTitle>Daily Milestone Summary</CardTitle>
                <CardDescription>Overview of your daily writing achievements</CardDescription>
              </CardHeader>
              <CardContent>
                {tasks.length > 0 ? (
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <div key={task.id} className="border-l-4 border-primary pl-4">
                        <h4 className="font-medium">{task.task_name}</h4>
                        <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Completed Days: </span>
                            <span className="font-medium text-success">
                              {task.daily_milestones?.filter(m => m.status === 'completed').length || 0}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Pending Days: </span>
                            <span className="font-medium text-orange-600">
                              {task.daily_milestones?.filter(m => m.status === 'pending').length || 0}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Missed Days: </span>
                            <span className="font-medium text-destructive">
                              {task.daily_milestones?.filter(m => m.status === 'missed').length || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No data available. Create tasks to see reports.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserDashboard;