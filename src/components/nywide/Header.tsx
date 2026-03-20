import { useState, useEffect } from "react";
import { NLogo } from "./NLogo";
import { Globe } from "lucide-react";

const languages = [
  { code: "en", label: "EN" },
  { code: "ar", label: "AR" },
  { code: "fr", label: "FR" },
];

export function Header() {
  const [isAnimated, setIsAnimated] = useState(false);
  const [currentLang, setCurrentLang] = useState("en");
  const [langOpen, setLangOpen] = useState(false);

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
            ? "0 0 0 1px rgba(255, 184, 0, 0.25), 0 4px 30px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 184, 0, 0.12), 0 0 80px rgba(255, 184, 0, 0.06)"
            : "none",
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Gold glow overlay */}
        <div
          className="absolute inset-0 rounded-[50px] sm:rounded-[60px] pointer-events-none overflow-hidden"
          style={{ background: "linear-gradient(180deg, rgba(255, 184, 0, 0.06) 0%, transparent 50%)" }}
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

        {/* Language Switcher */}
        <div className="relative z-10">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300 rounded-full hover:bg-foreground/5"
            aria-label="Switch language"
          >
            <Globe className="w-4 h-4" />
            <span className="uppercase text-xs font-semibold tracking-wide">{currentLang}</span>
          </button>
          {langOpen && (
            <div
              className="absolute top-full right-0 mt-2 py-1 rounded-xl min-w-[80px] border border-border/50"
              style={{
                background: "rgba(15, 15, 15, 0.95)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 184, 0, 0.08)",
              }}
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => { setCurrentLang(lang.code); setLangOpen(false); }}
                  className={`block w-full px-4 py-2 text-left text-sm font-medium transition-colors duration-200 ${
                    currentLang === lang.code
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <a
            href="#login"
            className="px-4 sm:px-5 py-2 border border-primary/50 text-muted-foreground hover:text-primary hover:border-primary rounded-full text-sm font-bold transition-all duration-300 active:scale-95"
          >
            Log in
          </a>
          <a
            href="#signup"
            className="px-4 sm:px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:shadow-[0_0_20px_rgba(255,184,0,0.4)] transition-all duration-300 active:scale-95"
          >
            Sign up
          </a>
        </div>
      </nav>
    </header>
  );
}