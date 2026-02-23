import { MobileTopBar } from '../components/landing/mobile/MobileTopBar';
import { MobileHero } from '../components/landing/mobile/MobileHero';
import { MobileFeatureTabs } from '../components/landing/mobile/MobileFeatureTabs';
import { MobileValueStack } from '../components/landing/mobile/MobileValueStack';
import { MobileCTA } from '../components/landing/mobile/MobileCTA';
import { Footer } from '../components/landing/Footer';
import './landing-mobile.css';


export default function MobileLandingPage() {
  return (
    <div className="mobile-landing-page min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100 overflow-x-hidden">
      <MobileTopBar />
      <main className="mobile-landing-main space-y-12 md:space-y-14">
        <MobileHero />
        <MobileFeatureTabs />
        <MobileValueStack />
        <MobileCTA />
      </main>
      <Footer />
    </div>
  );
}
