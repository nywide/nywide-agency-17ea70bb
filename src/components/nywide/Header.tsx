import { useState, useEffect } from "react";
import { NLogo } from "./NLogo";

export function Header() {
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const navLinks = [
    { href: "#services", label: "Services" },
    { href: "#products", label: "Pricing" },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4 sm:pt-6">
      <nav
        className={`relative flex items-center gap-2 sm:gap-4 lg:gap-6 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 rounded-[50px] sm:rounded-[60px] transition-all duration-700 ease-out ${
          isAnimated ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-x-0 -translate-y-4"
        }`}
        style={{
          background: "rgba(15, 15, 15, 0.9)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: isAnimated
            ? "0 0 0 1px rgba(255, 184, 0, 0.15), 0 4px 30px rgba(0, 0, 0, 0.5), 0 0 60px rgba(255, 184, 0, 0.05)"
            : "none",
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div
          className="absolute inset-0 rounded-[50px] sm:rounded-[60px] pointer-events-none overflow-hidden"
          style={{ background: "linear-gradient(180deg, rgba(255, 184, 0, 0.03) 0%, transparent 50%)" }}
        />

        <a href="#" className="relative z-10 flex items-center gap-2 group transition-transform duration-300 hover:scale-105" aria-label="NYWIDE Home">
          <NLogo size={38} className="sm:w-[42px] sm:h-[42px]" />
          <span className="hidden sm:block font-sans font-bold text-lg tracking-tight">
            <span className="text-primary">NY</span>
            <span className="text-foreground">WIDE</span>
          </span>
        </a>

        <div className="hidden md:block w-px h-6 bg-foreground/10" />

        <div className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative px-3 lg:px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:block w-px h-6 bg-foreground/10" />

        <a
          href="#contact"
          className="relative z-10 px-4 sm:px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:shadow-[0_0_20px_rgba(255,184,0,0.4)] transition-all duration-300 active:scale-95"
        >
          Get Started
        </a>
      </nav>
    </header>
  );
}
