import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Banknote, Calendar, FileText, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RefundHistoryEntry {
  id: string;
  task_id: string;
  day_number: number;
  refund_amount: number;
  status: string;
  processed_at: string | null;
  created_at: string;
  task_name: string;
}

interface RefundHistoryProps {
  userId: string;
}

const RefundHistory = ({ userId }: RefundHistoryProps) => {
  const [refundHistory, setRefundHistory] = useState<RefundHistoryEntry[]>([]);
  const [totalRefundEarned, setTotalRefundEarned] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRefundHistory();
    loadUserProfile();
    setupRealtimeSubscription();
  }, [userId]);

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('refund-history-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'refund_history',
        filter: `user_id=eq.${userId}`
      }, () => {
        loadRefundHistory();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'refund_requests',
        filter: `user_id=eq.${userId}`
      }, () => {
        loadRefundHistory();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${userId}`
      }, () => {
        loadUserProfile();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  const loadUserProfile = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_refund_earned')
        .eq('user_id', userId)
        .single();

      setTotalRefundEarned(profile?.total_refund_earned || 0);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadRefundHistory = async () => {
    try {
      setLoading(true);
      
      // Get refund history
      const { data: refunds, error } = await supabase
        .from('refund_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get pending/approved refund requests (but NOT completed ones - those are in refund_history)
      const { data: pendingRefunds, error: pendingError } = await supabase
        .from('refund_requests')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['awaiting_review', 'approved'])
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      // Combine both arrays - refund_history contains completed refunds, refund_requests contains pending/approved
      const allRefunds = [...(refunds || []), ...(pendingRefunds || [])];

      if (allRefunds.length === 0) {
        setRefundHistory([]);
        return;
      }

      // Get task names
      const taskIds = [...new Set(allRefunds.map(r => r.task_id))];
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, task_name')
        .in('id', taskIds);

      // Get milestone data for pending refunds
      const milestoneIds = pendingRefunds?.map(r => r.milestone_id).filter(Boolean) || [];
      const { data: milestones } = milestoneIds.length > 0 
        ? await supabase
            .from('daily_milestones')
            .select('id, day_number')
            .in('id', milestoneIds)
        : { data: [] };

      // Combine data
      const refundsWithTaskNames: RefundHistoryEntry[] = allRefunds.map(refund => {
        // Check if this is a refund_request (has milestone_id) or refund_history (has day_number)
        const isRefundRequest = 'milestone_id' in refund;
        const milestone = isRefundRequest ? milestones?.find(m => m.id === (refund as any).milestone_id) : null;
        const dayNumber = isRefundRequest ? (milestone?.day_number || 1) : (refund as any).day_number;
        const amount = isRefundRequest ? (refund as any).amount : (refund as any).refund_amount;
        
        return {
          id: refund.id,
          task_id: refund.task_id,
          day_number: dayNumber,
          refund_amount: amount,
          status: refund.status, // Keep original status - don't modify it
          processed_at: refund.processed_at,
          created_at: refund.created_at,
          task_name: tasks?.find(t => t.id === refund.task_id)?.task_name || 'Unknown Task'
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRefundHistory(refundsWithTaskNames);
    } catch (error) {
      console.error('Error loading refund history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} MMK`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      received: { label: "Received", className: "bg-green-100 text-green-800" },
      awaiting_review: { label: "Awaiting Review", className: "bg-yellow-100 text-yellow-800" },
      approved: { label: "Sent (Pending Transfer)", className: "bg-blue-100 text-blue-800" },
      completed: { label: "Received", className: "bg-green-100 text-green-800" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      label: status, 
      className: "bg-gray-100 text-gray-800" 
    };
    
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total Refund Earned Card */}
      <Card className="gradient-card border-0 shadow-warm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Refund Earned</CardTitle>
          <Coins className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(totalRefundEarned)}
          </div>
          <p className="text-xs text-muted-foreground">
            Accumulated from {refundHistory.filter(r => r.status === 'received' || r.status === 'completed').length} completed refunds
          </p>
        </CardContent>
      </Card>

      {/* Refund History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Refund History
          </CardTitle>
          <CardDescription>
            Detailed breakdown of your refund transactions by task and day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Task Name</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Refund Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refundHistory.map((refund) => (
                  <TableRow key={refund.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div className="text-sm">
                          {formatDate(refund.processed_at || refund.created_at)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{refund.task_name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          Day {refund.day_number}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Banknote className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-600">
                          {formatCurrency(refund.refund_amount)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(refund.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {refundHistory.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Banknote className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No refund history found</p>
                <p className="text-sm">Complete your daily writing goals to start earning refunds!</p>
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
              <Banknote className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-sm text-muted-foreground">Received Refunds</div>
                <div className="text-2xl font-bold">
                  {refundHistory.filter(r => r.status === 'received' || r.status === 'completed').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="text-sm text-muted-foreground">Pending Review</div>
                <div className="text-2xl font-bold">
                  {refundHistory.filter(r => r.status === 'awaiting_review').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Coins className="w-5 h-5 text-primary" />
              <div>
                <div className="text-sm text-muted-foreground">Average Refund</div>
                <div className="text-2xl font-bold">
                  {refundHistory.length > 0 
                    ? formatCurrency(Math.round(refundHistory.reduce((sum, r) => sum + r.refund_amount, 0) / refundHistory.length))
                    : formatCurrency(0)
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RefundHistory;