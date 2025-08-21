import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "user";
  redirectTo?: string;
}

const ProtectedRoute = ({ 
  children, 
  requiredRole = "user", 
  redirectTo = "/workspace" 
}: ProtectedRouteProps) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUserAccess();
  }, []);

  const checkUserAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate(redirectTo);
        return;
      }

      // Get user profile to check role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error || !profile) {
        toast({
          title: "Access Error",
          description: "Unable to verify your account. Please try signing in again.",
          variant: "destructive",
        });
        navigate(redirectTo);
        return;
      }

      // Check if user has required role
      if (profile.role !== requiredRole) {
        toast({
          title: "Access Denied",
          description: `You don't have ${requiredRole} privileges to access this page.`,
          variant: "destructive",
        });
        
        // Redirect based on actual role
        if (profile.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/user/dashboard');
        }
        return;
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error('Error checking user access:', error);
      toast({
        title: "Authentication Error",
        description: "Please sign in to continue.",
        variant: "destructive",
      });
      navigate(redirectTo);
    }
  };

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full gradient-warm animate-pulse mb-4"></div>
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
};

export default ProtectedRoute;