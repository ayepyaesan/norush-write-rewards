import { Card, CardContent } from "@/components/ui/card";
import { Edit3, Gift } from "lucide-react";

const WorkflowSection = () => {
  const steps = [
    {
      icon: null,
      currency: "MMK",
      title: "Declare your task + make deposit",
      description: "Set your writing goal and make a financial commitment to stay motivated.",
      step: "01"
    },
    {
      icon: Edit3,
      title: "Work consistently in the text editor",
      description: "Write daily in our focused environment with AI-powered progress tracking.",
      step: "02"
    },
    {
      icon: Gift,
      title: "Get your deposit refunded as you stay consistent",
      description: "Earn back your money by maintaining daily writing habits and meeting goals.",
      step: "03"
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            How NoRush Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A simple 3-step process to transform your writing habits and achieve your goals
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div 
                key={index}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <Card className="relative h-full bg-card border border-border shadow-card hover-lift">
                  <CardContent className="p-8 text-center">
                    {/* Step number */}
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-warm">
                        {step.step}
                      </div>
                    </div>
                    
                    {/* Icon */}
                    <div className="mb-6 pt-4">
                      <div className="w-16 h-16 mx-auto rounded-full bg-accent flex items-center justify-center mb-4">
                        {step.currency ? (
                          <span className="text-2xl font-bold text-primary">MMK</span>
                        ) : (
                          <Icon className="w-8 h-8 text-primary" />
                        )}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-xl font-semibold text-foreground mb-4">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Connecting lines for desktop */}
        <div className="hidden md:block relative -mt-32 mb-16">
          <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-border transform -translate-y-1/2" />
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;