
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Users, Target, TrendingUp, Calendar, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface AdminStats {
  totalUsers: number;
  activeTasks: number;
  completionRate: number;
  totalRevenue: number;
}

interface WeeklyStats {
  tasksCreated: number;
  completionRate: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeTasks: 0,
    completionRate: 0,
    totalRevenue: 0
  });
  
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    tasksCreated: 0,
    completionRate: 0
  });
  
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    try {
      console.log('Loading admin dashboard stats...');
      
      // Get total users
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) {
        console.error('Error fetching users count:', usersError);
        throw usersError;
      }

      // Get active tasks count
      const { count: activeTasksCount, error: tasksError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (tasksError) {
        console.error('Error fetching active tasks:', tasksError);
        throw tasksError;
      }

      // Get completion rate data
      const { data: completedTasks, error: completedError } = await supabase
        .from('tasks')
        .select('id')
        .eq('status', 'completed');

      const { data: allTasks, error: allTasksError } = await supabase
        .from('tasks')
        .select('id');

      if (completedError || allTasksError) {
        console.error('Error fetching completion data:', completedError || allTasksError);
        throw completedError || allTasksError;
      }

      const completionRate = allTasks?.length ? 
        Math.round((completedTasks?.length || 0) / allTasks.length * 100) : 0;

      const newStats = {
        totalUsers: usersCount || 0,
        activeTasks: activeTasksCount || 0,
        completionRate,
        totalRevenue: 0 // Placeholder for revenue calculation
      };

      console.log('Loaded stats:', newStats);
      setStats(newStats);
      setLastSync(new Date());
    } catch (error) {
      console.error('Error loading admin stats:', error);
      toast.error('Failed to load dashboard stats');
    }
  };

  const loadWeeklyStats = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get tasks created in last 7 days
      const { count: tasksCreated, error: tasksError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      if (tasksError) {
        console.error('Error fetching weekly tasks:', tasksError);
        throw tasksError;
      }

      // Get completion rate for last 7 days
      const { data: weeklyCompleted, error: completedError } = await supabase
        .from('tasks')
        .select('id')
        .eq('status', 'completed')
        .gte('created_at', sevenDaysAgo.toISOString());

      const { data: weeklyAllTasks, error: allError } = await supabase
        .from('tasks')
        .select('id')
        .gte('created_at', sevenDaysAgo.toISOString());

      if (completedError || allError) {
        console.error('Error fetching weekly completion data:', completedError || allError);
        throw completedError || allError;
      }

      const weeklyCompletionRate = weeklyAllTasks?.length ? 
        Math.round((weeklyCompleted?.length || 0) / weeklyAllTasks.length * 100) : 0;

      setWeeklyStats({
        tasksCreated: tasksCreated || 0,
        completionRate: weeklyCompletionRate
      });
    } catch (error) {
      console.error('Error loading weekly stats:', error);
      toast.error('Failed to load weekly stats');
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      await Promise.all([loadStats(), loadWeeklyStats()]);
      setIsLoading(false);
    };

    initializeData();

    // Set up real-time subscriptions
    const profilesChannel = supabase
      .channel('profiles_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadStats();
      })
      .subscribe();

    const tasksChannel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadStats();
        loadWeeklyStats();
      })
      .subscribe();

    const milestonesChannel = supabase
      .channel('milestones_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_milestones' }, () => {
        loadWeeklyStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(milestonesChannel);
    };
  }, []);

  const handleRefresh = () => {
    loadStats();
    loadWeeklyStats();
    toast.success('Dashboard refreshed');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor platform activity and user engagement
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastSync && (
            <p className="text-sm text-muted-foreground">
              Last updated: {lastSync.toLocaleTimeString()}
            </p>
          )}
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : stats.totalUsers}
                </div>
                <p className="text-xs text-muted-foreground">
                  Registered users on platform
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : stats.activeTasks}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently active writing tasks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : `${stats.completionRate}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Overall task completion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Weekly Activity</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : weeklyStats.tasksCreated}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tasks created (last 7 days)
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Tasks Created (7 days)</span>
                  <Badge variant="secondary">{weeklyStats.tasksCreated}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Weekly Completion Rate</span>
                  <Badge variant={weeklyStats.completionRate > 70 ? "default" : "secondary"}>
                    {weeklyStats.completionRate}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Database Connection</span>
                  <Badge variant="default">Online</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Real-time Sync</span>
                  <Badge variant="default">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">User management features coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Active Tasks</span>
                <Badge variant="default">{stats.activeTasks}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Completion Rate</span>
                <Badge variant={stats.completionRate > 70 ? "default" : "secondary"}>
                  {stats.completionRate}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Summary (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{weeklyStats.tasksCreated}</div>
                  <div className="text-sm text-muted-foreground">Tasks Created</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{weeklyStats.completionRate}%</div>
                  <div className="text-sm text-muted-foreground">Completion Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
