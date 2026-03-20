import { Monitor, Megaphone, Video, ArrowUpRight } from "lucide-react";

const services = [
  {
    icon: Monitor,
    title: "Rent High‑Trust Facebook Ad Accounts – Scale Without Limits",
    color: "from-primary to-yellow-600",
    features: [
      "⚡ Stop Getting Banned. We provide elite, whitelisted accounts.",
      "💰 No Monthly Fees. Pay only for what you spend.",
      "🚀 Launch in 24 Hours (free trial available).",
      "🌍 Target Any Country, Unlimited Daily Budget.",
      "🛡️ Instant Replacement if an account is disabled.",
      "📞 24/7 WhatsApp Support (because time is money).",
    ],
    pricing: "Custom Pricing – Starting from 6% commission. Contact us for a tailored plan.",
    cta: "Request Your Free Trial",
  },
  {
    icon: Megaphone,
    title: "Done‑For‑You Marketing – We Build Your Entire Funnel",
    color: "from-primary to-amber-500",
    features: [
      "🎯 Tired of Wasting Money on Ads? We create a winning strategy from scratch.",
      "📱 We Build Your Social Presence (Facebook, Instagram, TikTok).",
      "🎬 High‑Converting Creatives (videos, images, copy) – no need to hire freelancers.",
      "📈 Daily Optimization: We maximize your ROAS while you sleep.",
      "👤 Dedicated Account Manager – one person to handle everything.",
    ],
    pricing: "Pricing starts at $250/month – tailored to your goals. Book a free consultation.",
    cta: "Book a Strategy Call",
  },
  {
    icon: Video,
    title: "Creative Content & Influencer Campaigns – Stop Scrolling, Start Selling",
    color: "from-primary to-orange-500",
    features: [
      "🎥 Scroll‑Stopping Video Ads (Reels, TikTok, YouTube).",
      "🎨 Professional Graphic Design (static ads, carousels, banners).",
      "✍️ Copy That Converts (ad copy, captions, landing pages).",
      "🌟 Influencer Sourcing: We connect you with the right creators on Facebook, Instagram, and TikTok.",
    ],
    pricing: "Project‑Based Pricing. Tell us your needs and we'll provide a custom quote.",
    cta: "Get a Free Quote",
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
              <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <service.icon className="w-8 h-8 text-black" />
              </div>
              <h3 className="relative text-xl font-serif font-bold text-foreground mb-5 group-hover:text-primary transition-colors duration-300">{service.title}</h3>
              <ul className="relative space-y-3 mb-6 flex-1">
                {service.features.map((feature, i) => (
                  <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                    {feature}
                  </li>
                ))}
              </ul>
              <p className="relative text-xs text-primary/80 font-medium mb-5 border-t border-border pt-5">
                {service.pricing}
              </p>
              <a
                href="https://wa.me/37253957002"
                target="_blank"
                rel="noopener noreferrer"
                className="relative inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/60 rounded-xl text-primary font-semibold text-sm transition-all duration-300 group-hover:bg-primary group-hover:text-black"
              >
                <span>{service.cta}</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>
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
