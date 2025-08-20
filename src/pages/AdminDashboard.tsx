import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Users, 
  FileText, 
  CreditCard, 
  LogOut, 
  Settings,
  Bell,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  DollarSign,
  Calendar,
  Clock,
  AlertTriangle,
  Plus,
  Upload,
  Download,
  Filter
} from "lucide-react";
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

interface Task {
  id: string;
  task_name: string;
  deposit_amount: number;
  duration_days: number;
  word_count: number;
  status: string;
  created_at: string;
  user_id: string;
}

interface Payment {
  id: string;
  task_id: string;
  user_id: string;
  amount: number;
  payment_status: string;
  screenshot_url: string | null;
  payment_code: string | null;
  created_at: string;
}

interface DepositWithDetails extends Payment {
  task: Task;
  user: UserProfile;
}

const AdminDashboard = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [deposits, setDeposits] = useState<DepositWithDetails[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositWithDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminData, setNewAdminData] = useState({ fullName: "", email: "", password: "" });
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTasks: 0,
    totalPayments: 0,
    pendingPayments: 0,
    activeTasksToday: 0,
    refundsToday: 0,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadAllData();
    }
  }, [profile]);

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

  const loadAllData = async () => {
    await Promise.all([
      loadStats(),
      loadDeposits(),
      loadUsers(),
      loadRefunds()
    ]);
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

      // Get active tasks today
      const today = new Date().toISOString().split('T')[0];
      const { count: activeToday } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('created_at', today);

      setStats({
        totalUsers: usersCount || 0,
        totalTasks: tasksCount || 0,
        totalPayments: paymentsCount || 0,
        pendingPayments: pendingCount || 0,
        activeTasksToday: activeToday || 0,
        refundsToday: 0, // Will implement when refund system is ready
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadDeposits = async () => {
    try {
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          *,
          tasks:task_id (
            id,
            task_name,
            deposit_amount,
            duration_days,
            word_count,
            status,
            created_at,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user details for each payment
      const paymentsWithUsers = await Promise.all(
        payments.map(async (payment: any) => {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', payment.user_id)
            .single();

          return {
            ...payment,
            task: payment.tasks,
            user: userProfile
          };
        })
      );

      setDeposits(paymentsWithUsers);
    } catch (error) {
      console.error('Error loading deposits:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadRefunds = async () => {
    // Placeholder for refund requests - will implement when refund system is ready
    setRefunds([]);
  };

  const handleApproveDeposit = async (depositId: string) => {
    try {
      // Get the payment details to find the user
      const { data: payment } = await supabase
        .from('payments')
        .select('user_id')
        .eq('id', depositId)
        .single();

      if (!payment) {
        toast({
          title: "Error",
          description: "Payment not found",
          variant: "destructive",
        });
        return;
      }

      // Update payment status and reviewed timestamp
      const { error: paymentError } = await supabase
        .from('payments')
        .update({ 
          payment_status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', depositId);

      if (paymentError) throw paymentError;

      // Grant user access to task system
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ has_access: true })
        .eq('user_id', payment.user_id);

      if (profileError) {
        console.warn('Failed to grant user access:', profileError);
      }

      toast({
        title: "Success",
        description: "Payment approved and user granted access",
      });

      loadDeposits();
      loadStats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve deposit",
        variant: "destructive",
      });
    }
  };

  const handleRejectDeposit = async (depositId: string, reason: string) => {
    try {
      // Get the payment details to find the user
      const { data: payment } = await supabase
        .from('payments')
        .select('user_id')
        .eq('id', depositId)
        .single();

      if (!payment) {
        toast({
          title: "Error",
          description: "Payment not found",
          variant: "destructive",
        });
        return;
      }

      // Update payment status with rejection reason
      const { error: paymentError } = await supabase
        .from('payments')
        .update({ 
          payment_status: 'rejected',
          admin_notes: reason,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', depositId);

      if (paymentError) throw paymentError;

      // Ensure user access is revoked
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ has_access: false })
        .eq('user_id', payment.user_id);

      if (profileError) {
        console.warn('Failed to revoke user access:', profileError);
      }

      toast({
        title: "Success",
        description: "Payment rejected and user access revoked",
      });

      setSelectedDeposit(null);
      setRejectionReason("");
      loadDeposits();
      loadStats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject deposit",
        variant: "destructive",
      });
    }
  };

  const handleCreateAdmin = async () => {
    try {
      // Create new admin account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newAdminData.email,
        password: newAdminData.password,
        options: {
          data: {
            full_name: newAdminData.fullName,
            role: 'admin'
          }
        }
      });

      if (authError) throw authError;

      toast({
        title: "Success",
        description: `Admin account created. Temporary password: ${newAdminData.password}`,
      });

      setShowAddAdmin(false);
      setNewAdminData({ fullName: "", email: "", password: "" });
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create admin account",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewAdminData({ ...newAdminData, password });
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-mint-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-mint-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg border-r border-sky-100 z-10">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <Shield className="w-8 h-8 text-sky-600" />
            <h1 className="text-xl font-bold text-gray-800">NoRush Admin</h1>
          </div>
          
          <nav className="space-y-2">
            <Button
              variant={activeTab === "dashboard" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("dashboard")}
            >
              <Settings className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant={activeTab === "deposits" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("deposits")}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Deposits
            </Button>
            <Button
              variant={activeTab === "refunds" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("refunds")}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refunds
            </Button>
            <Button
              variant={activeTab === "users" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("users")}
            >
              <Users className="w-4 h-4 mr-2" />
              Users
            </Button>
            <Button
              variant={activeTab === "reports" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("reports")}
            >
              <FileText className="w-4 h-4 mr-2" />
              Reports
            </Button>
          </nav>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-6">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 capitalize">{activeTab}</h2>
            <p className="text-gray-600">Welcome back, {profile.full_name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
            <Button variant="outline" size="icon">
              <Bell className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <Card className="bg-white shadow-md border border-sky-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-sky-600">{stats.totalUsers}</p>
                    </div>
                    <Users className="w-8 h-8 text-sky-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white shadow-md border border-mint-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Tasks</p>
                      <p className="text-2xl font-bold text-mint-600">{stats.totalTasks}</p>
                    </div>
                    <FileText className="w-8 h-8 text-mint-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white shadow-md border border-lavender-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Payments</p>
                      <p className="text-2xl font-bold text-lavender-600">{stats.totalPayments}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-lavender-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white shadow-md border border-yellow-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Deposits</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.pendingPayments}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white shadow-md border border-green-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Tasks Today</p>
                      <p className="text-2xl font-bold text-green-600">{stats.activeTasksToday}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white shadow-md border border-red-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Refunds Today</p>
                      <p className="text-2xl font-bold text-red-600">{stats.refundsToday}</p>
                    </div>
                    <RefreshCw className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-white shadow-md border border-gray-100">
              <CardHeader>
                <CardTitle>Recent Deposit Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deposits.slice(0, 5).map((deposit) => (
                    <div key={deposit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <div>
                          <p className="font-medium">{deposit.user?.full_name}</p>
                          <p className="text-sm text-gray-600">{deposit.task?.task_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${deposit.amount}</p>
                        <Badge className={getStatusColor(deposit.payment_status)}>
                          {deposit.payment_status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Deposits Tab */}
        {activeTab === "deposits" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Deposit Verification Queue</h3>
              <Button onClick={loadDeposits} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            
            <div className="grid gap-4">
              {deposits.map((deposit) => (
                <Card key={deposit.id} className="bg-white shadow-md border border-gray-100">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{deposit.user?.full_name}</h4>
                          <Badge className={getStatusColor(deposit.payment_status)}>
                            {deposit.payment_status}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-2">{deposit.task?.task_name}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Amount</p>
                            <p className="font-medium">${deposit.amount}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Duration</p>
                            <p className="font-medium">{deposit.task?.duration_days} days</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Words</p>
                            <p className="font-medium">{deposit.task?.word_count}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Submitted</p>
                            <p className="font-medium">{new Date(deposit.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {deposit.screenshot_url && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-2" />
                                View Screenshot
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Payment Screenshot</DialogTitle>
                              </DialogHeader>
                              <img 
                                src={deposit.screenshot_url} 
                                alt="Payment screenshot" 
                                className="w-full h-auto rounded-lg"
                              />
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        {deposit.payment_status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => handleApproveDeposit(deposit.id)}
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reject Deposit</DialogTitle>
                                  <DialogDescription>
                                    Please provide a reason for rejecting this deposit.
                                  </DialogDescription>
                                </DialogHeader>
                                <Textarea
                                  placeholder="Enter rejection reason..."
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                />
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    onClick={() => handleRejectDeposit(deposit.id, rejectionReason)}
                                    variant="destructive"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">User Management</h3>
              <Dialog open={showAddAdmin} onOpenChange={setShowAddAdmin}>
                <DialogTrigger asChild>
                  <Button className="bg-sky-600 hover:bg-sky-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Admin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Admin Account</DialogTitle>
                    <DialogDescription>
                      Create a new admin account for team members.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Full Name</label>
                      <Input
                        value={newAdminData.fullName}
                        onChange={(e) => setNewAdminData({ ...newAdminData, fullName: e.target.value })}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        value={newAdminData.email}
                        onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Temporary Password</label>
                      <div className="flex gap-2">
                        <Input
                          value={newAdminData.password}
                          onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                          placeholder="Temporary password"
                        />
                        <Button onClick={generateTempPassword} variant="outline">
                          Generate
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddAdmin(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateAdmin}>
                      Create Account
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <Card className="bg-white shadow-md border border-gray-100">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-semibold">{user.full_name}</h4>
                        <p className="text-sm text-gray-600">{user.role}</p>
                        {user.kpay_name && (
                          <p className="text-sm text-gray-500">KPay: {user.kpay_name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge className={user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Refunds Tab */}
        {activeTab === "refunds" && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Refund Management</h3>
            <Card className="bg-white shadow-md border border-gray-100">
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No refund requests at this time</p>
                  <p className="text-sm text-gray-500">Refund requests will appear here when submitted by users</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Reports & Analytics</h3>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Daily
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Weekly
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white shadow-md border border-gray-100">
                <CardHeader>
                  <CardTitle>Payment Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Payments</span>
                      <span className="font-semibold">{stats.totalPayments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending Verification</span>
                      <span className="font-semibold text-yellow-600">{stats.pendingPayments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Approved Today</span>
                      <span className="font-semibold text-green-600">0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white shadow-md border border-gray-100">
                <CardHeader>
                  <CardTitle>User Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Users</span>
                      <span className="font-semibold">{stats.totalUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Tasks</span>
                      <span className="font-semibold">{stats.totalTasks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>New Tasks Today</span>
                      <span className="font-semibold">{stats.activeTasksToday}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;