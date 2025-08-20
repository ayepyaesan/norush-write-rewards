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
  const [activeTab, setActiveTab] = useState("dashboard");
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
        // Auto-select the first paid task
        const paidTask = tasksData?.find(task => 
          task.payments?.[0]?.payment_status === 'verified' || 
          task.payments?.[0]?.screenshot_url
        );
        if (paidTask) {
          setSelectedTask(paidTask);
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
    if (payment.screenshot_url && payment.payment_status === 'pending') return "text-orange-600";
    if (payment.payment_status === 'verified') return "text-green-600";
    return "text-red-600";
  };

  const getTaskStatusText = (task: Task) => {
    const payment = task.payments?.[0];
    if (!payment) return "Payment Pending";
    if (payment.screenshot_url && payment.payment_status === 'pending') return "Verification Pending";
    if (payment.payment_status === 'verified') return "Active";
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
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="history">Task History</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
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

            {/* Recent Tasks */}
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

          {/* Write Tab */}
          <TabsContent value="write" className="space-y-6">
            {/* Daily Milestone Tracker - Compact Header */}
            {selectedTask && (
              <DailyMilestoneCounter
                taskWordCount={selectedTask.word_count}
                taskDurationDays={selectedTask.duration_days}
                taskCreatedAt={selectedTask.created_at}
                currentWordCount={writingText.trim().split(/\s+/).filter(word => word.length > 0).length}
                className="max-w-4xl mx-auto"
              />
            )}
            
            {/* Writing Area - Full Width */}
            <div className="w-full">
              <Card className="gradient-card border-0 shadow-warm h-[700px] flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PenTool className="w-5 h-5" />
                      {selectedTask ? selectedTask.task_name : "Select a Task to Start Writing"}
                    </CardTitle>
                    {selectedTask && (
                      <CardDescription>
                        Target: {selectedTask.word_count?.toLocaleString()} words • 
                        Duration: {selectedTask.duration_days} days • 
                        Deposit: {selectedTask.deposit_amount?.toLocaleString()} MMK
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    {selectedTask ? (
                      <>
                        <Textarea
                          value={writingText}
                          onChange={(e) => setWritingText(e.target.value)}
                          placeholder="Start writing your content here..."
                          className="flex-1 resize-none min-h-[400px] text-base leading-relaxed"
                        />
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="text-sm text-muted-foreground">
                            Words: {writingText.trim().split(/\s+/).filter(word => word.length > 0).length} / {selectedTask.word_count?.toLocaleString()}
                          </div>
                          <Button 
                            onClick={handleSaveText} 
                            className="gradient-warm hover-lift"
                            disabled={isSaving}
                          >
                            {isSaving ? "Saving..." : "Save Progress"}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-center">
                        <div>
                          <PenTool className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="text-lg font-medium mb-2">Ready to Write?</h3>
                          <p className="text-muted-foreground mb-4">
                            Select a task from the sidebar or create a new one to get started.
                          </p>
                          <Button onClick={navigateToTaskCreation} className="gradient-warm hover-lift">
                            Create New Task
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
            </div>
          </TabsContent>

          {/* Task History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="gradient-card border-0 shadow-warm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Task History
                </CardTitle>
                <CardDescription>All your writing tasks and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-lg border border-border bg-card"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">{task.task_name}</h3>
                        <div className={`text-sm font-medium ${getTaskStatusColor(task)}`}>
                          {getTaskStatusText(task)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Words:</span> {task.word_count?.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {task.duration_days} days
                        </div>
                        <div>
                          <span className="font-medium">Deposit:</span> {task.deposit_amount?.toLocaleString()} MMK
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {new Date(task.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/task/${task.id}`)}
                        >
                          View Details
                        </Button>
                        {task.payments?.[0]?.payment_status === 'verified' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedTask(task);
                              setActiveTab("write");
                            }}
                          >
                            Start Writing
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-center py-8">
                      <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">No task history yet</p>
                      <Button onClick={navigateToTaskCreation} variant="outline">
                        Create Your First Task
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="gradient-card border-0 shadow-warm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>View and manage your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                    <p className="text-foreground">{profile.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p className="text-foreground">{user.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Kpay Name</Label>
                    <p className="text-foreground">{profile.kpay_name || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Kpay Phone</Label>
                    <p className="text-foreground">{profile.kpay_phone || "Not set"}</p>
                  </div>
                </div>
                <div className="pt-4">
                  <Button onClick={() => setShowKpayModal(true)} variant="outline">
                    Update Payment Information
                  </Button>
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