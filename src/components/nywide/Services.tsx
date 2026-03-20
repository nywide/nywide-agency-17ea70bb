import { Monitor, Megaphone, Video, ArrowRight, Zap, RefreshCw, Headphones, Target, Palette, UserCheck, PlayCircle, PenTool, Users } from "lucide-react";

const services = [
  {
    icon: Monitor,
    title: "Rent High-Trust Facebook Accounts",
    problem: "Tired of bans, spending limits, and unstable accounts?",
    solution: "We provide elite, whitelisted accounts with unlimited daily spend. No monthly fees — pay only for what you use.",
    features: [
      { icon: Zap, label: "Launch in 24 Hours" },
      { icon: RefreshCw, label: "Instant Replacement" },
      { icon: Headphones, label: "24/7 WhatsApp Support" },
    ],
    cta: "Get Started",
    href: "#signup",
  },
  {
    icon: Megaphone,
    title: "Done-For-You Marketing",
    problem: "Struggling with strategy, creatives, or campaign performance?",
    solution: "We handle everything — from strategy to daily optimization — while you focus on your business.",
    features: [
      { icon: Target, label: "Custom Strategy" },
      { icon: Palette, label: "High-Converting Creatives" },
      { icon: UserCheck, label: "Dedicated Account Manager" },
    ],
    cta: "See Pricing",
    href: "#products",
  },
  {
    icon: Video,
    title: "Creative Content & Influencers",
    problem: "Ads not converting? Need scroll-stopping creatives?",
    solution: "We produce viral videos, professional graphics, and connect you with the right influencers.",
    features: [
      { icon: PlayCircle, label: "Video Production" },
      { icon: PenTool, label: "Graphic Design" },
      { icon: Users, label: "Influencer Sourcing" },
    ],
    cta: "See Pricing",
    href: "#products",
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
            Stop guessing. Start scaling. We handle the hard part so you can focus on growing your business.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => (
            <div key={index} className="group relative bg-card rounded-3xl p-8 lg:p-10 border border-border hover:border-primary/50 transition-all duration-500 overflow-hidden flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-yellow-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <service.icon className="w-8 h-8 text-black" />
              </div>

              <h3 className="relative text-xl font-serif font-bold text-foreground mb-4 group-hover:text-primary transition-colors duration-300">
                {service.title}
              </h3>

              <p className="relative text-primary/80 font-medium text-sm mb-3 italic">
                "{service.problem}"
              </p>

              <p className="relative text-muted-foreground text-sm leading-relaxed mb-6">
                {service.solution}
              </p>

              <div className="relative space-y-3 mb-8 flex-1">
                {service.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <feature.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground font-medium">{feature.label}</span>
                  </div>
                ))}
              </div>

              <a
                href={service.href}
                className="relative inline-flex items-center justify-center gap-2 w-full px-6 py-4 bg-primary/10 hover:bg-primary border border-primary/30 hover:border-primary rounded-xl text-primary hover:text-black font-bold text-sm transition-all duration-300 active:scale-95"
              >
                <span>{service.cta}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
