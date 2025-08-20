import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Copy, Upload, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Payment = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [task, setTask] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const merchantPhone = "09250915925";
  const merchantName = "NoRush";

  useEffect(() => {
    fetchTaskData();
  }, [taskId]);

  const fetchTaskData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/workspace");
        return;
      }

      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', user.id)
        .single();

      if (taskError || !taskData) {
        toast({
          title: "Task Not Found",
          description: "The requested task could not be found.",
          variant: "destructive",
        });
        navigate("/workspace");
        return;
      }

      setTask(taskData);

      // Check if payment exists
      const { data: paymentData } = await supabase
        .from('payments')
        .select('*')
        .eq('task_id', taskId)
        .single();

      if (paymentData) {
        setPayment(paymentData);
        if (paymentData.screenshot_url) {
          setCurrentStep(4);
        } else {
          setCurrentStep(3);
        }
      } else {
        // Create payment record
        const { data: newPayment, error: paymentError } = await supabase
          .from('payments')
          .insert({
            task_id: taskId,
            user_id: user.id,
            amount: taskData.deposit_amount,
            merchant_phone: merchantPhone,
            payment_code: `NR${Date.now()}`,
          })
          .select()
          .single();

        if (!paymentError) {
          setPayment(newPayment);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load task data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(merchantPhone);
    toast({
      title: "Copied!",
      description: "Merchant phone number copied to clipboard.",
    });
  };

  const handleDownloadQR = () => {
    // Create a simple QR code URL (in real app, use proper QR generation)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${merchantPhone}_${payment?.amount}`;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = 'norush-payment-qr.png';
    link.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${taskId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment_screenshots')
        .upload(fileName, file);

      if (uploadError) {
        toast({
          title: "Upload Failed",
          description: "Failed to upload screenshot. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('payment_screenshots')
        .getPublicUrl(fileName);

      // Update payment record
      const { error: updateError } = await supabase
        .from('payments')
        .update({ screenshot_url: publicUrl })
        .eq('id', payment?.id);

      if (updateError) {
        toast({
          title: "Error",
          description: "Failed to save screenshot URL.",
          variant: "destructive",
        });
        return;
      }

      setPayment({ ...payment, screenshot_url: publicUrl });
      toast({
        title: "Success!",
        description: "Screenshot uploaded successfully.",
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate("/dashboard");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full gradient-warm animate-pulse mb-4"></div>
          <p className="text-muted-foreground">Loading payment details...</p>
        </div>
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

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/task-creation" 
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors duration-300 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Task Creation
          </Link>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-6">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    step < currentStep ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Payment Calculation Display */}
        {currentStep === 1 && (
          <Card className="gradient-card border-0 shadow-warm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Payment Summary</CardTitle>
              <CardDescription>Review your task details and deposit amount</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-6 border border-primary/20">
                <h3 className="font-semibold text-lg mb-4">{task?.task_name}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Word Count:</span>
                    <p className="font-medium">{task?.word_count?.toLocaleString()} words</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <p className="font-medium">{task?.duration_days} days</p>
                  </div>
                </div>
                <div className="border-t border-primary/20 mt-4 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Deposit Amount:</span>
                    <span className="text-3xl font-bold text-primary">
                      {task?.deposit_amount?.toLocaleString()} MMK
                    </span>
                  </div>
                </div>
              </div>
              <Button onClick={handleNextStep} className="w-full gradient-warm hover-lift text-lg py-6">
                Proceed to Payment
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: QR Code Display */}
        {currentStep === 2 && (
          <Card className="gradient-card border-0 shadow-warm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Payment QR Code</CardTitle>
              <CardDescription>Scan the QR code or use the merchant details below</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* QR Code Section */}
              <div className="bg-white rounded-lg p-6 text-center border border-primary/20">
                <h3 className="font-bold text-lg text-gray-800 mb-2">{merchantName}</h3>
                <p className="text-gray-600 mb-4">Stress Free Zone</p>
                <p className="text-sm text-gray-500 mb-4">Kpay: {merchantPhone}</p>
                
                {/* QR Code */}
                <div className="w-48 h-48 mx-auto bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center mb-4">
                  <img 
                    src="/lovable-uploads/4db469ad-6f21-4b04-bb74-0957bb54d53f.png"
                    alt="KBZPay QR Code"
                    className="w-44 h-44 object-contain"
                  />
                </div>
                
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={handleDownloadQR} className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download QR
                  </Button>
                  <Button variant="outline" onClick={handleCopyCode} className="flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    Copy Code
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-3">Payment Instructions:</h4>
                <ol className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                    Download QR or copy the merchant code above
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                    Open KBZPay app and select "Scan" option
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                    Scan the QR or manually enter merchant code: {merchantPhone}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                    Pay exactly <strong>{task?.deposit_amount?.toLocaleString()} MMK</strong> and save the transaction screenshot
                  </li>
                </ol>
              </div>

              <Button onClick={handleNextStep} className="w-full gradient-warm hover-lift">
                Next: Upload Screenshot
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Screenshot Upload */}
        {currentStep === 3 && (
          <Card className="gradient-card border-0 shadow-warm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Upload Payment Screenshot</CardTitle>
              <CardDescription>Please upload your transaction screenshot for verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                {!uploadedFile ? (
                  <div>
                    <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-medium text-lg mb-2">Upload Screenshot Here</h3>
                    <p className="text-muted-foreground mb-4">Please upload your payment screenshot</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="screenshot-upload"
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="screenshot-upload"
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg cursor-pointer hover:bg-primary/90 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Choose File
                    </label>
                  </div>
                ) : (
                  <div>
                    {isUploading ? (
                      <div>
                        <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                          <Upload className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-primary font-medium">Please wait a second...</p>
                      </div>
                    ) : (
                      <div>
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-green-600 font-medium">Screenshot uploaded successfully!</p>
                        <p className="text-sm text-muted-foreground mt-2">{uploadedFile.name}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {payment?.screenshot_url && (
                <Button 
                  onClick={handleNextStep} 
                  className="w-full gradient-warm hover-lift"
                  disabled={isUploading}
                >
                  Next: Confirmation
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <Card className="gradient-card border-0 shadow-warm">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-600">Payment Submitted!</CardTitle>
              <CardDescription>Your payment is being verified by our team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
                <h3 className="font-semibold text-lg mb-4">Payment Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Task:</span>
                    <p className="font-medium">{task?.task_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Word Count:</span>
                    <p className="font-medium">{task?.word_count?.toLocaleString()} words</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <p className="font-medium">{task?.deposit_amount?.toLocaleString()} MMK</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-medium text-orange-600">Pending Verification</p>
                  </div>
                </div>
                
                {payment?.screenshot_url && (
                  <div className="mt-4">
                    <span className="text-muted-foreground text-sm">Transaction Screenshot:</span>
                    <div className="mt-2 w-32 h-32 border border-gray-200 rounded-lg overflow-hidden">
                      <img 
                        src={payment.screenshot_url} 
                        alt="Payment Screenshot" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Thank you! Your payment is being verified. You'll receive a notification once approved.
                </p>
                <Button 
                  onClick={() => navigate("/dashboard")} 
                  className="gradient-warm hover-lift px-8"
                >
                  Go to Text Editor
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Payment;