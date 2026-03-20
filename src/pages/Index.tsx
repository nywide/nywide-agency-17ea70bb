import { Header } from "@/components/nywide/Header";
import { Hero } from "@/components/nywide/Hero";
import { Services } from "@/components/nywide/Services";
import { Stats } from "@/components/nywide/Stats";
import { Products } from "@/components/nywide/Products";
import { Testimonials } from "@/components/nywide/Testimonials";
import { Footer } from "@/components/nywide/Footer";
import { TechBackground } from "@/components/nywide/TechBackground";

export default function Index() {
  return (
    <main className="relative min-h-screen bg-card text-foreground overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
      <TechBackground />
      <div className="relative z-10">
        <Header />
        <Hero />
        <Services />
        <Stats />
        <Products />
        <Testimonials />
        <Footer />
      </div>
    </main>
  );
}
