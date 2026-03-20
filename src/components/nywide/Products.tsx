import { Check, Zap, Crown, Shield, ArrowRight } from "lucide-react";

const products = [
  {
    name: "Starter", price: "$99", description: "Perfect for small businesses getting started",
    features: ["1 Ad Account Setup", "Basic Pixel Configuration", "5 Campaign Templates", "Email Support", "Monthly Reporting"],
    popular: false, icon: Zap,
  },
  {
    name: "Elite", price: "$250", description: "Our most popular choice for growing brands",
    features: ["3 Ad Account Setup", "Advanced Pixel + CAPI", "Unlimited Campaigns", "Priority Support 24/7", "Weekly Reporting", "AI Audience Builder", "Creative Templates Pack"],
    popular: true, icon: Crown,
  },
  {
    name: "Enterprise", price: "Custom", description: "Full-scale solution for large operations",
    features: ["Unlimited Ad Accounts", "Full Tech Integration", "Dedicated Account Manager", "White-Glove Setup", "Real-time Dashboard", "Custom AI Models", "On-site Training", "SLA Guarantee"],
    popular: false, icon: Shield,
  },
];

export function Products() {
  return (
    <section id="products" className="relative py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 rounded-full text-primary text-sm font-semibold tracking-wider uppercase mb-4">Pricing</span>
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black text-foreground mb-6" style={{ textWrap: "balance" }}>
            AD ACCOUNT <span className="text-primary text-glow">PACKAGES</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Choose the perfect package to accelerate your digital growth.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {products.map((product, index) => (
            <div key={index} className={`group relative rounded-3xl p-8 lg:p-10 border transition-all duration-500 ${product.popular ? "bg-primary/10 border-primary glow-gold" : "bg-card border-border hover:border-primary/50"}`}>
              {product.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full">Most Popular</div>
              )}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${product.popular ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                <product.icon className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-foreground mb-2">{product.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className={`text-5xl font-serif font-black ${product.popular ? "text-primary text-glow" : "text-foreground"}`}>{product.price}</span>
                {product.price !== "Custom" && <span className="text-muted-foreground">/month</span>}
              </div>
              <p className="text-muted-foreground mb-8">{product.description}</p>
              <ul className="space-y-4 mb-8">
                {product.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${product.popular ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"}`}>
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <a href="#contact" className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-full font-bold transition-all duration-300 active:scale-95 ${product.popular ? "bg-primary text-primary-foreground glow-gold-hover" : "bg-foreground/10 text-foreground hover:bg-primary hover:text-primary-foreground"}`}>
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
