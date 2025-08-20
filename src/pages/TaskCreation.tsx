import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, Calculator, Calendar, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const TaskCreation = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [taskName, setTaskName] = useState("");
  const [wordCount, setWordCount] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const depositAmount = wordCount ? parseInt(wordCount) * 50 : 0;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to create a task.",
          variant: "destructive",
        });
        navigate("/workspace");
        return;
      }

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          task_name: taskName.trim(),
          word_count: parseInt(wordCount),
          duration_days: parseInt(durationDays),
          deposit_amount: depositAmount,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create task. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Task Created!",
          description: "Proceeding to payment...",
        });
        navigate(`/payment/${task.id}`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Back button */}
        <Link 
          to="/workspace" 
          className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors duration-300 mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sign In
        </Link>

        <Card className="gradient-card border-0 shadow-warm">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full gradient-warm flex items-center justify-center shadow-warm">
              <FileText className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Create Your Writing Task
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Tell us about your writing project and we'll calculate your deposit
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="task-name">Task Name</Label>
                <Input
                  id="task-name"
                  type="text"
                  placeholder="e.g., Blog post about technology"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  required
                  className="transition-all duration-300 focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="word-count">Word Count</Label>
                <Input
                  id="word-count"
                  type="number"
                  placeholder="e.g., 1000"
                  value={wordCount}
                  onChange={(e) => setWordCount(e.target.value)}
                  min="1"
                  required
                  className="transition-all duration-300 focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (Days)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="e.g., 7"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  min="1"
                  required
                  className="transition-all duration-300 focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Deposit Calculation Display */}
              {wordCount && (
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 border border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Deposit Amount:</span>
                    <span className="text-2xl font-bold text-primary">
                      {depositAmount.toLocaleString()} MMK
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    1 word = 50 MMK • {wordCount} words × 50 MMK
                  </p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full gradient-warm hover-lift text-lg py-6"
                disabled={isLoading || !taskName.trim() || !wordCount || !durationDays}
              >
                {isLoading ? "Creating Task..." : "Proceed to Payment"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TaskCreation;