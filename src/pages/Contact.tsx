import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/nywide/Header";
import { Footer } from "@/components/nywide/Footer";
import { TechBackground } from "@/components/nywide/TechBackground";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin, Send } from "lucide-react";

export default function Contact() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setSending(true);
    const mailtoLink = `mailto:contact@nywide.agency?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`)}`;
    window.location.href = mailtoLink;
    setTimeout(() => {
      toast({ title: "Opening your email client...", description: "If nothing happens, please email contact@nywide.agency directly." });
      setSending(false);
    }, 1000);
  };

  return (
    <main className="relative min-h-screen bg-card text-foreground overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
      <TechBackground />
      <div className="relative z-10">
        <Header />
        <section className="pt-32 pb-24 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-black mb-4">
                <span className="text-primary text-glow">Contact</span>{" "}
                <span className="text-foreground">Us</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Have a question or want to start your next campaign? Reach out and we'll get back to you shortly.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
              <div className="lg:col-span-3">
                <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-8 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Name *</Label>
                      <Input placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border text-foreground" required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Email *</Label>
                      <Input type="email" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-secondary border-border text-foreground" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Subject *</Label>
                    <Input placeholder="How can we help?" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="bg-secondary border-border text-foreground" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Message *</Label>
                    <Textarea placeholder="Tell us about your project or question..." rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="bg-secondary border-border text-foreground" required />
                  </div>
                  <Button type="submit" disabled={sending} className="w-full bg-primary text-primary-foreground font-bold rounded-full text-lg py-6">
                    <Send className="w-5 h-5 mr-2" />
                    {sending ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
                  <h3 className="text-xl font-bold text-foreground">Get in Touch</h3>
                  <div className="space-y-4">
                    <a href="mailto:contact@nywide.agency" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <span>contact@nywide.agency</span>
                    </a>
                    <a href="tel:+37253957002" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <span>+372 5395 7002</span>
                    </a>
                    <div className="flex items-start gap-3 text-muted-foreground">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <span>Saani tn 2/2-26, Tallinn, 10149, Estonia</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-8">
                  <h3 className="text-lg font-bold text-foreground mb-2">NYWIDE OÜ</h3>
                  <p className="text-sm text-muted-foreground">Registration Number: 17452384</p>
                  <p className="text-sm text-muted-foreground mt-3">
                    A digital marketing agency registered in Estonia, specializing in high-performance advertising solutions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    </main>
  );
}
