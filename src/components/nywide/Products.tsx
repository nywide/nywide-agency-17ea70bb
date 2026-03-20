import { Monitor, Megaphone, Video, ArrowRight, Check } from "lucide-react";

const plans = [
  {
    icon: Monitor,
    title: "Facebook Ad Account Rental",
    price: "6% Commission on Ad Spend",
    features: [
      "No monthly fees – pay only when you spend",
      "24-hour free trial (one account)",
      "Whitelisted, high-trust accounts – no bans",
      "Unlimited daily spending, target any country",
      "Multiple top-up methods: Cards, bank transfer, USDT, Wise, Payoneer",
      "Minimum top-up: $10",
      "Instant top-up, fast replacement if account is disabled",
      "24/7 WhatsApp support (time is money)",
      "Client dashboard with real-time data, low-balance alerts",
      "Generate invoices for tax purposes (VAT-ready)",
    ],
    cta: "Get Started",
    href: "#signup",
  },
  {
    icon: Megaphone,
    title: "Done-For-You Marketing",
    price: "Custom Quote – Starting from $250/month",
    features: [
      "Custom marketing strategy built for your business",
      "Full social media presence setup (Facebook, Instagram, TikTok)",
      "High-converting ad creatives (videos, images, copy) – no freelancer needed",
      "Complete campaign management & daily optimization",
      "Dedicated account manager – one person for everything",
      "Real-time dashboard with KPIs and growth tracking",
      "Regular performance reports",
    ],
    cta: "Book a Call",
    href: "https://wa.me/3725395702",
  },
  {
    icon: Video,
    title: "Creative Content & Influencer Campaigns",
    price: "Project-Based Pricing – Tell Us Your Needs",
    features: [
      "Scroll-stopping video ads (Reels, TikTok, YouTube)",
      "Professional graphic design (static ads, carousels, banners)",
      "Copywriting that converts (ad copy, captions, landing pages)",
      "Influencer sourcing – right creators on Facebook, Instagram, TikTok",
      "Quick turnaround, tailored to your brand voice",
    ],
    cta: "Request a Quote",
    href: "https://wa.me/3725395702",
  },
];

export function Products() {
  return (
    <section id="products" className="relative py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 rounded-full text-primary text-sm font-semibold tracking-wider uppercase mb-4">Pricing</span>
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black text-foreground mb-6" style={{ textWrap: "balance" }}>
            PRICING THAT FITS YOUR{" "}
            <span className="text-primary text-glow">GOALS</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            No surprises. Pay only for what you need.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <div key={index} className="group relative bg-card rounded-3xl p-8 lg:p-10 border border-border hover:border-primary/50 transition-all duration-500 overflow-hidden flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-yellow-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <plan.icon className="w-8 h-8 text-black" />
              </div>

              <h3 className="relative text-xl font-serif font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                {plan.title}
              </h3>

              <p className="relative text-primary font-bold text-sm mb-6">
                {plan.price}
              </p>

              <div className="relative space-y-3 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <a
                href={plan.href}
                target={plan.href.startsWith("http") ? "_blank" : undefined}
                rel={plan.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="relative inline-flex items-center justify-center gap-2 w-full px-6 py-4 bg-primary/10 hover:bg-primary border border-primary/30 hover:border-primary rounded-xl text-primary hover:text-black font-bold text-sm transition-all duration-300 active:scale-95"
              >
                <span>{plan.cta}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
