import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NLogo } from "@/components/nywide/NLogo";
import { NotificationBell } from "@/components/nywide/NotificationBell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Home, LogOut, Search, CreditCard } from "lucide-react";

interface CardGroup {
  last4: string;
  bank_name: string | null;
  accounts: { id: string; account_id: string; account_name: string }[];
}

export default function AdminCards() {
  const { signOut } = useAuth();
  const [cards, setCards] = useState<CardGroup[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    const { data } = await supabase
      .from("ad_account_cards")
      .select("last4, bank_name, ad_account_id, ad_accounts(id, account_id, account_name)") as any;

    if (!data) return;

    const groupMap = new Map<string, CardGroup>();
    for (const c of data) {
      const key = `${c.last4}-${c.bank_name || ""}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, { last4: c.last4, bank_name: c.bank_name, accounts: [] });
      }
      if (c.ad_accounts) {
        groupMap.get(key)!.accounts.push({
          id: c.ad_accounts.id,
          account_id: c.ad_accounts.account_id,
          account_name: c.ad_accounts.account_name,
        });
      }
    }
    setCards(Array.from(groupMap.values()));
  };

  const filtered = search
    ? cards.filter(c => c.last4.includes(search) || (c.bank_name || "").toLowerCase().includes(search.toLowerCase()))
    : cards;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <NLogo size={32} />
            <span className="font-bold text-lg"><span className="text-primary">NY</span><span className="text-foreground">WIDE</span></span>
            <span className="ml-2 px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded-full">ADMIN</span>
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell recipientType="admin" />
            <Link to="/admin"><Button variant="ghost" size="sm">Back to Admin</Button></Link>
            <Link to="/"><Button variant="ghost" size="icon"><Home className="w-4 h-4" /></Button></Link>
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Bank Cards</h1>

        <div className="relative max-w-sm mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by last4 or bank name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border text-foreground" />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No cards found.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((card, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-bold text-foreground">****{card.last4}</p>
                      <p className="text-sm text-muted-foreground">{card.bank_name || "Unknown Bank"}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                    {card.accounts.length} account{card.accounts.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-1">
                  {card.accounts.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between text-sm py-1 border-t border-border/30">
                      <span className="text-foreground">{acc.account_name}</span>
                      <span className="text-muted-foreground font-mono text-xs">{acc.account_id}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
