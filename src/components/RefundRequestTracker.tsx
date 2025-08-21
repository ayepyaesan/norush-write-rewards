import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle, DollarSign, AlertTriangle } from "lucide-react";

interface RefundRequest {
  id: string;
  user_id: string;
  task_id: string;
  milestone_id: string;
  amount: number;
  status: string;
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  task: {
    task_name: string;
  };
  milestone: {
    day_number: number;
    target_date: string;
  };
  user: {
    full_name: string;
    kpay_name: string | null;
    kpay_phone: string | null;
  };
}

interface RefundRequestTrackerProps {
  isAdmin?: boolean;
  userId?: string;
}

const RefundRequestTracker = ({ isAdmin = false, userId }: RefundRequestTrackerProps) => {
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRefundRequests();
    
    // Set up real-time subscription for refund requests
    const channel = supabase
      .channel('refund-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'refund_requests'
        },
        () => {
          fetchRefundRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchRefundRequests = async () => {
    try {
      let query = supabase
        .from('refund_requests')
        .select(`
          *,
          task:tasks(task_name),
          milestone:daily_milestones(day_number, target_date),
          user:profiles(full_name, kpay_name, kpay_phone)
        `)
        .order('created_at', { ascending: false });

      if (!isAdmin && userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRefundRequests((data as any) || []);
    } catch (error) {
      console.error('Error fetching refund requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch refund requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRefundStatus = async (requestId: string, status: string, adminNotes?: string) => {
    try {
      const { error } = await supabase
        .from('refund_requests')
        .update({
          status,
          admin_notes: adminNotes,
          processed_by: isAdmin ? (await supabase.auth.getUser()).data.user?.id : undefined,
          processed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Also update the milestone refund status
      const request = refundRequests.find(r => r.id === requestId);
      if (request) {
        await supabase
          .from('daily_milestones')
          .update({
            refund_status: status === 'refund_sent' ? 'refund_received' : status
          })
          .eq('id', request.milestone_id);
      }

      toast({
        title: "Success",
        description: `Refund request ${status === 'refund_sent' ? 'marked as sent' : 'updated'}`,
      });

      fetchRefundRequests();
    } catch (error) {
      console.error('Error updating refund status:', error);
      toast({
        title: "Error",
        description: "Failed to update refund status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'awaiting_review':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Awaiting Review</Badge>;
      case 'refund_sent':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Refund Sent</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {isAdmin ? 'Refund Requests Management' : 'My Refund Requests'}
        </h3>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-yellow-50">
            Pending: {refundRequests.filter(r => r.status === 'awaiting_review').length}
          </Badge>
          <Badge variant="outline" className="bg-green-50">
            Processed: {refundRequests.filter(r => r.status === 'refund_sent').length}
          </Badge>
        </div>
      </div>

      {refundRequests.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No refund requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {refundRequests.map((request) => (
            <Card key={request.id} className="border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {request.task.task_name} - Day {request.milestone.day_number}
                    </CardTitle>
                    <CardDescription>
                      {isAdmin && `User: ${request.user.full_name} • `}
                      Target Date: {new Date(request.milestone.target_date).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="font-semibold">{request.amount.toLocaleString()} MMK</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Requested: {new Date(request.created_at).toLocaleDateString()}
                  </span>
                </div>

                {isAdmin && (request.user.kpay_name || request.user.kpay_phone) && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm font-medium">KPay Details:</p>
                    <p className="text-sm">Name: {request.user.kpay_name || 'Not provided'}</p>
                    <p className="text-sm">Phone: {request.user.kpay_phone || 'Not provided'}</p>
                  </div>
                )}

                {request.admin_notes && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Admin Notes:</p>
                    <p className="text-sm text-blue-800">{request.admin_notes}</p>
                  </div>
                )}

                {isAdmin && request.status === 'awaiting_review' && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => updateRefundStatus(request.id, 'refund_sent', 'Refund processed via KPay')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Mark Refund Sent
                    </Button>
                  </div>
                )}

                {request.processed_at && (
                  <p className="text-xs text-muted-foreground">
                    Processed: {new Date(request.processed_at).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RefundRequestTracker;