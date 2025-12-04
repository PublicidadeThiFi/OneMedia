import { Header } from '../components/landing/Header';
import { Hero } from '../components/landing/Hero';
import { PainPoints } from '../components/landing/PainPoints';
import { Solutions } from '../components/landing/Solutions';
import { HowItWorks } from '../components/landing/HowItWorks';
import { Features } from '../components/landing/Features';
import { Efficiency } from '../components/landing/Efficiency';
import { Pricing } from '../components/landing/Pricing';
import { Testimonials } from '../components/landing/Testimonials';
import { FAQ } from '../components/landing/FAQ';
import { FinalCTA } from '../components/landing/FinalCTA';
import { Footer } from '../components/landing/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <PainPoints />
        <Solutions />
        <HowItWorks />
        <Features />
        <Efficiency />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
