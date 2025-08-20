import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PenTool, FileText, Clock, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [writingText, setWritingText] = useState("");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/workspace");
        return;
      }

      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select(`
          *,
          payments (*)
        `)
        .eq('user_id', user.id)
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

  const handleSaveText = async () => {
    if (!selectedTask || !writingText.trim()) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'in_progress',
          // You might want to add a content field to store the writing
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
          description: "Your writing has been saved successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const getTaskStatusColor = (task: any) => {
    const payment = task.payments?.[0];
    if (!payment) return "text-yellow-600";
    if (payment.screenshot_url && payment.payment_status === 'pending') return "text-orange-600";
    if (payment.payment_status === 'verified') return "text-green-600";
    return "text-red-600";
  };

  const getTaskStatusText = (task: any) => {
    const payment = task.payments?.[0];
    if (!payment) return "Payment Pending";
    if (payment.screenshot_url && payment.payment_status === 'pending') return "Verification Pending";
    if (payment.payment_status === 'verified') return "Active";
    return "Payment Required";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full gradient-warm animate-pulse mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
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
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Writing Dashboard</h1>
              <p className="text-muted-foreground">Manage your writing tasks and track your progress</p>
            </div>
            <Link to="/task-creation">
              <Button className="gradient-warm hover-lift">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tasks Sidebar */}
          <div className="lg:col-span-1">
            <Card className="gradient-card border-0 shadow-warm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Your Tasks
                </CardTitle>
                <CardDescription>Click on a task to start writing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasks.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">No tasks yet</p>
                      <Link to="/task-creation">
                        <Button variant="outline" size="sm">
                          Create Your First Task
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => navigate(`/task/${task.id}`)}
                        className="p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md border-border bg-card hover:border-primary/50"
                      >
                        <h3 className="font-medium text-sm mb-2 truncate">{task.task_name}</h3>
                        <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                          <span>{task.word_count?.toLocaleString()} words</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.duration_days}d
                          </span>
                        </div>
                        <div className={`text-xs font-medium ${getTaskStatusColor(task)}`}>
                          {getTaskStatusText(task)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Writing Area */}
          <div className="lg:col-span-2">
            <Card className="gradient-card border-0 shadow-warm h-[600px] flex flex-col">
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
                      <Button onClick={handleSaveText} className="gradient-warm hover-lift">
                        Save Progress
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
                      <Link to="/task-creation">
                        <Button className="gradient-warm hover-lift">
                          Create New Task
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;