import { Navbar } from '@/components/layout/navbar';
import { HeroSection } from '@/components/landing/hero-section';
import { DemoSection } from '@/components/landing/demo-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { IntegrationSection } from '@/components/landing/integration-section';
import { Footer } from '@/components/landing/footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar />
      <main>
        <HeroSection />
        <DemoSection />
        <FeaturesSection />
        <IntegrationSection />
      </main>
      <Footer />
    </div>
  );
}
