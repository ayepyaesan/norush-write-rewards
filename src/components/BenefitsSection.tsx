import { Card, CardContent } from "@/components/ui/card";
import { Focus, Award, Heart } from "lucide-react";

const BenefitsSection = () => {
  const benefits = [
    {
      icon: Focus,
      title: "Better Focus",
      description: "Eliminate distractions and maintain deep concentration with our purpose-built writing environment.",
      gradient: "from-primary to-primary-glow"
    },
    {
      icon: Award,
      title: "Higher Quality Work",
      description: "Consistent daily practice leads to improved writing skills and more polished final products.",
      gradient: "from-accent to-primary"
    },
    {
      icon: Heart,
      title: "Healthier Habits",
      description: "Build sustainable writing routines that reduce stress and promote long-term creative success.",
      gradient: "from-primary-glow to-accent"
    }
  ];

  return (
    <section className="py-20 bg-accent">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-accent-foreground mb-6">
            Why Choose NoRush?
          </h2>
          <p className="text-xl text-accent-foreground/80 max-w-2xl mx-auto">
            Transform your writing process with proven benefits that last
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div 
                key={index}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <Card className="h-full bg-card border border-border shadow-card hover-lift group">
                  <CardContent className="p-8 text-center">
                    {/* Icon with background */}
                    <div className="mb-6">
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-warm group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-10 h-10 text-primary-foreground" />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-2xl font-semibold text-foreground mb-4">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-lg">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;