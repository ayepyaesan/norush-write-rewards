import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

const HeroSection = () => {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: "url('/lovable-uploads/fbb7d643-2874-4010-b7f2-2846fc303fd0.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-accent/70 to-primary-glow/60 backdrop-blur-sm" />
      
      {/* Floating elements */}
      <div className="absolute top-1/4 left-10 animate-float">
        <Sparkles className="text-primary-foreground/30 w-8 h-8" />
      </div>
      <div className="absolute top-1/3 right-20 animate-float" style={{ animationDelay: "1s" }}>
        <Sparkles className="text-primary-foreground/20 w-12 h-12" />
      </div>
      <div className="absolute bottom-1/4 left-1/4 animate-float" style={{ animationDelay: "2s" }}>
        <Sparkles className="text-primary-foreground/25 w-6 h-6" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="animate-fade-in">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-primary-foreground mb-6 leading-tight">
            Stay Consistent.
            <br />
            <span className="text-primary-glow">Meet Your Deadlines.</span>
            <br />
            Write Smarter with NoRush.
          </h1>
          
          <p className="text-xl sm:text-2xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto leading-relaxed">
            Avoid last-minute panic, and build quality work habits.
          </p>
          
          <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Link to="/workspace">
              <Button 
                size="lg" 
                className="gradient-warm hover-lift text-lg px-8 py-6 rounded-full shadow-warm"
              >
                Start Your Journey
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;