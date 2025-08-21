import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  User, LogOut, FileText, Plus, History, Calendar, 
  DollarSign, Target, Clock, TrendingUp, CheckCircle,
  AlertCircle, PlayCircle, Edit3
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  kpay_name: string | null;
  kpay_phone: string | null;
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
  deposits?: Deposit[];
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
  status: string;
  refund_amount: number;
  refund_status: string;
}

interface Deposit {
  id: string;
  task_id: string;
  amount: number;
  payment_status: string;
  screenshot_url: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

const UserDashboard = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

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
          deposits (*),
          daily_milestones (*),
          task_files (*)
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
        setTasks(tasksData || []);
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

  const getTaskStatusColor = (task: Task) => {
    switch (task.status) {
      case 'completed': return "text-green-600";
      case 'in_progress': return "text-blue-600";
      case 'pending': return "text-yellow-600";
      default: return "text-gray-600";
    }
  };

  const getTaskStatusText = (task: Task) => {
    switch (task.status) {
      case 'completed': return "Completed";
      case 'in_progress': return "In Progress";
      case 'pending': return "Pending Payment";
      default: return "Unknown";
    }
  };

  const getTodayProgress = (taskWithMilestones: any) => {
    const today = new Date().toISOString().split('T')[0];
    return taskWithMilestones.daily_milestones?.find(
      (milestone: DailyMilestone) => milestone.target_date === today
    );
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
  const activeTasks = tasks.filter(task => task.status === 'in_progress').length;
  const totalWordCount = tasks.reduce((sum, task) => sum + task.word_count, 0);
  const totalDeposits = tasks.reduce((sum, task) => sum + task.deposit_amount, 0);

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
            <p className="text-muted-foreground">Track your writing journey and manage your tasks</p>
          </div>
          <Button onClick={handleSignOut} variant="outline" className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">My Tasks</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="gradient-card border-0 shadow-warm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <FileText className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tasks.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {activeTasks} active, {completedTasks} completed
                  </p>
                </CardContent>
              </Card>

              <Card className="gradient-card border-0 shadow-warm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Words</CardTitle>
                  <Target className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalWordCount.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Words committed to write
                  </p>
                </CardContent>
              </Card>

              <Card className="gradient-card border-0 shadow-warm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
                  <DollarSign className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalDeposits.toLocaleString()} MMK</div>
                  <p className="text-xs text-muted-foreground">
                    Money committed
                  </p>
                </CardContent>
              </Card>

              <Card className="gradient-card border-0 shadow-warm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Task completion rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="gradient-card border-0 shadow-warm hover-lift cursor-pointer" onClick={() => navigate("/task-creation")}>
                <CardHeader className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full gradient-warm flex items-center justify-center shadow-warm mb-4">
                    <Plus className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">Create New Task</CardTitle>
                  <CardDescription>Start a new writing challenge</CardDescription>
                </CardHeader>
              </Card>

              <Card className="gradient-card border-0 shadow-warm cursor-pointer" onClick={() => setActiveTab("tasks")}>
                <CardHeader className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full gradient-warm flex items-center justify-center shadow-warm mb-4">
                    <Edit3 className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">Continue Writing</CardTitle>
                  <CardDescription>Work on your active tasks</CardDescription>
                </CardHeader>
              </Card>

              <Card className="gradient-card border-0 shadow-warm cursor-pointer" onClick={() => setActiveTab("progress")}>
                <CardHeader className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full gradient-warm flex items-center justify-center shadow-warm mb-4">
                    <TrendingUp className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">View Progress</CardTitle>
                  <CardDescription>Track your daily milestones</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="grid gap-6">
              {tasks.map((task) => {
                const todayProgress = getTodayProgress(task);
                const deposit = task.deposits?.[0];
                const isVerified = deposit?.payment_status === 'verified';
                
                return (
                  <Card key={task.id} className="gradient-card border-0 shadow-warm">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <CardTitle className="text-xl">{task.task_name}</CardTitle>
                          <CardDescription>
                            Created on {new Date(task.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={isVerified ? "default" : "secondary"}>
                            {getTaskStatusText(task)}
                          </Badge>
                          {isVerified && (
                            <Button 
                              onClick={() => navigate(`/task-editor/${task.id}`)}
                              className="gradient-warm hover-lift"
                            >
                              <PlayCircle className="w-4 h-4 mr-2" />
                              Write
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
                          <div className="text-lg font-bold text-primary">
                            {Math.ceil(task.word_count / task.duration_days)}
                          </div>
                          <div className="text-xs text-muted-foreground">Words/Day</div>
                        </div>
                      </div>
                      
                      {todayProgress && isVerified && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Today's Progress</span>
                            <span>{todayProgress.words_written} / {todayProgress.required_words} words</span>
                          </div>
                          <Progress 
                            value={Math.min((todayProgress.words_written / todayProgress.required_words) * 100, 100)} 
                            className="h-2" 
                          />
                        </div>
                      )}
                      
                      {!isVerified && (
                        <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mt-4">
                          <div className="flex items-center gap-2 text-warning">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Payment Required</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Complete payment verification to start writing
                          </p>
                          <Button 
                            size="sm" 
                            className="mt-2"
                            onClick={() => navigate(`/payment/${task.id}`)}
                          >
                            Complete Payment
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              
              {tasks.length === 0 && (
                <Card className="gradient-card border-0 shadow-warm">
                  <CardContent className="p-8 text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No Tasks Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first writing task to get started
                    </p>
                    <Button onClick={() => navigate("/task-creation")} className="gradient-warm hover-lift">
                      Create Your First Task
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <Card className="gradient-card border-0 shadow-warm">
              <CardHeader>
                <CardTitle>Daily Progress Tracking</CardTitle>
                <CardDescription>Monitor your daily writing goals and refund status</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Select a task from the Tasks tab to view detailed progress tracking.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card className="gradient-card border-0 shadow-warm">
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Track your deposits and refunds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.map((task) => {
                    const deposit = task.deposits?.[0];
                    if (!deposit) return null;
                    
                    return (
                      <div key={task.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{task.task_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(deposit.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={deposit.payment_status === 'verified' ? "default" : "secondary"}>
                            {deposit.payment_status === 'verified' ? 'Verified' : 'Pending'}
                          </Badge>
                        </div>
                        <div className="text-lg font-bold text-primary">
                          {deposit.amount.toLocaleString()} MMK
                        </div>
                      </div>
                    );
                  })}
                  
                  {tasks.every(task => !task.deposits?.[0]) && (
                    <div className="text-center py-8">
                      <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No payment history yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserDashboard;