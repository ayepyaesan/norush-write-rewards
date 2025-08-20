import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Edit3, Award, FileText, Sparkles } from "lucide-react";

const HeroSection = () => {
  return (
    <section
      className="relative h-screen flex items-start justify-center overflow-hidden pt-20"
      style={{
        backgroundImage: "url('/lovable-uploads/01058b05-2f3e-4ee9-bf33-c2980736e806.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Background Overlay for 80% opacity */}
      <div className="absolute inset-0 bg-background/20" />
      
      {/* Animated Background Objects */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {/* Notebooks */}
        <div className="absolute top-1/4 left-1/6 animate-bob opacity-60">
          <BookOpen className="w-12 h-12 text-primary/40 drop-shadow-md" style={{ animationDelay: "0s" }} />
        </div>
        <div className="absolute top-3/4 right-1/4 animate-float opacity-50">
          <BookOpen className="w-8 h-8 text-primary/30 drop-shadow-md" style={{ animationDelay: "2s" }} />
        </div>
        
        {/* Pencils/Pens */}
        <div className="absolute top-1/3 right-1/6 animate-wiggle opacity-50">
          <Edit3 className="w-10 h-10 text-accent-foreground/40 drop-shadow-md" style={{ animationDelay: "1s" }} />
        </div>
        <div className="absolute bottom-1/3 left-1/4 animate-drift opacity-60">
          <Edit3 className="w-6 h-6 text-accent-foreground/30 drop-shadow-md" style={{ animationDelay: "3s" }} />
        </div>
        
        {/* Trophies */}
        <div className="absolute top-1/2 left-1/12 animate-trophy-glow opacity-70">
          <Award className="w-14 h-14 text-yellow-400/60" style={{ animationDelay: "0.5s" }} />
        </div>
        <div className="absolute bottom-1/4 right-1/12 animate-trophy-glow opacity-60">
          <Award className="w-10 h-10 text-yellow-400/50" style={{ animationDelay: "2.5s" }} />
        </div>
        
        {/* Paper Sheets */}
        <div className="absolute top-2/3 left-1/3 animate-paper-float opacity-40">
          <FileText className="w-8 h-8 text-muted-foreground/40 drop-shadow-md" style={{ animationDelay: "1.5s" }} />
        </div>
        <div className="absolute top-1/6 right-1/3 animate-paper-float opacity-50">
          <FileText className="w-12 h-12 text-muted-foreground/30 drop-shadow-md" style={{ animationDelay: "4s" }} />
        </div>
        
        {/* Sparkles/Confetti */}
        <div className="absolute top-1/5 left-1/2 animate-sparkle opacity-30">
          <Sparkles className="w-4 h-4 text-primary-glow/60" style={{ animationDelay: "0s" }} />
        </div>
        <div className="absolute bottom-1/5 left-2/3 animate-sparkle opacity-40">
          <Sparkles className="w-3 h-3 text-primary-glow/50" style={{ animationDelay: "1s" }} />
        </div>
        <div className="absolute top-3/5 right-2/3 animate-sparkle opacity-35">
          <Sparkles className="w-5 h-5 text-primary-glow/40" style={{ animationDelay: "2s" }} />
        </div>
        <div className="absolute bottom-2/5 right-1/2 animate-sparkle opacity-30">
          <Sparkles className="w-3 h-3 text-primary-glow/60" style={{ animationDelay: "3s" }} />
        </div>
        
        {/* Additional Mobile-Friendly Elements */}
        <div className="absolute top-1/8 right-3/4 animate-float-delayed opacity-30 hidden sm:block">
          <BookOpen className="w-6 h-6 text-primary/30" />
        </div>
        <div className="absolute bottom-1/8 left-3/4 animate-drift opacity-25 hidden sm:block">
          <Edit3 className="w-4 h-4 text-accent-foreground/30" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-20 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="animate-fade-in">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-6 leading-tight">
            Join Our Community.
            <br />
            <span className="text-primary">Achieve Together.</span>
            <br />
            Write Smarter with Friends.
          </h1>
          
          <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Connect with like-minded writers, build lasting friendships, and celebrate success together.
          </p>
          
          <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Link to="/workspace">
              <Button 
                size="lg" 
                className="hover-lift text-lg px-8 py-6 rounded-full shadow-warm bg-primary text-primary-foreground hover:bg-primary/90 glow-effect"
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