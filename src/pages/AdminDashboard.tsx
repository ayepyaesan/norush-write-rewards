import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Shield, Users, FileText, CreditCard, LogOut, Settings, Bell, Search, CheckCircle, XCircle, Eye, RefreshCw, DollarSign, Calendar, Clock, AlertTriangle, Plus, Upload, Download, Filter, TrendingUp, BarChart3, PieChart, Activity, UserCheck, UserX, Star, Moon, Sun, ChevronDown, ArrowUpRight, ArrowDownLeft, Target, Briefcase, Wallet, Building, Mail, Phone, Banknote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import RefundRequestTracker from "@/components/RefundRequestTracker";
import RefundMenu from "@/components/RefundMenu";
// Charts removed to avoid TypeScript conflicts - using visual indicators instead

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  kpay_name: string | null;
  kpay_phone: string | null;
  has_access: boolean;
  created_at: string;
}
interface Task {
  id: string;
  task_name: string;
  deposit_amount: number;
  duration_days: number;
  word_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  deadline: string | null;
  user_id: string;
  refund_earned_mmk: number;
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
  reviewed_at: string | null;
  admin_notes: string | null;
}
interface DailyProgress {
  id: string;
  task_id: string;
  user_id: string;
  date: string;
  goal_words: number;
  words_written: number;
  status: string;
  refund_earned_mmk: number;
}
interface DepositWithDetails extends Payment {
  task: Task;
  user: UserProfile;
}
interface ChartData {
  date: string;
  users: number;
  tasks: number;
  payments: number;
  revenue: number;
}
const AdminDashboard = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [deposits, setDeposits] = useState<DepositWithDetails[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositWithDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    fullName: "",
    email: "",
    password: ""
  });
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateRange, setDateRange] = useState("7");
  const [darkMode, setDarkMode] = useState(false);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    totalPayments: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    verifiedPayments: 0,
    rejectedPayments: 0,
    tasksToday: 0,
    refundsToday: 0,
    newUsersToday: 0,
    totalProfit: 0,
    avgTaskCompletion: 0,
    topPerformers: 0,
    lastSynced: null as string | null,
    error: false,
    lastSyncError: null as string | null
  });
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  useEffect(() => {
    checkUser();
  }, []);
  useEffect(() => {
    if (profile?.role === 'admin') {
      loadAllData();

      // Set up real-time subscriptions for instant updates
      const profilesChannel = supabase.channel('profiles-changes').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        console.log('Profile change detected, refreshing stats...');
        loadStats();
        loadUsers();
      }).subscribe();
      const tasksChannel = supabase.channel('tasks-changes').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks'
      }, () => {
        console.log('Task change detected, refreshing stats...');
        loadStats();
        loadTasks();
      }).subscribe();
      const paymentsChannel = supabase.channel('payments-changes').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments'
      }, () => {
        console.log('Payment change detected, refreshing stats...');
        loadStats();
        loadDeposits();
      }).subscribe();

      // Also keep polling as backup (every 60 seconds instead of 30)
      const interval = setInterval(() => {
        loadAllData();
      }, 60000);
      return () => {
        clearInterval(interval);
        supabase.removeChannel(profilesChannel);
        supabase.removeChannel(tasksChannel);
        supabase.removeChannel(paymentsChannel);
      };
    }
  }, [profile]);
  const checkUser = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/workspace");
      return;
    }
    setUser(user);
    const {
      data: profile,
      error
    } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    if (error || profile?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges",
        variant: "destructive"
      });
      navigate("/dashboard");
      return;
    }
    setProfile(profile);
  };
  const loadAllData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadStats(), loadDeposits(), loadUsers(), loadTasks(), loadChartData()]);
    } finally {
      setRefreshing(false);
    }
  };
  const loadStats = async () => {
    try {
      console.log('Loading real-time stats from Supabase...');
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Get comprehensive statistics with proper error handling and debug logging
      const queries = await Promise.allSettled([
      // Query 0: Total users (all profiles with role 'user')
      supabase.from('profiles').select('*', {
        count: 'exact',
        head: true
      }).eq('role', 'user'),
      // Query 1: Active users (users with access granted)
      supabase.from('profiles').select('*', {
        count: 'exact',
        head: true
      }).eq('role', 'user').eq('has_access', true),
      // Query 2: All tasks
      supabase.from('tasks').select('*', {
        count: 'exact',
        head: true
      }),
      // Query 3: Active tasks
      supabase.from('tasks').select('*', {
        count: 'exact',
        head: true
      }).eq('status', 'active'),
      // Query 4: Completed tasks
      supabase.from('tasks').select('*', {
        count: 'exact',
        head: true
      }).eq('status', 'completed'),
      // Query 5: Overdue tasks
      supabase.from('tasks').select('*', {
        count: 'exact',
        head: true
      }).eq('status', 'overdue'),
      // Query 6: All payments
      supabase.from('payments').select('*', {
        count: 'exact',
        head: true
      }),
      // Query 7: Pending payments
      supabase.from('payments').select('*', {
        count: 'exact',
        head: true
      }).eq('payment_status', 'pending'),
      // Query 8: Verified payments
      supabase.from('payments').select('*', {
        count: 'exact',
        head: true
      }).eq('payment_status', 'verified'),
      // Query 9: Rejected payments
      supabase.from('payments').select('*', {
        count: 'exact',
        head: true
      }).eq('payment_status', 'rejected'),
      // Query 10: Tasks created today
      supabase.from('tasks').select('*', {
        count: 'exact',
        head: true
      }).gte('created_at', today).lt('created_at', tomorrowStr),
      // Query 11: New users today
      supabase.from('profiles').select('*', {
        count: 'exact',
        head: true
      }).gte('created_at', today).lt('created_at', tomorrowStr).eq('role', 'user'),
      // Query 12: Verified payment amounts for revenue calculation
      supabase.from('payments').select('amount').eq('payment_status', 'verified'),
      // Query 13: Refunds today (from refunds table)
      supabase.from('refund_requests').select('*', {
        count: 'exact',
        head: true
      }).gte('created_at', today).lt('created_at', tomorrowStr),
      // Query 14: All refunds for total calculation
      supabase.from('refund_requests').select('amount')]);

      // Debug logging for each query result
      queries.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          console.log(`Query ${index} successful:`, result.value.count ?? result.value.data?.length ?? 'No count');
        } else {
          console.error(`Query ${index} failed:`, result.reason);
        }
      });

      // Extract counts safely with proper error checking
      const totalUsersCount = queries[0].status === 'fulfilled' ? queries[0].value.count ?? 0 : 0;
      const activeUsersCount = queries[1].status === 'fulfilled' ? queries[1].value.count ?? 0 : 0;
      const totalTasksCount = queries[2].status === 'fulfilled' ? queries[2].value.count ?? 0 : 0;
      const activeTasksCount = queries[3].status === 'fulfilled' ? queries[3].value.count ?? 0 : 0;
      const completedTasksCount = queries[4].status === 'fulfilled' ? queries[4].value.count ?? 0 : 0;
      const overdueTasksCount = queries[5].status === 'fulfilled' ? queries[5].value.count ?? 0 : 0;
      const totalPaymentsCount = queries[6].status === 'fulfilled' ? queries[6].value.count ?? 0 : 0;
      const pendingPaymentsCount = queries[7].status === 'fulfilled' ? queries[7].value.count ?? 0 : 0;
      const verifiedPaymentsCount = queries[8].status === 'fulfilled' ? queries[8].value.count ?? 0 : 0;
      const rejectedPaymentsCount = queries[9].status === 'fulfilled' ? queries[9].value.count ?? 0 : 0;
      const tasksTodayCount = queries[10].status === 'fulfilled' ? queries[10].value.count ?? 0 : 0;
      const newUsersTodayCount = queries[11].status === 'fulfilled' ? queries[11].value.count ?? 0 : 0;
      const revenueData = queries[12].status === 'fulfilled' ? queries[12].value.data ?? [] : [];
      const refundsTodayCount = queries[13].status === 'fulfilled' ? queries[13].value.count ?? 0 : 0;
      const refundsData = queries[14].status === 'fulfilled' ? queries[14].value.data ?? [] : [];

      // Calculate totals
      const totalRevenue = revenueData.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const totalRefunds = refundsData.reduce((sum, refund) => sum + (refund.amount || 0), 0);
      const netProfit = totalRevenue - totalRefunds;
      const avgCompletion = totalTasksCount > 0 ? Math.round(completedTasksCount / totalTasksCount * 100) : 0;
      const newStats = {
        totalUsers: totalUsersCount,
        activeUsers: activeUsersCount,
        totalTasks: totalTasksCount,
        activeTasks: activeTasksCount,
        completedTasks: completedTasksCount,
        overdueTasks: overdueTasksCount,
        totalPayments: totalPaymentsCount,
        totalRevenue: totalRevenue,
        pendingPayments: pendingPaymentsCount,
        verifiedPayments: verifiedPaymentsCount,
        rejectedPayments: rejectedPaymentsCount,
        tasksToday: tasksTodayCount,
        refundsToday: refundsTodayCount,
        newUsersToday: newUsersTodayCount,
        totalProfit: netProfit,
        avgTaskCompletion: avgCompletion,
        topPerformers: Math.min(5, activeUsersCount),
        lastSynced: new Date().toISOString(),
        error: false,
        lastSyncError: null
      };

      // Enhanced debug logging
      console.log('🔄 Real-time stats loaded successfully:', newStats);
      console.log('📊 Database sync verification:', {
        usersQuery: `profiles table with role='user': ${totalUsersCount}`,
        tasksQuery: `tasks table total: ${totalTasksCount}`,
        paymentsQuery: `payments table total: ${totalPaymentsCount}`,
        revenueQuery: `verified payments sum: ${totalRevenue} MMK`,
        timestamp: new Date().toISOString()
      });
      setStats(newStats);
    } catch (error) {
      console.error('❌ Error loading real-time stats:', error);
      toast({
        title: "⚠️ Data Fetch Error",
        description: "Failed to load real-time statistics from database",
        variant: "destructive"
      });

      // Set error state to show data fetch problems
      setStats(prev => ({
        ...prev,
        error: true,
        lastSyncError: new Date().toISOString()
      }));
    }
  };
  const loadChartData = async () => {
    try {
      const days = parseInt(dateRange);
      const dates = Array.from({
        length: days
      }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        return date.toISOString().split('T')[0];
      });
      const chartData = await Promise.all(dates.map(async date => {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateStr = nextDate.toISOString().split('T')[0];
        const [{
          count: usersCount
        }, {
          count: tasksCount
        }, {
          count: paymentsCount
        }, {
          data: revenueData
        }] = await Promise.all([supabase.from('profiles').select('*', {
          count: 'exact',
          head: true
        }).gte('created_at', date).lt('created_at', nextDateStr), supabase.from('tasks').select('*', {
          count: 'exact',
          head: true
        }).gte('created_at', date).lt('created_at', nextDateStr), supabase.from('payments').select('*', {
          count: 'exact',
          head: true
        }).gte('created_at', date).lt('created_at', nextDateStr), supabase.from('payments').select('amount').eq('payment_status', 'verified').gte('created_at', date).lt('created_at', nextDateStr)]);
        const revenue = revenueData?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
        return {
          date: new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          }),
          users: usersCount || 0,
          tasks: tasksCount || 0,
          payments: paymentsCount || 0,
          revenue
        };
      }));
      setChartData(chartData);
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };
  const loadDeposits = async () => {
    try {
      const {
        data: payments,
        error
      } = await supabase.from('payments').select(`
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
        `).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      const paymentsWithUsers = await Promise.all(payments.map(async (payment: any) => {
        const {
          data: userProfile
        } = await supabase.from('profiles').select('*').eq('user_id', payment.user_id).single();
        return {
          ...payment,
          task: payment.tasks,
          user: userProfile
        };
      }));
      setDeposits(paymentsWithUsers);
    } catch (error) {
      console.error('Error loading deposits:', error);
    }
  };
  const loadUsers = async () => {
    try {
      const {
        data: users,
        error
      } = await supabase.from('profiles').select('*').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setUsers(users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };
  const loadTasks = async () => {
    try {
      const {
        data: tasks,
        error
      } = await supabase.from('tasks').select('*').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setTasks(tasks || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };
  const handleApproveDeposit = async (depositId: string) => {
    try {
      const {
        data: payment
      } = await supabase.from('payments').select('user_id').eq('id', depositId).single();
      if (!payment) {
        toast({
          title: "Error",
          description: "Payment not found",
          variant: "destructive"
        });
        return;
      }
      const {
        error: paymentError
      } = await supabase.from('payments').update({
        payment_status: 'verified',
        reviewed_at: new Date().toISOString()
      }).eq('id', depositId);
      if (paymentError) throw paymentError;
      const {
        error: profileError
      } = await supabase.from('profiles').update({
        has_access: true
      }).eq('user_id', payment.user_id);
      if (profileError) {
        console.warn('Failed to grant user access:', profileError);
      }
      toast({
        title: "Success",
        description: "Payment approved and user granted access"
      });
      loadAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve deposit",
        variant: "destructive"
      });
    }
  };
  const handleRejectDeposit = async (depositId: string, reason: string) => {
    try {
      const {
        data: payment
      } = await supabase.from('payments').select('user_id').eq('id', depositId).single();
      if (!payment) {
        toast({
          title: "Error",
          description: "Payment not found",
          variant: "destructive"
        });
        return;
      }
      const {
        error: paymentError
      } = await supabase.from('payments').update({
        payment_status: 'rejected',
        admin_notes: reason,
        reviewed_at: new Date().toISOString()
      }).eq('id', depositId);
      if (paymentError) throw paymentError;
      const {
        error: profileError
      } = await supabase.from('profiles').update({
        has_access: false
      }).eq('user_id', payment.user_id);
      if (profileError) {
        console.warn('Failed to revoke user access:', profileError);
      }
      toast({
        title: "Success",
        description: "Payment rejected and user access revoked"
      });
      setSelectedDeposit(null);
      setRejectionReason("");
      loadAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject deposit",
        variant: "destructive"
      });
    }
  };
  const handleSuspendUser = async (userId: string, suspend: boolean) => {
    try {
      const {
        error
      } = await supabase.from('profiles').update({
        has_access: !suspend
      }).eq('user_id', userId);
      if (error) throw error;
      toast({
        title: "Success",
        description: `User ${suspend ? 'suspended' : 'activated'} successfully`
      });
      loadUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${suspend ? 'suspend' : 'activate'} user`,
        variant: "destructive"
      });
    }
  };
  const handleCreateAdmin = async () => {
    try {
      // Validation checks
      if (!newAdminData.fullName.trim() || !newAdminData.email.trim() || !newAdminData.password.trim()) {
        toast({
          title: "Validation Error",
          description: "All fields are required",
          variant: "destructive"
        });
        return;
      }

      // Check if email already exists (Note: profiles table doesn't have email column)
      // The auth system will handle duplicate email checking

      // Create admin account
      const {
        data: authData,
        error: authError
      } = await supabase.auth.signUp({
        email: newAdminData.email.trim().toLowerCase(),
        password: newAdminData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: newAdminData.fullName.trim(),
            role: 'admin' // This will be enforced in the database trigger
          }
        }
      });
      if (authError) {
        console.error('Admin creation error:', authError);
        throw authError;
      }

      // Log admin creation activity
      if (authData.user) {
        await supabase.from('admin_activity_log').insert({
          admin_user_id: user?.id,
          action: 'admin_created',
          target_user_id: authData.user.id,
          details: {
            admin_email: newAdminData.email,
            admin_name: newAdminData.fullName,
            created_by: profile?.full_name
          }
        });
      }
      console.log(`Admin account created by ${profile?.full_name} for ${newAdminData.email}`);
      toast({
        title: "✅ Admin Account Created",
        description: `New admin account created successfully. Email: ${newAdminData.email}`
      });
      setShowAddAdmin(false);
      setNewAdminData({
        fullName: "",
        email: "",
        password: ""
      });
      loadUsers();
    } catch (error: any) {
      console.error('Error creating admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create admin account",
        variant: "destructive"
      });
    }
  };
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  const exportData = async (type: string, period: string = 'monthly') => {
    try {
      setRefreshing(true);

      // Calculate date range based on period
      const now = new Date();
      let startDate = new Date();
      switch (period) {
        case 'daily':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'weekly':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'yearly':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(now.getMonth() - 1);
      }
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = now.toISOString().split('T')[0];

      // Fetch comprehensive data for the period
      const [usersData, tasksData, paymentsData, refundsData] = await Promise.all([supabase.from('profiles').select('*').gte('created_at', startDateStr).eq('role', 'user'), supabase.from('tasks').select('*').gte('created_at', startDateStr), supabase.from('payments').select('*').gte('created_at', startDateStr), supabase.from('refund_requests').select('*').gte('created_at', startDateStr)]);

      // Calculate report metrics
      const totalUsers = usersData.data?.length || 0;
      const totalTasks = tasksData.data?.length || 0;
      const completedTasks = tasksData.data?.filter(t => t.status === 'completed').length || 0;
      const totalRevenue = paymentsData.data?.filter(p => p.payment_status === 'verified').reduce((sum, p) => sum + p.amount, 0) || 0;
      const totalRefunds = refundsData.data?.reduce((sum, r) => sum + r.amount, 0) || 0;
      const netProfit = totalRevenue - totalRefunds;

      // Create report data
      const reportData = {
        period: period.charAt(0).toUpperCase() + period.slice(1),
        dateRange: `${startDate.toLocaleDateString()} - ${now.toLocaleDateString()}`,
        metrics: {
          totalUsers,
          totalTasks,
          completedTasks,
          taskCompletionRate: totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0,
          totalRevenue,
          totalRefunds,
          netProfit,
          profitMargin: totalRevenue > 0 ? Math.round(netProfit / totalRevenue * 100) : 0
        },
        details: {
          users: usersData.data || [],
          tasks: tasksData.data || [],
          payments: paymentsData.data || [],
          refunds: refundsData.data || []
        }
      };
      if (type === 'CSV') {
        exportToCSV(reportData);
      } else if (type === 'JSON') {
        exportToJSON(reportData);
      }
      toast({
        title: "Export Completed",
        description: `${period} ${type} report has been downloaded`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate report",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };
  const exportToCSV = (data: any) => {
    const metrics = data.metrics;
    const csvContent = [['NoRush Admin Report', data.period], ['Date Range', data.dateRange], [''], ['Metrics', 'Value'], ['Total Users', metrics.totalUsers], ['Total Tasks', metrics.totalTasks], ['Completed Tasks', metrics.completedTasks], ['Task Completion Rate', `${metrics.taskCompletionRate}%`], ['Total Revenue (MMK)', metrics.totalRevenue.toLocaleString()], ['Total Refunds (MMK)', metrics.totalRefunds.toLocaleString()], ['Net Profit (MMK)', metrics.netProfit.toLocaleString()], ['Profit Margin', `${metrics.profitMargin}%`]].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `norush-report-${data.period.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const exportToJSON = (data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `norush-report-${data.period.toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewAdminData({
      ...newAdminData,
      password
    });
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'verified':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };
  const filteredDeposits = deposits.filter(deposit => {
    const matchesSearch = searchQuery === '' || deposit.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || deposit.task?.task_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || deposit.payment_status === filterStatus;
    return matchesSearch && matchesStatus;
  });
  const filteredUsers = users.filter(user => {
    return searchQuery === '' || user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || user.role?.toLowerCase().includes(searchQuery.toLowerCase());
  });
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchQuery === '' || task.task_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    return matchesSearch && matchesStatus;
  });
  const pieData = [{
    name: 'Verified',
    value: stats.verifiedPayments,
    color: '#10b981'
  }, {
    name: 'Pending',
    value: stats.pendingPayments,
    color: '#f59e0b'
  }, {
    name: 'Rejected',
    value: stats.rejectedPayments,
    color: '#ef4444'
  }];
  if (!user || !profile) {
    return <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-sky-50 via-white to-mint-50'} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sky-500"></div>
      </div>;
  }
  return <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-sky-50 via-white to-mint-50'}`}>
      {/* Enhanced Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-sky-100'} shadow-lg border-r z-10`}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <Shield className="w-8 h-8 text-sky-600" />
            <h1 className="text-xl font-bold">NoRush Admin</h1>
          </div>
          
          <nav className="space-y-2">
            {[{
            id: "dashboard",
            icon: BarChart3,
            label: "Dashboard"
          }, {
            id: "users",
            icon: Users,
            label: "Users"
          }, {
            id: "tasks",
            icon: FileText,
            label: "Tasks"
          }, {
            id: "deposits",
            icon: CreditCard,
            label: "Payments"
          }, {
            id: "refunds",
            icon: Banknote,
            label: "Refunds"
          }, {
            id: "reports",
            icon: TrendingUp,
            label: "Reports"
          }, {
            id: "settings",
            icon: Settings,
            label: "Settings"
          }].map(item => <Button key={item.id} variant={activeTab === item.id ? "default" : "ghost"} className="w-full justify-start" onClick={() => setActiveTab(item.id)}>
                <item.icon className="w-4 h-4 mr-2" />
                {item.label}
              </Button>)}
          </nav>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Dark Mode</span>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-6">
        {/* Enhanced Top Bar */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold capitalize">{activeTab}</h2>
            <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
              Welcome back, {profile.full_name}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 w-80" />
            </div>
            {activeTab !== "dashboard" && <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>}
            <div className="flex items-center gap-4">
              {/* Real-time status indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${refreshing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {refreshing ? 'Updating...' : 'Live'}
                </span>
              </div>
              
              <Button variant="outline" size="icon" onClick={loadAllData} disabled={refreshing}>
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="icon">
                <Bell className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && <div className="space-y-6">
            {/* Enhanced Stats Grid with Real-time Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[{
            title: "Total Users",
            value: stats.error ? "⚠️ Error" : stats.totalUsers,
            change: stats.error ? "Data fetch failed" : `+${stats.newUsersToday} today`,
            icon: Users,
            color: stats.error ? "red" : "sky",
            realTime: true,
            lastSync: stats.lastSynced
          }, {
            title: "Active Tasks",
            value: stats.error ? "⚠️ Error" : stats.activeTasks,
            change: stats.error ? "Data fetch failed" : `${stats.avgTaskCompletion}% completion`,
            icon: Target,
            color: stats.error ? "red" : "mint",
            realTime: true,
            lastSync: stats.lastSynced
          }, {
            title: "Total Revenue",
            value: stats.error ? "⚠️ Error" : `${stats.totalRevenue.toLocaleString()} MMK`,
            change: stats.error ? "Data fetch failed" : `${stats.totalProfit.toLocaleString()} MMK profit`,
            icon: DollarSign,
            color: stats.error ? "red" : "green",
            realTime: true,
            lastSync: stats.lastSynced
          }, {
            title: "Pending Payments",
            value: stats.error ? "⚠️ Error" : stats.pendingPayments,
            change: stats.error ? "Data fetch failed" : "Needs review",
            icon: AlertTriangle,
            color: stats.error ? "red" : "yellow",
            realTime: true,
            lastSync: stats.lastSynced
          }].map((stat, index) => <Card key={index} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg hover:shadow-xl transition-shadow relative`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{stat.title}</p>
                          {stat.realTime && <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${stats.error ? 'bg-red-500' : 'bg-green-500'}`}></div>}
                        </div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>{stat.change}</p>
                        {stat.lastSync && !stats.error && <p className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'} mt-1`}>
                            Last synced: {new Date(stat.lastSync).toLocaleTimeString()}
                          </p>}
                        {stats.error && <p className="text-xs text-red-500 mt-1">
                            Database connection error
                          </p>}
                      </div>
                      
                    </div>
                  </CardContent>
                </Card>)}
            </div>

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Growth Trends Summary */}
              <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg`}>
                <CardHeader>
                  <CardTitle>Growth Trends</CardTitle>
                  <CardDescription>Activity summary for the last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>New Users</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{stats.newUsersToday}</span>
                        <ArrowUpRight className="w-4 h-4 text-green-500" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tasks Created</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{stats.tasksToday}</span>
                        <ArrowUpRight className="w-4 h-4 text-green-500" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Active Users</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{stats.activeUsers}</span>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Completion Rate</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{stats.avgTaskCompletion}%</span>
                        <Star className="w-4 h-4 text-yellow-500" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Status Distribution */}
              <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg`}>
                <CardHeader>
                  <CardTitle>Payment Distribution</CardTitle>
                  <CardDescription>Status breakdown and metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pieData.map((entry, index) => <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full" style={{
                      backgroundColor: entry.color
                    }}></div>
                          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{entry.value}</span>
                          <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            ({Math.round(entry.value / stats.totalPayments * 100 || 0)}%)
                          </span>
                        </div>
                      </div>)}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Revenue</span>
                      <span className="font-semibold text-green-600">{stats.totalRevenue.toLocaleString()} MMK</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className={`lg:col-span-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg`}>
                <CardHeader>
                  <CardTitle>Recent Deposit Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {deposits.slice(0, 10).map(deposit => <div key={deposit.id} className={`flex items-center justify-between p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${deposit.payment_status === 'pending' ? 'bg-yellow-500' : deposit.payment_status === 'verified' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <div>
                              <p className="font-medium">{deposit.user?.full_name}</p>
                              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {deposit.task?.task_name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{deposit.amount.toLocaleString()} MMK</p>
                            <Badge className={getStatusColor(deposit.payment_status)}>
                              {deposit.payment_status}
                            </Badge>
                          </div>
                        </div>)}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg`}>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab("deposits")}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Review Payments ({stats.pendingPayments})
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab("users")}>
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => exportData('Daily Report')}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Daily Report
                  </Button>
                  <Dialog open={showAddAdmin} onOpenChange={setShowAddAdmin}>
                    <DialogTrigger asChild>
                      <Button className="w-full justify-start">
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
                          <Input value={newAdminData.fullName} onChange={e => setNewAdminData({
                        ...newAdminData,
                        fullName: e.target.value
                      })} placeholder="Enter full name" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Email</label>
                          <Input type="email" value={newAdminData.email} onChange={e => setNewAdminData({
                        ...newAdminData,
                        email: e.target.value
                      })} placeholder="Enter email address" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Temporary Password</label>
                          <div className="flex gap-2">
                            <Input value={newAdminData.password} onChange={e => setNewAdminData({
                          ...newAdminData,
                          password: e.target.value
                        })} placeholder="Temporary password" />
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
                </CardContent>
              </Card>
            </div>
          </div>}

        {/* Enhanced Users Tab */}
        {activeTab === "users" && <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">User Management</h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Manage user accounts and permissions
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => exportData('Users')} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Users
                </Button>
                <Dialog open={showAddAdmin} onOpenChange={setShowAddAdmin}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Admin
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    {/* Same admin creation dialog content */}
                    <DialogHeader>
                      <DialogTitle>Create New Admin Account</DialogTitle>
                      <DialogDescription>
                        Create a new admin account for team members.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Full Name</label>
                        <Input value={newAdminData.fullName} onChange={e => setNewAdminData({
                      ...newAdminData,
                      fullName: e.target.value
                    })} placeholder="Enter full name" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <Input type="email" value={newAdminData.email} onChange={e => setNewAdminData({
                      ...newAdminData,
                      email: e.target.value
                    })} placeholder="Enter email address" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Temporary Password</label>
                        <div className="flex gap-2">
                          <Input value={newAdminData.password} onChange={e => setNewAdminData({
                        ...newAdminData,
                        password: e.target.value
                      })} placeholder="Temporary password" />
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
            </div>
            
            <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg`}>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Access</TableHead>
                      <TableHead>KPay Info</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(user => <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                              {user.full_name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name}</p>
                              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {user.user_id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={user.has_access ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {user.has_access ? 'Active' : 'Suspended'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.kpay_name ? <div className="text-sm">
                              <p>{user.kpay_name}</p>
                              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{user.kpay_phone}</p>
                            </div> : <span className={darkMode ? 'text-gray-500' : 'text-gray-500'}>Not provided</span>}
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {user.role !== 'admin' && <div className="flex gap-2">
                              <Button size="sm" variant={user.has_access ? "destructive" : "default"} onClick={() => handleSuspendUser(user.user_id, user.has_access)}>
                                {user.has_access ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </Button>
                            </div>}
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>}

        {/* Enhanced Tasks Tab */}
        {activeTab === "tasks" && <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Task Management</h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Monitor and manage all user tasks
                </p>
              </div>
              <Button onClick={() => exportData('Tasks')} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Tasks
              </Button>
            </div>

            {/* Task Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[{
            title: "Total Tasks",
            value: stats.totalTasks,
            icon: FileText,
            color: "blue"
          }, {
            title: "Active",
            value: stats.activeTasks,
            icon: Activity,
            color: "green"
          }, {
            title: "Completed",
            value: stats.completedTasks,
            icon: CheckCircle,
            color: "emerald"
          }, {
            title: "Overdue",
            value: stats.overdueTasks,
            icon: AlertTriangle,
            color: "red"
          }].map((stat, index) => <Card key={index} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-md`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{stat.title}</p>
                        <p className="text-xl font-bold">{stat.value}</p>
                      </div>
                      <stat.icon className={`w-6 h-6 text-${stat.color}-500`} />
                    </div>
                  </CardContent>
                </Card>)}
            </div>
            
            <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg`}>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task Name</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Words</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Deposit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map(task => <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.task_name}</TableCell>
                        <TableCell>
                          {users.find(u => u.user_id === task.user_id)?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell>{task.word_count?.toLocaleString()}</TableCell>
                        <TableCell>{task.duration_days} days</TableCell>
                        <TableCell>{task.deposit_amount?.toLocaleString()} MMK</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(task.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>}

        {/* Enhanced Deposits Tab */}
        {activeTab === "deposits" && <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Payment Management</h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Review and process deposit payments
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => exportData('Payments')} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Payments
                </Button>
                <Button onClick={loadDeposits} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
            
            <div className="grid gap-4">
              {filteredDeposits.map(deposit => <Card key={deposit.id} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg hover:shadow-xl transition-shadow`}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{deposit.user?.full_name}</h4>
                            <Badge className={getStatusColor(deposit.payment_status)}>
                              {deposit.payment_status}
                            </Badge>
                          </div>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                            {deposit.task?.task_name}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            Submitted: {new Date(deposit.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Amount:</span>
                            <span className="font-medium">{deposit.amount?.toLocaleString()} MMK</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Code:</span>
                            <span className="font-mono text-sm">{deposit.payment_code || 'N/A'}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Duration:</span>
                            <span className="font-medium">{deposit.task?.duration_days} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Words:</span>
                            <span className="font-medium">{deposit.task?.word_count?.toLocaleString()}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          {deposit.reviewed_at && <div className="flex justify-between">
                              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Reviewed:</span>
                              <span className="text-sm">{new Date(deposit.reviewed_at).toLocaleDateString()}</span>
                            </div>}
                          {deposit.admin_notes && <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Note: {deposit.admin_notes}
                            </p>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {deposit.screenshot_url && <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-2" />
                                Screenshot
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Payment Screenshot</DialogTitle>
                              </DialogHeader>
                              <div className="flex justify-center">
                                <img src={deposit.screenshot_url} alt="Payment screenshot" className="max-w-full max-h-96 rounded-lg shadow-lg" />
                              </div>
                            </DialogContent>
                          </Dialog>}
                        
                        {deposit.payment_status === 'pending' && <div className="flex gap-2">
                            <Button onClick={() => handleApproveDeposit(deposit.id)} size="sm" className="bg-green-600 hover:bg-green-700">
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
                                  <DialogTitle>Reject Payment</DialogTitle>
                                  <DialogDescription>
                                    Please provide a reason for rejecting this payment.
                                  </DialogDescription>
                                </DialogHeader>
                                <Textarea placeholder="Enter rejection reason..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
                                <div className="flex justify-end gap-2">
                                  <Button onClick={() => handleRejectDeposit(deposit.id, rejectionReason)} variant="destructive">
                                    Reject Payment
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>)}
            </div>
          </div>}

        {/* Refunds Tab */}
        {activeTab === "refunds" && <RefundMenu />}

        {/* Enhanced Reports Tab */}
        {activeTab === "reports" && <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Reports & Analytics</h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Comprehensive business insights and data export
                </p>
              </div>
              <div className="flex gap-2">
                {['daily', 'weekly', 'monthly', 'yearly'].map(period => 
                    <Button key={period} onClick={() => exportData('CSV', period)} variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      {period.charAt(0).toUpperCase() + period.slice(1)} CSV
                    </Button>
                )}
              </div>
            </div>
            
            {/* Real-Time Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[{
            title: "Total Users",
            value: stats.error ? "⚠️ Error" : stats.totalUsers,
            icon: Users,
            color: stats.error ? "red" : "blue"
          }, {
            title: "Active Tasks",
            value: stats.error ? "⚠️ Error" : stats.activeTasks,
            icon: Activity,
            color: stats.error ? "red" : "green"
          }, {
            title: "Completed Tasks",
            value: stats.error ? "⚠️ Error" : stats.completedTasks,
            icon: CheckCircle,
            color: stats.error ? "red" : "emerald"
          }, {
            title: "Total Payments",
            value: stats.error ? "⚠️ Error" : stats.totalPayments,
            icon: CreditCard,
            color: stats.error ? "red" : "purple"
          }, {
            title: "Pending Deposits",
            value: stats.error ? "⚠️ Error" : stats.pendingPayments,
            icon: Clock,
            color: stats.error ? "red" : "yellow"
          }, {
            title: "Refunds Issued",
            value: stats.error ? "⚠️ Error" : stats.refundsToday,
            icon: ArrowDownLeft,
            color: stats.error ? "red" : "orange"
          }, {
            title: "Tasks Today",
            value: stats.error ? "⚠️ Error" : stats.tasksToday,
            icon: Calendar,
            color: stats.error ? "red" : "indigo"
          }, {
            title: "New Users Today",
            value: stats.error ? "⚠️ Error" : stats.newUsersToday,
            icon: UserCheck,
            color: stats.error ? "red" : "cyan"
          }].map((stat, index) => <Card key={index} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-md hover:shadow-lg transition-shadow`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{stat.title}</p>
                        <p className="text-lg font-bold">{stat.value}</p>
                        {stats.lastSynced && !stats.error && <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {new Date(stats.lastSynced).toLocaleTimeString()}
                          </p>}
                      </div>
                      <stat.icon className={`w-6 h-6 text-${stat.color}-500`} />
                    </div>
                  </CardContent>
                </Card>)}
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg`}>
                <CardHeader>
                  <CardTitle>Revenue Analytics</CardTitle>
                  <CardDescription>Financial performance and profit calculation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                      <DollarSign className="w-12 h-12 mx-auto text-green-600 mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                      <p className="text-3xl font-bold text-green-600">{stats.error ? "Error" : `${stats.totalRevenue.toLocaleString()} MMK`}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Net Profit</p>
                        <p className="text-xl font-bold text-blue-600">{stats.error ? "Error" : `${stats.totalProfit.toLocaleString()} MMK`}</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Profit Margin</p>
                        <p className="text-xl font-bold text-purple-600">
                          {stats.error ? "Error" : `${stats.totalRevenue > 0 ? Math.round(stats.totalProfit / stats.totalRevenue * 100) : 0}%`}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg`}>
                <CardHeader>
                  <CardTitle>Key Performance Indicators</CardTitle>
                  <CardDescription>Real-time business metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[{
                label: "Active Users",
                value: stats.error ? "Error" : stats.activeUsers,
                icon: UserCheck,
                color: "green"
              }, {
                label: "Task Completion Rate",
                value: stats.error ? "Error" : `${stats.avgTaskCompletion}%`,
                icon: Target,
                color: "blue"
              }, {
                label: "Payment Success Rate",
                value: stats.error ? "Error" : `${Math.round(stats.verifiedPayments / (stats.totalPayments || 1) * 100)}%`,
                icon: CheckCircle,
                color: "emerald"
              }, {
                label: "Daily Revenue",
                value: stats.error ? "Error" : `${Math.round(stats.totalRevenue / 30).toLocaleString()} MMK`,
                icon: TrendingUp,
                color: "purple"
              }].map((metric, index) => <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <metric.icon className={`w-5 h-5 text-${metric.color}-500`} />
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{metric.label}</span>
                      </div>
                      <span className="font-semibold">{metric.value}</span>
                    </div>)}
                </CardContent>
              </Card>
            </div>

            {/* Summary Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg`}>
                <CardHeader>
                  <CardTitle>Payment Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[{
                  label: "Total Payments",
                  value: stats.totalPayments,
                  color: "blue"
                }, {
                  label: "Verified",
                  value: stats.verifiedPayments,
                  color: "green"
                }, {
                  label: "Pending",
                  value: stats.pendingPayments,
                  color: "yellow"
                }, {
                  label: "Rejected",
                  value: stats.rejectedPayments,
                  color: "red"
                }].map((item, index) => <div key={index} className="flex justify-between items-center">
                        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.label}</span>
                        <Badge className={getStatusColor(item.color === 'green' ? 'verified' : item.color === 'yellow' ? 'pending' : item.color === 'red' ? 'rejected' : 'active')}>
                          {item.value}
                        </Badge>
                      </div>)}
                  </div>
                </CardContent>
              </Card>

              <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg`}>
                <CardHeader>
                  <CardTitle>User Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[{
                  label: "Total Users",
                  value: stats.totalUsers
                }, {
                  label: "Active Users",
                  value: stats.activeUsers
                }, {
                  label: "New Today",
                  value: stats.newUsersToday
                }, {
                  label: "Top Performers",
                  value: stats.topPerformers
                }].map((item, index) => <div key={index} className="flex justify-between">
                        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.label}</span>
                        <span className="font-semibold">{item.value}</span>
                      </div>)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>}

        {/* Settings Tab */}
        {activeTab === "settings" && <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">System Settings</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Configure system preferences and policies
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg`}>
                <CardHeader>
                  <CardTitle>Platform Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Maintenance Mode</label>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Temporarily disable user access
                      </p>
                    </div>
                    <Switch />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">New User Registration</label>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Allow new users to register
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Auto-approve Payments</label>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Automatically verify small payments
                      </p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>

              <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg`}>
                <CardHeader>
                  <CardTitle>Business Rules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Default Task Rate (per word)</label>
                    <Input className="mt-1" placeholder="30 MMK" />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Maximum Task Duration (days)</label>
                    <Input className="mt-1" placeholder="30" />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Minimum Deposit Amount</label>
                    <Input className="mt-1" placeholder="10,000 MMK" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg`}>
              <CardHeader>
                <CardTitle>Database Management</CardTitle>
                <CardDescription>Backup and maintenance operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Backup Database
                  </Button>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export All Data
                  </Button>
                  <Button variant="destructive">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset System
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>}
      </div>
    </div>;
};
export default AdminDashboard;