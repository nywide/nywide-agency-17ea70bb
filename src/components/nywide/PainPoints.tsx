import { X, CheckCircle2 } from "lucide-react";

const pains = [
  "Wasted ad spend on accounts that get banned.",
  "Hours of trial and error instead of scaling.",
  "Lost revenue while competitors take the lead.",
];

export function PainPoints() {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-foreground mb-12" style={{ textWrap: "balance" }}>
          WHAT HAPPENS IF YOU{" "}
          <span className="text-primary text-glow">GO IT ALONE?</span>
        </h2>

        <div className="space-y-5 mb-12 max-w-xl mx-auto">
          {pains.map((pain, i) => (
            <div key={i} className="flex items-center gap-4 text-left bg-destructive/5 border border-destructive/20 rounded-2xl px-6 py-4">
              <X className="w-6 h-6 text-destructive shrink-0" />
              <span className="text-foreground font-medium">{pain}</span>
            </div>
          ))}

          <div className="flex items-center gap-4 text-left bg-primary/10 border border-primary/30 rounded-2xl px-6 py-4 mt-8">
            <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
            <span className="text-foreground font-bold">
              Or let us handle it — so you can focus on growth.
            </span>
          </div>
        </div>

        <a
          href="/contact"
          className="inline-flex items-center gap-2 px-10 py-5 bg-primary text-primary-foreground rounded-full text-lg font-bold glow-gold-hover transition-all duration-300 active:scale-95"
        >
          Let's Talk
        </a>
      </div>
    </section>
  );
}
