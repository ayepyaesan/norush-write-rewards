import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AccessGateProps {
  taskId: string;
  children: React.ReactNode;
}

const AccessGate = ({ taskId, children }: AccessGateProps) => {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, [taskId]);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/workspace");
        return;
      }

      // Check user profile access
      const { data: profile } = await supabase
        .from('profiles')
        .select('has_access')
        .eq('user_id', user.id)
        .single();

      // Check payment status for this specific task
      const { data: payment } = await supabase
        .from('payments')
        .select('payment_status, admin_notes')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .single();

      setPaymentStatus(payment?.payment_status || 'pending');
      setHasAccess(profile?.has_access && payment?.payment_status === 'approved');
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full gradient-warm animate-pulse mb-4"></div>
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show access denied screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 p-4">
      <div className="max-w-2xl mx-auto pt-20">
        <Card className="gradient-card border-0 shadow-warm">
          <CardHeader className="text-center">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              paymentStatus === 'approved' ? 'bg-green-100' :
              paymentStatus === 'rejected' ? 'bg-red-100' :
              'bg-orange-100'
            }`}>
              {paymentStatus === 'approved' ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : paymentStatus === 'rejected' ? (
                <XCircle className="w-8 h-8 text-red-600" />
              ) : (
                <Clock className="w-8 h-8 text-orange-600" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold">
              {paymentStatus === 'approved' ? 'Access Granted' :
               paymentStatus === 'rejected' ? 'Payment Rejected' :
               'Payment Verification Required'}
            </CardTitle>
            <CardDescription>
              {paymentStatus === 'approved' ? 
                'Your payment has been verified. Refreshing page...' :
               paymentStatus === 'rejected' ? 
                'Your payment was rejected. Please submit a new payment.' :
                'Please complete payment verification to access your task.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={`p-6 rounded-lg border ${
              paymentStatus === 'approved' ? 'bg-green-50 border-green-200' :
              paymentStatus === 'rejected' ? 'bg-red-50 border-red-200' :
              'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                  paymentStatus === 'approved' ? 'text-green-600' :
                  paymentStatus === 'rejected' ? 'text-red-600' :
                  'text-orange-600'
                }`} />
                <div>
                  <h3 className="font-semibold mb-2">
                    {paymentStatus === 'approved' ? 'Welcome!' :
                     paymentStatus === 'rejected' ? 'Payment Issue' :
                     'Verification Pending'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {paymentStatus === 'approved' ? 
                      'Your payment has been approved and you now have full access to the task system.' :
                     paymentStatus === 'rejected' ? 
                      'Your payment submission was rejected by our admin team. Please review and submit a new payment.' :
                      'Your payment screenshot is being reviewed by our admin team. You will be able to start your task once approved.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              {paymentStatus === 'approved' ? (
                <Button 
                  onClick={() => window.location.reload()}
                  className="gradient-warm hover-lift"
                >
                  Continue to Task
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={() => navigate(`/payment/${taskId}`)}
                    className="gradient-warm hover-lift"
                  >
                    {paymentStatus === 'rejected' ? 'Submit New Payment' : 'View Payment Status'}
                  </Button>
                  <Button 
                    onClick={() => navigate("/dashboard")}
                    variant="outline"
                  >
                    Back to Dashboard
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccessGate;