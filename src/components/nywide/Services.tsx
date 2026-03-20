import { Settings, Cpu, Palette, ArrowUpRight } from "lucide-react";

const services = [
  {
    icon: Settings,
    title: "Ad Account Architecture",
    description: "Enterprise-grade account structures optimized for scalability. Custom Business Manager setups, pixel configurations, and conversion API integrations.",
    color: "from-primary to-yellow-600",
  },
  {
    icon: Cpu,
    title: "AI-Powered Campaigns",
    description: "Leverage cutting-edge AI and machine learning for predictive bidding, audience optimization, and creative testing at scale.",
    color: "from-primary to-amber-500",
  },
  {
    icon: Palette,
    title: "Creative & Content",
    description: "High-converting ad creatives, UGC production, and content strategies that stop the scroll and drive action.",
    color: "from-primary to-orange-500",
  },
];

export function Services() {
  return (
    <section id="services" className="relative py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 rounded-full text-primary text-sm font-semibold tracking-wider uppercase mb-4">Our Services</span>
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black text-foreground mb-6" style={{ textWrap: "balance" }}>
            ELITE <span className="text-primary text-glow">SOLUTIONS</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive digital marketing services designed to maximize your ROI and dominate your market.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => (
            <div key={index} className="group relative bg-card rounded-3xl p-8 lg:p-10 border border-border hover:border-primary/50 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <service.icon className="w-8 h-8 text-black" />
              </div>
              <h3 className="relative text-2xl font-serif font-bold text-foreground mb-4 group-hover:text-primary transition-colors duration-300">{service.title}</h3>
              <p className="relative text-muted-foreground leading-relaxed mb-6">{service.description}</p>
              <div className="relative flex items-center gap-2 text-primary font-semibold opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                <span>Learn More</span>
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div className="absolute top-8 right-8 opacity-10 group-hover:opacity-100 transition-opacity duration-500">
                <ArrowUpRight className="w-8 h-8 text-primary" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
