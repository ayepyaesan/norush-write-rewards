import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import Footer from "@/components/Footer";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-muted/30 via-background to-muted/20">
        <div className="text-center space-y-6 px-4">
          <div className="space-y-4">
            <h1 className="text-6xl sm:text-8xl font-bold text-primary">404</h1>
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">Page Not Found</h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Oops! The page you're looking for doesn't exist. Let's get you back on track.
            </p>
          </div>
          
          <Link 
            to="/" 
            className="inline-flex items-center px-6 py-3 text-lg font-medium rounded-full bg-primary text-primary-foreground shadow-warm hover-lift transition-all duration-300 glow-effect"
          >
            <Home className="w-5 h-5 mr-2" />
            Return to Home
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default NotFound;
