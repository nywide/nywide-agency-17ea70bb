import { Star, Quote } from "lucide-react";

const testimonials = [
  { name: "Marcus Chen", role: "CEO, TechVenture Inc.", content: "NYWIDE transformed our digital presence completely. Our ROAS increased by 8x within the first three months. Their AI-powered approach is truly game-changing.", rating: 5, avatar: "MC" },
  { name: "Sarah Williams", role: "Marketing Director, GrowthLab", content: "The team's expertise in ad account architecture saved us from countless headaches. Professional, responsive, and results-driven. Highly recommended!", rating: 5, avatar: "SW" },
  { name: "David Rodriguez", role: "Founder, E-Commerce Plus", content: "We've worked with many agencies before, but NYWIDE stands out. Their attention to detail and commitment to our success is unmatched. True partners in growth.", rating: 5, avatar: "DR" },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="relative py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 rounded-full text-primary text-sm font-semibold tracking-wider uppercase mb-4">Testimonials</span>
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black text-foreground mb-6" style={{ textWrap: "balance" }}>
            CLIENT <span className="text-primary text-glow">SUCCESS</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Don't just take our word for it. Here's what our clients have to say.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="group relative bg-card rounded-3xl p-8 lg:p-10 border border-border hover:border-primary/50 transition-all duration-500">
              <div className="absolute top-8 right-8 text-primary/20 group-hover:text-primary/40 transition-colors duration-500">
                <Quote className="w-12 h-12" />
              </div>
              <div className="flex items-center gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-primary fill-primary" />
                ))}
              </div>
              <p className="text-foreground text-lg leading-relaxed mb-8">"{testimonial.content}"</p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">{testimonial.avatar}</div>
                <div>
                  <div className="font-bold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
