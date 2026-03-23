import { Mail, Phone, MapPin, ArrowRight, Instagram, Send } from "lucide-react";
import { Linkedin } from "lucide-react";

const footerLinks = {
  services: [
    { label: "Facebook Ad Account Rental", href: "#services" },
    { label: "Marketing Management", href: "#services" },
    { label: "Creative Content Production", href: "#services" },
    { label: "Influencer Collaboration", href: "#services" },
  ],
  company: [
    { label: "About Us", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Contact", href: "#contact" },
  ],
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

const socialLinks = [
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Send, href: "#", label: "Telegram" },
];

export function Footer() {
  return (
    <footer id="contact" className="relative pt-24 lg:pt-32 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 rounded-[3rem] p-10 lg:p-16 border border-primary/30 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[150px]" />
          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="font-serif text-4xl sm:text-5xl font-black text-foreground mb-4" style={{ textWrap: "balance" }}>
                Ready to <span className="text-primary text-glow">Dominate?</span>
              </h2>
              <p className="text-xl text-muted-foreground">Let's discuss how we can help you achieve extraordinary results.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 lg:justify-end">
              <a href="/contact" className="group inline-flex items-center justify-center gap-3 px-8 py-5 bg-primary text-primary-foreground rounded-full text-lg font-bold glow-gold-hover transition-all duration-300 active:scale-95">
                <span>Contact Us</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-16 border-b border-border">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg glow-gold">
                <span className="font-serif font-black text-2xl text-black">N</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-xl font-serif font-bold text-foreground">NYWIDE</span>
                <span className="text-[10px] font-semibold text-muted-foreground tracking-[0.2em] uppercase">AGENCY</span>
              </div>
            </div>
            <p className="text-muted-foreground max-w-sm mb-6 leading-relaxed">Your trusted partner for digital dominance. We build high-performance campaigns that deliver exceptional ROI.</p>
            <div className="flex items-center gap-4">
              {socialLinks.map((social, i) => (
                <a key={i} href={social.href} aria-label={social.label} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-4">Services</h4>
            <ul className="space-y-3">
              {footerLinks.services.map((link, i) => (
                <li key={i}><a href={link.href} className="text-muted-foreground hover:text-primary transition-colors">{link.label}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link, i) => (
                <li key={i}><a href={link.href} className="text-muted-foreground hover:text-primary transition-colors">{link.label}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-4">Contact</h4>
            <ul className="space-y-3">
              <li><a href="mailto:contact@nywide.agency" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"><Mail className="w-4 h-4" /><span>contact@nywide.agency</span></a></li>
              <li><a href="tel:+37253957002" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"><Phone className="w-4 h-4" /><span>+372 5395 7002</span></a></li>
              <li><div className="flex items-start gap-2 text-muted-foreground"><MapPin className="w-4 h-4 mt-1 shrink-0" /><span>Saani tn 2/2-26, Tallinn, 10149, Estonia</span></div></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} NYWIDE Agency. All rights reserved.</p>
          <div className="flex items-center gap-6">
            {footerLinks.legal.map((link, i) => (
              <a key={i} href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">{link.label}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
