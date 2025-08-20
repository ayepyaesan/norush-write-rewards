import { useState } from "react";
import Navigation from "@/components/Navigation";
import AnimatedBackground from "@/components/AnimatedBackground";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MessageCircle, HelpCircle, Send } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from("contact_messages")
        .insert({
          name: formData.name,
          email: formData.email,
          message: formData.message
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Message Sent!",
        description: "We'll get back to you within 24 hours.",
      });
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const faqs = [
    {
      question: "How does the deposit system work?",
      answer: "You make a financial commitment when setting up your writing goal. As you maintain daily consistency, you earn back portions of your deposit. This creates positive reinforcement for building healthy writing habits."
    },
    {
      question: "What happens if I miss a day?",
      answer: "Missing occasional days won't result in losing your entire deposit. Our system is designed to reward overall consistency rather than perfect streaks. You'll receive guidance on getting back on track."
    },
    {
      question: "Is my writing data secure?",
      answer: "Absolutely. All your writing is encrypted and stored securely. We never share your content with third parties, and you maintain full ownership of everything you create."
    },
    {
      question: "Can I change my writing goals?",
      answer: "Yes, you can adjust your goals as needed. We understand that life circumstances change, and our platform is flexible enough to accommodate your evolving needs."
    },
    {
      question: "What makes NoRush different from other writing apps?",
      answer: "NoRush combines financial motivation with AI-powered progress tracking to focus on daily consistency rather than just final deadlines. It's about building sustainable habits, not just completing projects."
    },
    {
      question: "Is there a money-back guarantee?",
      answer: "Yes, we offer a 30-day satisfaction guarantee. If NoRush doesn't help improve your writing consistency, we'll refund your initial deposit in full."
    }
  ];

  return (
    <div className="min-h-screen gradient-hero relative">
      <AnimatedBackground density="light" />
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Get in Touch
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Have questions about NoRush? We're here to help you succeed on your writing journey.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form and Info */}
      <section className="relative py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <div className="animate-slide-up">
              <Card className="bg-card border border-border shadow-warm">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-foreground flex items-center">
                    <MessageCircle className="w-6 h-6 mr-3 text-primary" />
                    Ask a Question
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Your full name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="transition-all duration-300 focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="transition-all duration-300 focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder="Tell us how we can help you..."
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        rows={5}
                        className="transition-all duration-300 focus:ring-2 focus:ring-primary/50 resize-none"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 hover-lift glow-effect"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {isSubmitting ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Contact Info */}
            <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <div className="space-y-8">
                <Card className="bg-card border border-border shadow-card">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-warm">
                        <Mail className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Email Us</h3>
                        <p className="text-muted-foreground mb-2">
                          Get in touch with our support team
                        </p>
                        <a 
                          href="mailto:support@norush.com" 
                          className="text-primary hover:text-primary-glow transition-colors duration-300"
                        >
                          support@norush.com
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border border-border shadow-card">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Follow Us</h3>
                    <div className="flex space-x-4">
                      <a 
                        href="#" 
                        className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover-lift"
                      >
                        <span className="text-sm font-bold">𝕏</span>
                      </a>
                      <a 
                        href="#" 
                        className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover-lift"
                      >
                        <span className="text-sm font-bold">in</span>
                      </a>
                      <a 
                        href="#" 
                        className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover-lift"
                      >
                        <span className="text-sm font-bold">fb</span>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative py-20 bg-accent">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16 animate-fade-in">
              <h2 className="text-3xl sm:text-4xl font-bold text-accent-foreground mb-6 flex items-center justify-center">
                <HelpCircle className="w-8 h-8 mr-3 text-primary" />
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-accent-foreground/80">
                Find answers to common questions about NoRush
              </p>
            </div>

            <div className="animate-slide-up">
              <Card className="bg-card border border-border shadow-card">
                <CardContent className="p-8">
                  <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-left text-lg font-medium text-foreground hover:text-primary transition-colors duration-300">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Contact;