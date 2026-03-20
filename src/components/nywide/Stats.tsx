import { TrendingUp, Target, DollarSign, Users } from "lucide-react";

const stats = [
  { icon: DollarSign, value: "€5M+", label: "Ad Spend Managed", description: "Across multiple platforms" },
  { icon: Target, value: "1000+", label: "Campaigns Launched", description: "High-performance campaigns" },
  { icon: TrendingUp, value: "10x", label: "Average ROAS", description: "Return on ad spend" },
  { icon: Users, value: "500+", label: "Happy Clients", description: "Worldwide partnerships" },
];

export function Stats() {
  return (
    <section id="stats" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      <div className="relative mb-24 bg-primary text-primary-foreground py-4 -rotate-1 scale-105">
        <div className="flex overflow-hidden">
          <div className="animate-marquee whitespace-nowrap flex gap-8 text-2xl sm:text-3xl font-black uppercase tracking-tight">
            {[...Array(3)].map((_, i) => (
              <span key={i} className="flex items-center gap-8">
                <span>Digital Excellence</span><span>★</span>
                <span>Performance Marketing</span><span>★</span>
                <span>Growth Partners</span><span>★</span>
                <span>Scale Your Business</span><span>★</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 rounded-full text-primary text-sm font-semibold tracking-wider uppercase mb-4">Our Impact</span>
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black text-foreground mb-6" style={{ textWrap: "balance" }}>
            RESULTS THAT <span className="text-primary text-glow">SPEAK</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Numbers don't lie. Here's what we've achieved for our clients.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="group relative bg-card rounded-3xl p-6 lg:p-8 border border-border hover:border-primary/50 text-center transition-all duration-500">
              <div className="absolute inset-0 rounded-3xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                <stat.icon className="w-7 h-7 text-primary" />
              </div>
              <div className="relative text-4xl lg:text-5xl font-serif font-black text-primary mb-2 text-glow">{stat.value}</div>
              <div className="relative text-lg font-bold text-foreground mb-1">{stat.label}</div>
              <div className="relative text-sm text-muted-foreground">{stat.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
