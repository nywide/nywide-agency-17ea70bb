import { Monitor, Megaphone, Video, ArrowUpRight, Check } from "lucide-react";

const services = [
  {
    icon: Monitor,
    title: "Rent Facebook Agency Accounts – 6% Commission Only",
    description: "No monthly fees. Pay only on ad spend.",
    color: "from-primary to-yellow-600",
    features: [
      "24-hour free trial for one account",
      "High-trust accounts: no bans, unlimited daily spending, global targeting",
      "Top-up methods: Cards, bank transfer, USDT/crypto, Wise, Payoneer. Min top-up: $10",
      "Instant top-up, fast replacement if account is disabled",
      "24/7 WhatsApp support",
      "Client dashboard with real-time data, low-balance alerts, invoice generation",
      "Accounting integration (Xero/QuickBooks ready)",
    ],
  },
  {
    icon: Megaphone,
    title: "Done-For-You Marketing Management",
    description: "Custom quote starting from $250/month.",
    color: "from-primary to-amber-500",
    features: [
      "Custom marketing strategy & planning",
      "Social media presence setup",
      "Ad creative production (videos, images, copy)",
      "Full campaign management & daily optimization",
      "Dedicated account manager",
      "Dashboard with KPIs and business growth tracking",
    ],
  },
  {
    icon: Video,
    title: "Creative Content & Influencer Collaboration",
    description: "Custom quote based on project scope.",
    color: "from-primary to-orange-500",
    features: [
      "Video production (ads, reels, explainers)",
      "Graphic design (static ads, banners)",
      "Copywriting (ad copy, captions)",
      "Influencer sourcing on Facebook, Instagram, TikTok",
    ],
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
              <h3 className="relative text-xl font-serif font-bold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">{service.title}</h3>
              <p className="relative text-muted-foreground leading-relaxed mb-5">{service.description}</p>
              <ul className="relative space-y-2.5 mb-6">
                {service.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
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
