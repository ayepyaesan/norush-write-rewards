import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import WorkflowSection from "@/components/WorkflowSection";
import BenefitsSection from "@/components/BenefitsSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <HeroSection />
        <WorkflowSection />
        <BenefitsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
