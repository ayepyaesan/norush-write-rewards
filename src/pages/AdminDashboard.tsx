import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, FileText, CreditCard, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

const AdminDashboard = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTasks: 0,
    totalPayments: 0,
    pendingPayments: 0,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
    loadStats();
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

    // Check if user is actually an admin
    if (profile?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges",
        variant: "destructive",
      });
      navigate("/user/dashboard");
    }
  };

  const loadStats = async () => {
    try {
      // Get total users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'user');

      // Get total tasks count
      const { count: tasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true });

      // Get total payments count
      const { count: paymentsCount } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true });

      // Get pending payments count
      const { count: pendingCount } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'pending');

      setStats({
        totalUsers: usersCount || 0,
        totalTasks: tasksCount || 0,
        totalPayments: paymentsCount || 0,
        pendingPayments: pendingCount || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

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

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Welcome back, {profile.full_name}</p>
          </div>
          <Button onClick={handleSignOut} variant="outline" className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="gradient-card border-0 shadow-warm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Registered users
              </p>
            </CardContent>
          </Card>

          <Card className="gradient-card border-0 shadow-warm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-muted-foreground">
                Writing tasks created
              </p>
            </CardContent>
          </Card>

          <Card className="gradient-card border-0 shadow-warm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPayments}</div>
              <p className="text-xs text-muted-foreground">
                Payment transactions
              </p>
            </CardContent>
          </Card>

          <Card className="gradient-card border-0 shadow-warm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingPayments}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting verification
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Management Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="gradient-card border-0 shadow-warm hover-lift cursor-pointer">
            <CardHeader className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full gradient-warm flex items-center justify-center shadow-warm mb-4">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl">Manage Users</CardTitle>
              <CardDescription>View and manage user accounts</CardDescription>
            </CardHeader>
          </Card>

          <Card className="gradient-card border-0 shadow-warm hover-lift cursor-pointer">
            <CardHeader className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full gradient-warm flex items-center justify-center shadow-warm mb-4">
                <FileText className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl">Manage Tasks</CardTitle>
              <CardDescription>View and manage writing tasks</CardDescription>
            </CardHeader>
          </Card>

          <Card className="gradient-card border-0 shadow-warm hover-lift cursor-pointer">
            <CardHeader className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full gradient-warm flex items-center justify-center shadow-warm mb-4">
                <CreditCard className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl">Payment Verification</CardTitle>
              <CardDescription>Review and verify payments</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Profile Information */}
        <Card className="gradient-card border-0 shadow-warm mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Admin Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                <p className="text-foreground">{profile.full_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-foreground">{user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                <p className="text-foreground capitalize">{profile.role}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Account Created</p>
                <p className="text-foreground">{new Date(user.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;