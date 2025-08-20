import Navigation from "@/components/Navigation";
import AnimatedBackground from "@/components/AnimatedBackground";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Eye, Users, Award } from "lucide-react";

const About = () => {
  const values = [
    {
      icon: Target,
      title: "Our Mission",
      description: "To help people work steadily, avoid last-minute stress, and produce higher quality results through consistent daily writing habits.",
    },
    {
      icon: Eye,
      title: "Our Vision",
      description: "A world where productivity is consistent, healthy, and rewarding. Where writers thrive through sustainable practices rather than burnout.",
    },
    {
      icon: Users,
      title: "Our Community",
      description: "Building a supportive network of writers who celebrate consistency over perfection and progress over pressure.",
    },
    {
      icon: Award,
      title: "Our Promise",
      description: "Providing tools and motivation that genuinely help writers succeed without sacrificing their well-being or creativity.",
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
              About NoRush
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              We believe that great writing comes from consistent effort, not last-minute panic. 
              Our platform transforms the way people approach deadlines and creative work.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="relative py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-slide-up mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-8 text-center">
                The Story Behind NoRush
              </h2>
              <Card className="gradient-card border border-border shadow-card">
                <CardContent className="p-8">
                  <div className="prose prose-lg max-w-none text-muted-foreground">
                    <p className="text-lg leading-relaxed mb-6">
                      NoRush was born from a simple observation: the best writers aren't those who work in frantic bursts, 
                      but those who show up consistently, day after day. We noticed that procrastination and last-minute 
                      rushes weren't just stressful—they were preventing people from producing their best work.
                    </p>
                    <p className="text-lg leading-relaxed mb-6">
                      Traditional deadline management focuses on the end result, not the journey. We flip this approach 
                      by making the daily process the priority. By combining financial commitment with AI-powered progress 
                      tracking, we help writers build habits that lead to both better work and better well-being.
                    </p>
                    <p className="text-lg leading-relaxed">
                      Our platform doesn't just help you meet deadlines—it helps you develop a sustainable relationship 
                      with your creative work that will serve you for years to come.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="relative py-20 bg-accent">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl font-bold text-accent-foreground mb-6">
              Our Values & Vision
            </h2>
            <p className="text-xl text-accent-foreground/80 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <div 
                  key={index}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Card className="h-full bg-card border border-border shadow-card hover-lift">
                    <CardContent className="p-8">
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-warm flex-shrink-0">
                          <Icon className="w-8 h-8 text-primary-foreground" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-semibold text-foreground mb-4">
                            {value.title}
                          </h3>
                          <p className="text-muted-foreground leading-relaxed text-lg">
                            {value.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <Card className="gradient-card border border-border shadow-warm">
              <CardContent className="p-12">
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
                  Ready to Transform Your Writing?
                </h2>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Join thousands of writers who have discovered the power of consistency over chaos.
                </p>
                <a 
                  href="/workspace" 
                  className="inline-flex items-center px-8 py-4 text-lg font-medium rounded-full bg-primary text-primary-foreground shadow-warm hover-lift transition-all duration-300 glow-effect"
                >
                  Start Your Journey Today
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;