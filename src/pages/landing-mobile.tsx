import { MobileTopBar } from '../components/landing/mobile/MobileTopBar';
import { MobileHero } from '../components/landing/mobile/MobileHero';
import { MobileFeatureTabs } from '../components/landing/mobile/MobileFeatureTabs';
import { MobileValueStack } from '../components/landing/mobile/MobileValueStack';
import { MobileCTA } from '../components/landing/mobile/MobileCTA';
import { Footer } from '../components/landing/Footer';

export default function MobileLandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <MobileTopBar />
      <main className="pt-28 pb-16 space-y-12">
        <MobileHero />
        <MobileFeatureTabs />
        <MobileValueStack />
        <MobileCTA />
      </main>
      <Footer />
    </div>
  );
}
