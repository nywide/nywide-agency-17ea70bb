import { Monitor, Megaphone, Video, ArrowRight } from "lucide-react";

const plans = [
  {
    icon: Monitor,
    title: "Facebook Ad Account Rental",
    description: "Commission-based: Starting from 6% of ad spend. No monthly fees. Free trial available.",
    cta: "Get Quote",
    href: "https://wa.me/37253957002",
  },
  {
    icon: Megaphone,
    title: "Done-For-You Marketing",
    description: "Custom pricing based on your scope and goals. Free consultation to define your needs.",
    cta: "Book a Call",
    href: "https://wa.me/37253957002",
  },
  {
    icon: Video,
    title: "Creative Content & Influencer Campaigns",
    description: "Project-based pricing. Tell us your requirements and we'll provide a custom quote.",
    cta: "Request Quote",
    href: "https://wa.me/37253957002",
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
            <div key={index} className="group relative bg-card rounded-3xl p-8 lg:p-10 border border-border hover:border-primary/50 transition-all duration-500 overflow-hidden flex flex-col text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-yellow-600 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                <plan.icon className="w-8 h-8 text-black" />
              </div>

              <h3 className="relative text-xl font-serif font-bold text-foreground mb-4 group-hover:text-primary transition-colors duration-300">
                {plan.title}
              </h3>

              <p className="relative text-muted-foreground text-sm leading-relaxed mb-8 flex-1">
                {plan.description}
              </p>

              <a
                href={plan.href}
                target="_blank"
                rel="noopener noreferrer"
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
