import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { User, LogOut, FileText, CreditCard, PenTool, Clock, Plus, History, Target, Calendar, DollarSign, TrendingUp, Users, Activity } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import DailyMilestoneCounter from "@/components/DailyMilestoneCounter";
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
  payments?: any[];
}

const CombinedDashboard = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [writingText, setWritingText] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showKpayModal, setShowKpayModal] = useState(false);
  const [kpayName, setKpayName] = useState("");
  const [kpayPhone, setKpayPhone] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  // Set up real-time subscription for payment updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('payment-status-changes')
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

    setProfile(profile);

    // Check if Kpay info is missing and user is a 'user' role
    if (profile?.role === 'user' && (!profile.kpay_name || !profile.kpay_phone)) {
      setShowKpayModal(true);
    }

    // Fetch tasks
    await fetchTasks(user.id);
  };

  const fetchTasks = async (userId: string) => {
    try {
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select(`
          *,
          payments (*)
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
        // Auto-select the first verified task
        const verifiedTask = tasksData?.find(task => 
          task.payments?.[0]?.payment_status === 'verified'
        );
        if (verifiedTask) {
          setSelectedTask(verifiedTask);
        }
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

  const handleKpaySubmit = async () => {
    if (!kpayName.trim() || !kpayPhone.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all payment information fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          kpay_name: kpayName.trim(),
          kpay_phone: kpayPhone.trim(),
        })
        .eq('user_id', user?.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update payment information",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Payment information saved successfully!",
        });
        setShowKpayModal(false);
        // Refresh profile
        checkUser();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveText = async () => {
    if (!selectedTask || !writingText.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'in_progress',
        })
        .eq('id', selectedTask.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to save your writing.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Saved!",
          description: "Your writing progress has been saved successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navigateToTaskCreation = () => {
    navigate("/task-creation");
  };

  const getTaskStatusColor = (task: Task) => {
    const payment = task.payments?.[0];
    if (!payment) return "text-yellow-600";
    if (payment.payment_status === 'verified') return "text-green-600";
    if (payment.screenshot_url && payment.payment_status === 'pending') return "text-orange-600";
    return "text-red-600";
  };

  const getTaskStatusText = (task: Task) => {
    const payment = task.payments?.[0];
    if (!payment) return "Payment Required";
    if (payment.payment_status === 'verified') return "Active";
    if (payment.screenshot_url && payment.payment_status === 'pending') return "Verification Pending";
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
            <p className="text-muted-foreground">Manage your writing tasks and track your progress</p>
          </div>
          <Button onClick={handleSignOut} variant="outline" className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="gradient-card border-0 shadow-warm hover-lift cursor-pointer" onClick={navigateToTaskCreation}>
                <CardHeader className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full gradient-warm flex items-center justify-center shadow-warm mb-4">
                    <FileText className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">Create New Task</CardTitle>
                  <CardDescription>Start a new writing project</CardDescription>
                </CardHeader>
              </Card>

              <Card className="gradient-card border-0 shadow-warm cursor-pointer" onClick={() => setShowKpayModal(true)}>
                <CardHeader className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full gradient-warm flex items-center justify-center shadow-warm mb-4">
                    <CreditCard className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">Payment Info</CardTitle>
                  <CardDescription>
                    {profile.kpay_name ? "Update payment details" : "Add payment details"}
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="gradient-card border-0 shadow-warm">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full gradient-warm flex items-center justify-center shadow-warm mb-4">
                    <History className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">Total Tasks</CardTitle>
                  <CardDescription>{tasks.length} tasks created</CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* Recent Tasks Summary */}
            <Card className="gradient-card border-0 shadow-warm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Recent Tasks
                </CardTitle>
                <CardDescription>Your latest writing projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/task/${task.id}`)}
                      className="p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md border-border bg-card hover:border-primary/50"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium mb-2">{task.task_name}</h3>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>{task.word_count?.toLocaleString()} words</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {task.duration_days} days
                            </span>
                          </div>
                        </div>
                        <div className={`text-sm font-medium ${getTaskStatusColor(task)}`}>
                          {getTaskStatusText(task)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">No tasks yet</p>
                      <Button onClick={navigateToTaskCreation} variant="outline">
                        Create Your First Task
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Tasks Tab */}
          <TabsContent value="my-tasks" className="space-y-6">
            <Card className="gradient-card border-0 shadow-warm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  My Tasks
                </CardTitle>
                <CardDescription>All your writing tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tasks.map((task) => (
                    <Card
                      key={task.id}
                      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-border bg-card"
                      onClick={() => navigate(`/task-workspace/${task.id}`)}
                    >
                      <CardHeader>
                        <CardTitle className="text-lg">{task.task_name}</CardTitle>
                        <CardDescription>
                          {task.word_count?.toLocaleString()} words in {task.duration_days} days
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Daily Target:</span>
                            <span className="font-medium">
                              {Math.ceil(task.word_count / task.duration_days)} words/day
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Status:</span>
                            <span className={`font-medium ${getTaskStatusColor(task)}`}>
                              {getTaskStatusText(task)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Deposit:</span>
                            <span className="font-medium">{task.deposit_amount?.toLocaleString()} MMK</span>
                          </div>
                          {task.payments?.[0]?.payment_status === 'verified' && (
                            <Button 
                              className="w-full mt-4 gradient-warm hover-lift"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/task-workspace/${task.id}`);
                              }}
                            >
                              Start Writing
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {tasks.length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No Tasks Yet</h3>
                      <p className="text-muted-foreground mb-4">Create your first writing task to get started</p>
                      <Button onClick={navigateToTaskCreation} className="gradient-warm hover-lift">
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Task
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <Card className="gradient-card border-0 shadow-warm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Writing Progress
                </CardTitle>
                <CardDescription>Track your daily writing progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {tasks.filter(task => task.payments?.[0]?.payment_status === 'verified').map((task) => (
                    <div key={task.id} className="p-4 rounded-lg border border-border bg-card">
                      <h3 className="font-medium mb-3">{task.task_name}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Total Words:</span>
                          <p className="font-medium">{task.word_count?.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <p className="font-medium">{task.duration_days} days</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Daily Target:</span>
                          <p className="font-medium">{Math.ceil(task.word_count / task.duration_days)} words</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Progress:</span>
                          <p className="font-medium text-primary">0% Complete</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {tasks.filter(task => task.payments?.[0]?.payment_status === 'verified').length === 0 && (
                    <div className="text-center py-12">
                      <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No Active Tasks</h3>
                      <p className="text-muted-foreground">Complete payment for your tasks to start tracking progress</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card className="gradient-card border-0 shadow-warm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment History
                </CardTitle>
                <CardDescription>Track your payment status and history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="p-4 rounded-lg border border-border bg-card">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-medium">{task.task_name}</h3>
                        <div className={`text-sm font-medium ${getTaskStatusColor(task)}`}>
                          {getTaskStatusText(task)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Amount:</span> {task.deposit_amount?.toLocaleString()} MMK
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {new Date(task.created_at).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Payment Method:</span> {task.payments?.[0]?.payment_method || 'Kpay'}
                        </div>
                      </div>
                      {!task.payments?.[0] && (
                        <div className="mt-3">
                          <Button 
                            onClick={() => navigate(`/task/${task.id}`)}
                            className="gradient-warm hover-lift"
                            size="sm"
                          >
                            Make Payment
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-center py-12">
                      <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No Payment History</h3>
                      <p className="text-muted-foreground mb-4">Create a task to see payment information</p>
                      <Button onClick={navigateToTaskCreation} variant="outline">
                        Create Your First Task
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>

      {/* Kpay Information Modal */}
      <Dialog open={showKpayModal} onOpenChange={setShowKpayModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {profile?.kpay_name ? "Update Payment Information" : "Complete Your Payment Information"}
            </DialogTitle>
            <DialogDescription>
              Please provide your Kpay details to enable payment processing for your tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kpay-name">Kpay Name</Label>
              <Input
                id="kpay-name"
                type="text"
                placeholder="Your Kpay name"
                value={kpayName || profile?.kpay_name || ""}
                onChange={(e) => setKpayName(e.target.value)}
                className="transition-all duration-300 focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kpay-phone">Kpay Phone Number</Label>
              <Input
                id="kpay-phone"
                type="tel"
                placeholder="09xxxxxxxxx"
                value={kpayPhone || profile?.kpay_phone || ""}
                onChange={(e) => setKpayPhone(e.target.value)}
                className="transition-all duration-300 focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <Button 
              onClick={handleKpaySubmit} 
              className="w-full gradient-warm hover-lift"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Payment Information"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CombinedDashboard;