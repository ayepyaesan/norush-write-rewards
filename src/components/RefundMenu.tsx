import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Filter, CheckCircle, Clock, Banknote, User, FileText, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RefundEntry {
  id: string;
  user_id: string;
  task_id: string;
  milestone_id: string;
  amount: number;
  status: string;
  created_at: string;
  processed_at: string | null;
  admin_notes: string | null;
  // Related data
  user_name: string;
  task_name: string;
  task_status: string;
  kpay_name: string | null;
  kpay_phone: string | null;
  day_number: number;
  target_date: string;
  words_written: number;
  required_words: number;
  task_file_title: string | null;
}

const RefundMenu = () => {
  const [refunds, setRefunds] = useState<RefundEntry[]>([]);
  const [filteredRefunds, setFilteredRefunds] = useState<RefundEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRefunds();
    setupRealtimeSubscription();
  }, []);

  useEffect(() => {
    filterRefunds();
  }, [refunds, searchQuery, statusFilter]);

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('refund-requests-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'refund_requests'
      }, () => {
        loadRefunds();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  const loadRefunds = async () => {
    try {
      setLoading(true);
      
      // Step 1: Fetch refund requests
      const { data: refundRequests, error: refundError } = await supabase
        .from('refund_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (refundError) {
        console.error('Refund requests error:', refundError);
        throw new Error(`Failed to fetch refund requests: ${refundError.message}`);
      }

      if (!refundRequests || refundRequests.length === 0) {
        setRefunds([]);
        return;
      }

      // Step 2: Get unique user IDs, task IDs, and milestone IDs
      const userIds = [...new Set(refundRequests.map(r => r.user_id))];
      const taskIds = [...new Set(refundRequests.map(r => r.task_id))];
      const milestoneIds = [...new Set(refundRequests.map(r => r.milestone_id))];

      // Step 3: Fetch related data in parallel
      const [
        { data: profiles, error: profileError },
        { data: tasks, error: taskError },
        { data: milestones, error: milestoneError },
        { data: taskFiles, error: fileError }
      ] = await Promise.all([
        supabase.from('profiles').select('*').in('user_id', userIds),
        supabase.from('tasks').select('*').in('id', taskIds),
        supabase.from('daily_milestones').select('*').in('id', milestoneIds),
        supabase.from('task_files').select('*').in('task_id', taskIds)
      ]);

      // Check for errors but don't fail completely
      if (profileError) console.warn('Profile fetch error:', profileError);
      if (taskError) console.warn('Task fetch error:', taskError);
      if (milestoneError) console.warn('Milestone fetch error:', milestoneError);
      if (fileError) console.warn('Task file fetch error:', fileError);

      // Step 4: Create lookup maps for efficient data joining
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const taskMap = new Map((tasks || []).map(t => [t.id, t]));
      const milestoneMap = new Map((milestones || []).map(m => [m.id, m]));
      const fileMap = new Map((taskFiles || []).map(f => [f.task_id, f]));

      // Step 5: Transform data with comprehensive error handling
      const refundsWithDetails: RefundEntry[] = refundRequests.map(refund => {
        const profile = profileMap.get(refund.user_id);
        const task = taskMap.get(refund.task_id);
        const milestone = milestoneMap.get(refund.milestone_id);
        const taskFile = fileMap.get(refund.task_id);
        
        // Enhanced error handling with detailed fallbacks
        const taskName = task?.task_name || `Unknown Task (${refund.task_id?.slice(0, 8)}...)`;
        const userName = profile?.full_name || `Unknown User (${refund.user_id?.slice(0, 8)}...)`;
        
        // Calculate task status with null safety
        const wordsWritten = milestone?.words_written || taskFile?.word_count || 0;
        const requiredWords = milestone?.required_words || 0;
        const taskStatus = requiredWords > 0 && wordsWritten >= requiredWords ? 'Target Met' : 'Pending';
        
        return {
          id: refund.id,
          user_id: refund.user_id,
          task_id: refund.task_id,
          milestone_id: refund.milestone_id,
          amount: refund.amount || 0,
          status: refund.status || 'awaiting_review',
          created_at: refund.created_at,
          processed_at: refund.processed_at,
          admin_notes: refund.admin_notes,
          user_name: userName,
          task_name: taskName,
          task_status: taskStatus,
          kpay_name: profile?.kpay_name || null,
          kpay_phone: profile?.kpay_phone || null,
          day_number: milestone?.day_number || 0,
          target_date: milestone?.target_date || '',
          words_written: wordsWritten,
          required_words: requiredWords,
          task_file_title: taskFile?.title || null
        };
      });

      setRefunds(refundsWithDetails);
    } catch (error) {
      console.error('Error loading refunds:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load refund data';
      toast({
        title: "Database Error",
        description: errorMessage,
        variant: "destructive"
      });
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  const filterRefunds = () => {
    let filtered = refunds;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(refund =>
        refund.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        refund.task_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        refund.kpay_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(refund => refund.status === statusFilter);
    }

    setFilteredRefunds(filtered);
  };

  const handleStatusUpdate = async (refundId: string, newStatus: string, notes?: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        processed_at: newStatus === 'approved' || newStatus === 'rejected' ? new Date().toISOString() : null
      };

      if (notes) {
        updateData.admin_notes = notes;
      }

      const { error } = await supabase
        .from('refund_requests')
        .update(updateData)
        .eq('id', refundId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Refund ${newStatus} successfully`,
        variant: "default"
      });

      loadRefunds();
    } catch (error) {
      console.error('Error updating refund status:', error);
      toast({
        title: "Error",
        description: "Failed to update refund status",
        variant: "destructive"
      });
    }
  };

  const handleMarkReceived = async (refundId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('complete_refund', {
        p_refund_request_id: refundId,
        p_admin_user_id: user.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Refund marked as received and user balance updated",
        variant: "default"
      });

      loadRefunds();
    } catch (error) {
      console.error('Error marking refund as received:', error);
      toast({
        title: "Error",
        description: "Failed to mark refund as received",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      awaiting_review: { label: "Awaiting Review", className: "bg-yellow-100 text-yellow-800" },
      approved: { label: "Refund Sent", className: "bg-blue-100 text-blue-800" },
      completed: { label: "Refund Received", className: "bg-green-100 text-green-800" },
      rejected: { label: "Rejected", className: "bg-red-100 text-red-800" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, className: "bg-gray-100 text-gray-800" };
    
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const calculateDailyRefund = (depositAmount: number, durationDays: number) => {
    return Math.floor(depositAmount / durationDays);
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} MMK`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground ml-4">Loading refund data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Refund Management</h1>
          <p className="text-muted-foreground">Track and manage daily refund requests</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            <Banknote className="w-4 h-4 mr-1" />
            {filteredRefunds.length} Total Refunds
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by user name, task name, or KPay account..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="awaiting_review">Awaiting Review</SelectItem>
                <SelectItem value="approved">Refund Sent</SelectItem>
                <SelectItem value="completed">Refund Received</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Refund Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Refund Requests
          </CardTitle>
          <CardDescription>
            Daily refund tracking with automatic calculations (10 MMK per word rate)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Task Details</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Refund Amount</TableHead>
                  <TableHead>KPay Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRefunds.map((refund) => (
                  <TableRow key={refund.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{refund.user_name}</div>
                        </div>
                      </div>
                    </TableCell>
                     <TableCell>
                       <div>
                         <div className="font-medium text-foreground" title={refund.task_name}>
                           {refund.task_name}
                         </div>
                         <div className="text-sm text-muted-foreground">
                           Day {refund.day_number} • {refund.task_status}
                         </div>
                         <div className="text-xs text-blue-600 mt-1">
                           Task File: {refund.task_file_title || 'No file found'}
                         </div>
                         {refund.task_name.includes('Unknown Task') && (
                           <div className="text-xs text-orange-600 mt-1">
                             ⚠️ Task data missing
                           </div>
                         )}
                       </div>
                     </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          {refund.words_written}/{refund.required_words} words
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${Math.min(100, (refund.words_written / refund.required_words) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-green-600">
                        {formatCurrency(refund.amount)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{refund.kpay_name || 'Not provided'}</div>
                        <div className="text-muted-foreground">{refund.kpay_phone || 'No phone'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(refund.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(refund.created_at)}</div>
                        {refund.processed_at && (
                          <div className="text-muted-foreground">
                            Processed: {formatDate(refund.processed_at)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {refund.status === 'awaiting_review' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(refund.id, 'approved')}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Send Refund
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusUpdate(refund.id, 'rejected', 'Requirements not met')}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {refund.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkReceived(refund.id)}
                            className="bg-green-50 hover:bg-green-100 text-green-700"
                          >
                            Mark Received
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredRefunds.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Banknote className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No refund requests found</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="text-sm text-muted-foreground">Awaiting Review</div>
                <div className="text-2xl font-bold">
                  {refunds.filter(r => r.status === 'awaiting_review').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-sm text-muted-foreground">Refunds Received</div>
                <div className="text-2xl font-bold">
                  {refunds.filter(r => r.status === 'completed').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <div className="text-sm text-muted-foreground">Total Amount</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(refunds.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.amount, 0))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RefundMenu;