import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NLogo } from "@/components/nywide/NLogo";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Wallet, Monitor, FileText, Receipt, Plus, LogOut, Home,
  DollarSign, Clock, CheckCircle, XCircle, AlertCircle
} from "lucide-react";

export default function Dashboard() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpMethod, setTopUpMethod] = useState("manual");
  const [preferredLimit, setPreferredLimit] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("wallet");

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    const [accounts, txns, invs] = await Promise.all([
      supabase.from("ad_accounts").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
    ]);
    if (accounts.data) setAdAccounts(accounts.data);
    if (txns.data) setTransactions(txns.data);
    if (invs.data) setInvoices(invs.data);
  };

  const handleTopUp = async () => {
    if (!topUpAmount || Number(topUpAmount) <= 0) return;
    setLoading(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: user!.id,
      type: "top_up",
      amount: Number(topUpAmount),
      status: topUpMethod === "manual" ? "pending" : "pending",
      payment_method: topUpMethod,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Top-up request submitted", description: topUpMethod === "manual" ? "Admin will process your request." : "Processing payment..." });
      setTopUpOpen(false);
      setTopUpAmount("");
      fetchData();
    }
  };

  const hasActiveAccounts = adAccounts.some(a => a.status === "active");

  const handleRequestAccount = async () => {
    // If user already has active accounts, preferred limit is required
    if (hasActiveAccounts && !preferredLimit) {
      toast({ title: "Initial Balance required", description: "Please specify an initial balance for additional accounts.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("account_requests").insert({
      user_id: user!.id,
      platform: "facebook",
      preferred_limit: preferredLimit || null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Request submitted", description: "Admin will review your request." });
      setRequestOpen(false);
      setPreferredLimit("");
    }
  };

  const handleGenerateInvoice = async (txn: any) => {
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from("invoices").insert({
      user_id: user!.id,
      invoice_number: invoiceNumber,
      amount: txn.amount,
      currency: txn.currency,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Invoice generated", description: `Invoice ${invoiceNumber} created.` });
      fetchData();
    }
  };

  const statusIcon = (status: string) => {
    if (status === "completed" || status === "active") return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === "pending") return <Clock className="w-4 h-4 text-primary" />;
    if (status === "rejected" || status === "suspended") return <XCircle className="w-4 h-4 text-destructive" />;
    return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  };

  const tabs = [
    { id: "wallet", label: "Wallet", icon: Wallet },
    { id: "accounts", label: "Ad Accounts", icon: Monitor },
    { id: "transactions", label: "Transactions", icon: FileText },
    { id: "invoices", label: "Invoices", icon: Receipt },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <NLogo size={32} />
            <span className="font-bold text-lg"><span className="text-primary">NY</span><span className="text-foreground">WIDE</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{profile?.full_name || user?.email}</span>
            <Link to="/"><Button variant="ghost" size="icon"><Home className="w-4 h-4" /></Button></Link>
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Dashboard</h1>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Wallet Tab */}
        {activeTab === "wallet" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Available Balance</p>
                  <p className="text-5xl font-bold text-foreground">
                    <span className="text-primary">$</span>{Number(profile?.wallet_balance || 0).toFixed(2)}
                  </p>
                </div>
                <Button onClick={() => setTopUpOpen(true)} className="bg-primary text-primary-foreground font-bold rounded-full px-6 glow-gold-hover">
                  <Plus className="w-4 h-4 mr-2" />Top Up
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Active Accounts</p>
                <p className="text-2xl font-bold text-foreground">{adAccounts.filter(a => a.status === "active").length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Total Transactions</p>
                <p className="text-2xl font-bold text-foreground">{transactions.length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Total Invoices</p>
                <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Ad Accounts Tab */}
        {activeTab === "accounts" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">Your Ad Accounts</h2>
              <Button onClick={() => setRequestOpen(true)} className="bg-primary text-primary-foreground font-bold rounded-full px-5">
                <Plus className="w-4 h-4 mr-2" />Request Account
              </Button>
            </div>
            {adAccounts.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <Monitor className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No ad accounts yet. Request one to get started!</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-4 text-muted-foreground font-medium">Account Name</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Account ID</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Currency</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Timezone</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Spending Limit</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Current Spend</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adAccounts.map((acc) => (
                        <tr key={acc.id} className="border-b border-border/50 hover:bg-secondary/50">
                          <td className="p-4 text-foreground font-medium">{acc.account_name}</td>
                          <td className="p-4 text-foreground font-mono text-xs">{acc.account_id}</td>
                          <td className="p-4 text-foreground">{acc.currency}</td>
                          <td className="p-4 text-foreground text-xs">{acc.timezone}</td>
                          <td className="p-4 text-foreground">${Number(acc.spend_limit).toFixed(2)}</td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <span className="text-foreground">${Number(acc.current_spend).toFixed(2)}</span>
                              <Progress value={acc.spend_limit > 0 ? (acc.current_spend / acc.spend_limit) * 100 : 0} className="h-1.5" />
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="flex items-center gap-1.5">
                              {statusIcon(acc.status)}
                              <span className="capitalize text-muted-foreground">{acc.status}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Transaction History</h2>
            {transactions.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No transactions yet.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-4 text-muted-foreground font-medium">Date</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Type</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Amount</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Method</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn) => (
                        <tr key={txn.id} className="border-b border-border/50 hover:bg-secondary/50">
                          <td className="p-4 text-foreground">{new Date(txn.created_at).toLocaleDateString()}</td>
                          <td className="p-4 capitalize text-foreground">{txn.type.replace("_", " ")}</td>
                          <td className="p-4 font-medium text-foreground">
                            <span className={txn.type === "top_up" ? "text-green-500" : "text-destructive"}>
                              {txn.type === "top_up" ? "+" : "-"}${Number(txn.amount).toFixed(2)}
                            </span>
                          </td>
                          <td className="p-4"><span className="flex items-center gap-1.5">{statusIcon(txn.status)}<span className="capitalize">{txn.status}</span></span></td>
                          <td className="p-4 text-muted-foreground capitalize">{txn.payment_method || "—"}</td>
                          <td className="p-4">
                            {txn.status === "completed" && (
                              <Button size="sm" variant="ghost" onClick={() => handleGenerateInvoice(txn)} className="text-primary hover:text-primary">
                                <Receipt className="w-3.5 h-3.5 mr-1" />Invoice
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === "invoices" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Invoices</h2>
            {invoices.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No invoices generated yet.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {invoices.map((inv) => (
                  <div key={inv.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{inv.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()} · ${Number(inv.amount).toFixed(2)} {inv.currency}</p>
                    </div>
                    <Button size="sm" variant="outline" className="rounded-full border-border" disabled={!inv.pdf_url}>
                      {inv.pdf_url ? "Download" : "PDF Pending"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top Up Dialog */}
      <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Top Up Wallet</DialogTitle>
            <DialogDescription>Add funds to your wallet balance.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Amount (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="number" min="10" placeholder="100" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} className="pl-10 bg-secondary border-border text-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Minimum: $10</p>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "manual", label: "Bank / Crypto" },
                  { id: "stripe", label: "Card (Stripe)" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setTopUpMethod(m.id)}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                      topUpMethod === m.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleTopUp} disabled={loading || !topUpAmount} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
              {loading ? "Processing..." : "Submit Top Up"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Account Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Request Ad Account</DialogTitle>
            <DialogDescription>Request a new Facebook ad account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">
                Initial Balance (USD){hasActiveAccounts ? " *" : " (optional)"}
              </Label>
              <Input
                placeholder={hasActiveAccounts ? "Required for additional accounts" : "e.g. 1000 or leave empty"}
                value={preferredLimit}
                onChange={(e) => setPreferredLimit(e.target.value)}
                className="bg-secondary border-border text-foreground"
                required={hasActiveAccounts}
              />
              {!hasActiveAccounts && (
                <p className="text-xs text-muted-foreground">Optional for your first account request.</p>
              )}
            </div>
            <Button onClick={handleRequestAccount} disabled={loading} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
