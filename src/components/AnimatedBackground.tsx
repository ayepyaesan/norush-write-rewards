import { BookOpen, Edit3, Award, FileText, Sparkles } from "lucide-react";

interface AnimatedBackgroundProps {
  density?: 'light' | 'normal' | 'dense';
  className?: string;
}

const AnimatedBackground = ({ density = 'normal', className = '' }: AnimatedBackgroundProps) => {
  const getDensityConfig = () => {
    switch (density) {
      case 'light':
        return {
          notebooks: 2,
          pencils: 2,
          trophies: 1,
          papers: 2,
          sparkles: 3
        };
      case 'dense':
        return {
          notebooks: 4,
          pencils: 4,
          trophies: 3,
          papers: 4,
          sparkles: 6
        };
      default:
        return {
          notebooks: 3,
          pencils: 3,
          trophies: 2,
          papers: 3,
          sparkles: 4
        };
    }
  };

  const config = getDensityConfig();

  const generateElements = (count: number, Component: any, animationClass: string, baseOpacity: string) => {
    return Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className={`absolute ${animationClass} ${baseOpacity}`}
        style={{
          top: `${Math.random() * 80 + 10}%`,
          left: `${Math.random() * 80 + 10}%`,
          animationDelay: `${Math.random() * 4}s`
        }}
      >
        <Component 
          className={`w-${4 + Math.floor(Math.random() * 8)} h-${4 + Math.floor(Math.random() * 8)} drop-shadow-md`}
        />
      </div>
    ));
  };

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Notebooks */}
      {generateElements(config.notebooks, BookOpen, 'animate-bob', 'opacity-30 text-primary/40')}
      
      {/* Pencils/Pens */}
      {generateElements(config.pencils, Edit3, 'animate-wiggle', 'opacity-40 text-accent-foreground/40')}
      
      {/* Trophies */}
      {generateElements(config.trophies, Award, 'animate-trophy-glow', 'opacity-50 text-yellow-400/50')}
      
      {/* Paper Sheets */}
      {generateElements(config.papers, FileText, 'animate-paper-float', 'opacity-30 text-muted-foreground/40')}
      
      {/* Sparkles */}
      {generateElements(config.sparkles, Sparkles, 'animate-sparkle', 'opacity-40 text-primary-glow/50')}
      
      {/* Additional floating elements for better coverage */}
      <div className="absolute top-1/8 right-3/4 animate-float-delayed opacity-20 hidden sm:block">
        <BookOpen className="w-6 h-6 text-primary/30" />
      </div>
      <div className="absolute bottom-1/8 left-3/4 animate-drift opacity-20 hidden sm:block">
        <Edit3 className="w-4 h-4 text-accent-foreground/30" />
      </div>
      <div className="absolute top-3/4 right-1/6 animate-float opacity-25 hidden md:block">
        <Award className="w-8 h-8 text-yellow-400/40" />
      </div>
    </div>
  );
};

export default AnimatedBackground;