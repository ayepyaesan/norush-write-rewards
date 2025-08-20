import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";


const Workspace = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState("user");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [kpayName, setKpayName] = useState("");
  const [kpayPhone, setKpayPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignUp) {
      setIsLoading(true);
      
      try {
        // Validate required fields for users
        if (role === "user" && (!kpayName.trim() || !kpayPhone.trim())) {
          toast({
            title: "Missing Information",
            description: "Please fill in all payment information fields.",
            variant: "destructive",
          });
          return;
        }

        const { error } = await supabase
          .from('signup_requests')
          .insert({
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            password: password,
            role: role,
            kpay_name: role === "user" ? kpayName.trim() : null,
            kpay_phone: role === "user" ? kpayPhone.trim() : null,
          });

        if (error) {
          if (error.code === '23505') {
            toast({
              title: "Email Already Exists",
              description: "An account with this email already exists.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: "Failed to create account. Please try again.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Account Created!",
            description: "Your account request has been submitted successfully.",
          });
          
          // Reset form
          setFullName("");
          setEmail("");
          setPassword("");
          setKpayName("");
          setKpayPhone("");
          setRole("user");
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Handle sign in (placeholder for now)
      toast({
        title: "Welcome back!",
        description: "Sign in functionality will be implemented soon.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back button */}
        <Link 
          to="/" 
          className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors duration-300 mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <Card className="gradient-card border-0 shadow-warm">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full gradient-warm flex items-center justify-center shadow-warm">
              <span className="text-2xl font-bold text-primary-foreground">NR</span>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Welcome to NoRush
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isSignUp 
                ? "Create your account to start your writing journey" 
                : "Sign in to continue your writing journey"
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={isSignUp ? "signup" : "signin"} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger 
                  value="signin" 
                  onClick={() => setIsSignUp(false)}
                  className="data-[state=active]:gradient-warm"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  onClick={() => setIsSignUp(true)}
                  className="data-[state=active]:gradient-warm"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      required
                      className="transition-all duration-300 focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      className="transition-all duration-300 focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <Button type="submit" className="w-full gradient-warm hover-lift">
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="transition-all duration-300 focus:ring-2 focus:ring-primary/50">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            User
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center">
                            <Shield className="w-4 h-4 mr-2" />
                            Admin
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullname">Full Name</Label>
                    <Input
                      id="fullname"
                      type="text"
                      placeholder="Your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="transition-all duration-300 focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="transition-all duration-300 focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="transition-all duration-300 focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  
                  {role === "user" && (
                    <>
                      <div className="pt-4">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Payment Information</h3>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="kpay-name">Kpay Name</Label>
                        <Input
                          id="kpay-name"
                          type="text"
                          placeholder="Your Kpay name"
                          value={kpayName}
                          onChange={(e) => setKpayName(e.target.value)}
                          required
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
                          required
                          className="transition-all duration-300 focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    </>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full gradient-warm hover-lift"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
    </div>
  );
};

export default Workspace;