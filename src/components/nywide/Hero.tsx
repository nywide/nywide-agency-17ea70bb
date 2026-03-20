import { ArrowRight, Star } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 sm:pt-28">
      <div className="absolute inset-0 grid-background" />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full mb-8 backdrop-blur-sm">
          <Star className="w-4 h-4 text-primary fill-primary" />
          <span className="text-sm font-medium text-foreground">Trusted by 500+ Businesses Worldwide</span>
        </div>

        <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-tight tracking-tight mb-6" style={{ textWrap: "balance" }}>
          <span className="text-primary text-glow">DOMINATE</span>
          <br />
          <span className="text-foreground">THE DIGITAL SPACE</span>
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
          We build high-performance ad campaigns, elite account architecture, and AI-powered strategies that deliver exceptional ROI.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#contact"
            className="group relative px-10 py-5 bg-primary text-primary-foreground rounded-full text-lg font-bold overflow-hidden inline-flex items-center gap-3 glow-gold-hover transition-all duration-300 active:scale-95"
          >
            <span>Start Your Campaign</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="#services"
            className="px-10 py-5 border border-foreground/20 text-foreground rounded-full text-lg font-bold hover:bg-foreground/10 hover:border-primary/50 transition-all duration-300 active:scale-95"
          >
            Explore Services
          </a>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-xs font-bold text-foreground">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <span className="text-sm ml-2">500+ Happy Clients</span>
          </div>
          <div className="h-8 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-5 h-5 text-primary fill-primary" />
            ))}
            <span className="text-sm ml-2">4.9/5 Rating</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground">
        <span className="text-xs uppercase tracking-widest">Scroll</span>
        <div className="w-6 h-10 border-2 border-muted-foreground/50 rounded-full flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-primary rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}
