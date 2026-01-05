import { Header } from '../components/landing/Header';
import { Hero } from '../components/landing/Hero';
import { MarketplaceMarquee } from '../components/landing/MarketplaceMarquee';
import { FeatureGrid } from '../components/landing/FeatureGrid';
import { HowItWorks } from '../components/landing/HowItWorks';
import { SocialProof } from '../components/landing/SocialProof';
import { Pricing } from '../components/landing/Pricing';
import { FAQ } from '../components/landing/FAQ';
import { CTA } from '../components/landing/CTA';
import { Footer } from '../components/landing/Footer';

export function Landing() {
  return (
    <div className="min-h-screen bg-carbon-950 text-carbon-100">
      <Header />
      <Hero />
      <MarketplaceMarquee />
      <FeatureGrid />
      <HowItWorks />
      <SocialProof />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
