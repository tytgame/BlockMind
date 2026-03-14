import { Navbar } from '@/components/layout/navbar';
import { HeroSection } from '@/components/landing/hero-section';
import { BeforeAfterSection } from '@/components/landing/before-after-section';
import { DemoSection } from '@/components/landing/demo-section';
import { IntegrationSection } from '@/components/landing/integration-section';
import { Footer } from '@/components/landing/footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f1419] overflow-x-hidden">
      <Navbar />
      <main>
        <HeroSection />
        <BeforeAfterSection />
        <DemoSection />
        <IntegrationSection />
      </main>
      <Footer />
    </div>
  );
}
