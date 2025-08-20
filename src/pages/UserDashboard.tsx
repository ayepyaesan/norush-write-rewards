import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { User, LogOut, FileText, CreditCard } from "lucide-react";
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

const UserDashboard = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showKpayModal, setShowKpayModal] = useState(false);
  const [kpayName, setKpayName] = useState("");
  const [kpayPhone, setKpayPhone] = useState("");
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

    // Check if Kpay info is missing and user is a 'user' role
    if (profile?.role === 'user' && (!profile.kpay_name || !profile.kpay_phone)) {
      setShowKpayModal(true);
    }
  };

  const handleKpaySubmit = async () => {
    if (!kpayName.trim() || !kpayPhone.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all payment information fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          kpay_name: kpayName.trim(),
          kpay_phone: kpayPhone.trim(),
        })
        .eq('user_id', user?.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update payment information",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Payment information saved successfully!",
        });
        setShowKpayModal(false);
        // Refresh profile
        checkUser();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navigateToTaskCreation = () => {
    navigate("/task-creation");
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
            <h1 className="text-3xl font-bold text-foreground">Welcome back, {profile.full_name}!</h1>
            <p className="text-muted-foreground">Manage your writing tasks and progress</p>
          </div>
          <Button onClick={handleSignOut} variant="outline" className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="gradient-card border-0 shadow-warm hover-lift cursor-pointer" onClick={navigateToTaskCreation}>
            <CardHeader className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full gradient-warm flex items-center justify-center shadow-warm mb-4">
                <FileText className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl">Create New Task</CardTitle>
              <CardDescription>Start a new writing project</CardDescription>
            </CardHeader>
          </Card>

          <Card className="gradient-card border-0 shadow-warm">
            <CardHeader className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full gradient-warm flex items-center justify-center shadow-warm mb-4">
                <User className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl">My Profile</CardTitle>
              <CardDescription>View and edit your information</CardDescription>
            </CardHeader>
          </Card>

          <Card className="gradient-card border-0 shadow-warm">
            <CardHeader className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full gradient-warm flex items-center justify-center shadow-warm mb-4">
                <CreditCard className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl">Payment Info</CardTitle>
              <CardDescription>
                {profile.kpay_name ? "Update payment details" : "Add payment details"}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Profile Summary */}
        <Card className="gradient-card border-0 shadow-warm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                <p className="text-foreground">{profile.full_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                <p className="text-foreground">{user.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Kpay Name</Label>
                <p className="text-foreground">{profile.kpay_name || "Not set"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Kpay Phone</Label>
                <p className="text-foreground">{profile.kpay_phone || "Not set"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kpay Information Modal */}
      <Dialog open={showKpayModal} onOpenChange={setShowKpayModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Payment Information</DialogTitle>
            <DialogDescription>
              Please provide your Kpay details to enable payment processing for your tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kpay-name">Kpay Name</Label>
              <Input
                id="kpay-name"
                type="text"
                placeholder="Your Kpay name"
                value={kpayName}
                onChange={(e) => setKpayName(e.target.value)}
                className="transition-all duration-300 focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kpay-phone">Kpay Phone Number</Label>
              <Input
                id="kpay-phone"
                type="tel"
                placeholder="09xxxxxxxxx"
                value={kpayPhone}
                onChange={(e) => setKpayPhone(e.target.value)}
                className="transition-all duration-300 focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <Button 
              onClick={handleKpaySubmit} 
              className="w-full gradient-warm hover-lift"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Payment Information"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDashboard;