import { useState, useEffect, useCallback } from "react";
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
  DollarSign, Clock, CheckCircle, XCircle, AlertCircle,
  ArrowUpRight, ArrowDownLeft, Search, LayoutDashboard, RefreshCw
} from "lucide-react";

const PAGE_SIZE = 50;

export default function Dashboard() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txnCount, setTxnCount] = useState(0);
  const [txnPage, setTxnPage] = useState(0);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invCount, setInvCount] = useState(0);
  const [invPage, setInvPage] = useState(0);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState<{ open: boolean; account?: any }>({ open: false });
  const [withdrawOpen, setWithdrawOpen] = useState<{ open: boolean; account?: any }>({ open: false });
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpMethod, setTopUpMethod] = useState("manual");
  const [transferAmount, setTransferAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [commissionRate, setCommissionRate] = useState(6);
  const [txnSearch, setTxnSearch] = useState("");
  const [txnTypeFilter, setTxnTypeFilter] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [fbBalances, setFbBalances] = useState<Record<string, { spend_cap: number; amount_spent: number }>>({});
  const [refreshingAccount, setRefreshingAccount] = useState<string | null>(null);
  const [dashStats, setDashStats] = useState({ totalSpent: 0, txnCount: 0, invCount: 0 });

  // Account request form fields
  const [requestPlatform, setRequestPlatform] = useState("facebook");
  const [requestAccountName, setRequestAccountName] = useState("");
  const [requestCurrency, setRequestCurrency] = useState("USD");
  const [requestTimezone, setRequestTimezone] = useState("America/New_York");
  const [requestPreferredLimit, setRequestPreferredLimit] = useState("");

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchCommission();
      fetchDashStats();
    }
  }, [user]);

  useEffect(() => {
    if (user && activeTab === "transactions") fetchTransactions();
  }, [user, activeTab, txnPage, txnSearch, txnTypeFilter]);

  useEffect(() => {
    if (user && activeTab === "invoices") fetchInvoices();
  }, [user, activeTab, invPage, invoiceSearch]);

  const fetchAccounts = async () => {
    const { data } = await supabase.from("ad_accounts").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    if (data) {
      setAdAccounts(data);
      const accountIds = data.map((a: any) => a.account_id);
      if (accountIds.length > 0) {
        try {
          const { data: fbData } = await supabase.functions.invoke("facebook-api", {
            body: { action: "batch_get_spend_limits", account_ids: accountIds },
          });
          if (fbData?.results) setFbBalances(fbData.results);
        } catch { /* use local data */ }
      }
    }
  };

  const fetchCommission = async () => {
    const [overrideRes, settingsRes] = await Promise.all([
      supabase.from("user_commission_overrides").select("rate").eq("user_id", user!.id).maybeSingle(),
      supabase.from("commission_settings").select("rate").limit(1).single(),
    ]);
    if (overrideRes.data) setCommissionRate(overrideRes.data.rate);
    else if (settingsRes.data) setCommissionRate(settingsRes.data.rate);
  };

  const fetchDashStats = async () => {
    const [txnRes, invRes, spentRes] = await Promise.all([
      supabase.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      supabase.from("invoices").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      supabase.from("transactions").select("amount").eq("user_id", user!.id).eq("type", "wallet_to_account").eq("status", "completed"),
    ]);
    setDashStats({
      txnCount: txnRes.count || 0,
      invCount: invRes.count || 0,
      totalSpent: (spentRes.data || []).reduce((s: number, t: any) => s + Number(t.amount), 0),
    });
  };

  const fetchTransactions = async () => {
    let query = supabase.from("transactions").select("*", { count: "exact" }).eq("user_id", user!.id);
    if (txnTypeFilter) query = query.eq("type", txnTypeFilter);
    if (txnSearch) query = query.or(`ad_account_id.ilike.%${txnSearch}%,type.ilike.%${txnSearch}%`);
    const { data, count } = await query.order("created_at", { ascending: false }).range(txnPage * PAGE_SIZE, (txnPage + 1) * PAGE_SIZE - 1);
    if (data) setTransactions(data);
    setTxnCount(count || 0);
  };

  const fetchInvoices = async () => {
    let query = supabase.from("invoices").select("*", { count: "exact" }).eq("user_id", user!.id);
    if (invoiceSearch) query = query.ilike("invoice_number", `%${invoiceSearch}%`);
    const { data, count } = await query.order("created_at", { ascending: false }).range(invPage * PAGE_SIZE, (invPage + 1) * PAGE_SIZE - 1);
    if (data) setInvoices(data);
    setInvCount(count || 0);
  };

  const refreshAccountBalance = async (accountId: string) => {
    setRefreshingAccount(accountId);
    try {
      const { data } = await supabase.functions.invoke("facebook-api", {
        body: { action: "refresh_balance", ad_account_id: accountId },
      });
      if (data && !data.error) {
        setFbBalances(prev => ({ ...prev, [accountId]: { spend_cap: data.spend_cap, amount_spent: data.amount_spent } }));
        toast({ title: "Balance refreshed" });
      }
    } catch { /* ignore */ }
    setRefreshingAccount(null);
  };

  const handleTopUp = async () => {
    console.log("[Dashboard] handleTopUp called", { topUpAmount, topUpMethod });
    if (!topUpAmount || Number(topUpAmount) < 10) {
      toast({ title: "Minimum $10", variant: "destructive" });
      return;
    }
    setTopUpLoading(true);
    try {
      if (topUpMethod === "manual") {
        const insertData = {
          user_id: user!.id, amount: Number(topUpAmount), currency: "USD", payment_method: topUpMethod, status: "pending",
        };
        console.log("[Dashboard] Inserting topup request:", insertData);
        const { data, error } = await supabase.from("topup_requests").insert(insertData as any).select();
        console.log("[Dashboard] Topup insert result:", { data, error });
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Top-up request submitted", description: "Admin will review and approve your request." });
          setTopUpOpen(false);
          setTopUpAmount("");
        }
      } else {
        const { data, error } = await supabase.from("transactions").insert({
          user_id: user!.id, type: "wallet_topup", amount: Number(topUpAmount),
          status: "pending", payment_method: topUpMethod,
        }).select();
        console.log("[Dashboard] Stripe topup result:", { data, error });
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Top-up request submitted", description: "Processing payment..." });
          setTopUpOpen(false);
          setTopUpAmount("");
          fetchDashStats();
        }
      }
    } catch (err: any) {
      console.error("[Dashboard] handleTopUp exception:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setTopUpLoading(false);
    }
  };

  const hasActiveAccounts = adAccounts.some(a => a.status === "active");

  const handleRequestAccount = async () => {
    console.log("[Dashboard] handleRequestAccount called");
    if (!requestAccountName) {
      toast({ title: "Account Name is required", variant: "destructive" });
      return;
    }
    if (!requestCurrency) {
      toast({ title: "Currency is required", variant: "destructive" });
      return;
    }
    if (!requestTimezone) {
      toast({ title: "Timezone is required", variant: "destructive" });
      return;
    }
    if (hasActiveAccounts && !requestPreferredLimit) {
      toast({ title: "Initial Balance required", description: "Please specify an initial balance for additional accounts.", variant: "destructive" });
      return;
    }
    setRequestLoading(true);
    try {
      const insertData = {
        user_id: user!.id,
        platform: requestPlatform,
        preferred_limit: requestPreferredLimit || null,
        account_name: requestAccountName,
        currency: requestCurrency,
        timezone: requestTimezone,
      };
      console.log("[Dashboard] Inserting account request:", insertData);
      const { data, error } = await supabase.from("account_requests").insert(insertData as any).select();
      console.log("[Dashboard] Insert result:", { data, error });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Request submitted", description: "Admin will review your request." });
        setRequestOpen(false);
        setRequestPreferredLimit("");
        setRequestPlatform("facebook");
        setRequestAccountName("");
        setRequestCurrency("USD");
        setRequestTimezone("America/New_York");
      }
    } catch (err: any) {
      console.error("[Dashboard] handleRequestAccount exception:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRequestLoading(false);
    }
  };

  const handleTransferToAccount = async () => {
    const amount = Number(transferAmount);
    if (!amount || amount <= 0) return;
    if (amount > Number(profile?.wallet_balance || 0)) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }
    setTransferLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("facebook-api", {
        body: { action: "wallet_to_account", ad_account_id: transferOpen.account.account_id, amount },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Transfer successful", description: `$${data.amount_sent.toFixed(2)} sent to account (commission: $${data.commission.toFixed(2)})` });
      setTransferOpen({ open: false });
      setTransferAmount("");
      await refreshProfile();
      fetchAccounts();
      fetchDashStats();
    } catch (err: any) {
      toast({ title: "Transfer failed", description: err.message, variant: "destructive" });
    }
    setTransferLoading(false);
  };

  const handleWithdrawToWallet = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) return;
    setWithdrawLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("facebook-api", {
        body: { action: "account_to_wallet", ad_account_id: withdrawOpen.account.account_id, amount },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Withdrawal successful", description: `$${data.refund.toFixed(2)} added to your wallet` });
      setWithdrawOpen({ open: false });
      setWithdrawAmount("");
      await refreshProfile();
      fetchAccounts();
      fetchDashStats();
    } catch (err: any) {
      toast({ title: "Withdrawal failed", description: err.message, variant: "destructive" });
    }
    setWithdrawLoading(false);
  };

  const handleGenerateInvoice = async (txn: any) => {
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from("invoices").insert({
      user_id: user!.id, invoice_number: invoiceNumber, amount: txn.amount, currency: txn.currency,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Invoice generated", description: `Invoice ${invoiceNumber} created.` });
      fetchInvoices();
      fetchDashStats();
    }
  };

  const statusIcon = (status: string) => {
    if (status === "completed" || status === "active") return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === "pending") return <Clock className="w-4 h-4 text-primary" />;
    if (status === "rejected" || status === "suspended") return <XCircle className="w-4 h-4 text-destructive" />;
    return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  };

  const txnTypeLabel = (type: string) => {
    switch (type) {
      case "wallet_topup": return "Wallet Top-Up";
      case "wallet_to_account": return "Transfer to Account";
      case "account_to_wallet": return "Withdraw to Wallet";
      case "top_up": return "Wallet Top-Up";
      default: return type.replace(/_/g, " ");
    }
  };

  const txnAmountColor = (type: string) => {
    if (type === "wallet_topup" || type === "top_up" || type === "account_to_wallet") return "text-green-500";
    return "text-destructive";
  };

  const txnAmountPrefix = (type: string) => {
    if (type === "wallet_topup" || type === "top_up" || type === "account_to_wallet") return "+";
    return "-";
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "accounts", label: "Ad Accounts", icon: Monitor },
    { id: "transactions", label: "Transactions", icon: FileText },
    { id: "invoices", label: "Invoices", icon: Receipt },
  ];

  const transferCommission = Number(transferAmount) * (commissionRate / 100);
  const transferNet = Number(transferAmount) - transferCommission;
  const withdrawRefund = Number(withdrawAmount) / (1 - commissionRate / 100);

  const getAccountSpendLimit = (acc: any) => {
    const fb = fbBalances[acc.account_id];
    if (fb) return fb.spend_cap;
    return Number(acc.spend_limit);
  };

  const getAccountSpent = (acc: any) => {
    const fb = fbBalances[acc.account_id];
    if (fb) return fb.amount_spent;
    return Number(acc.amount_spent || acc.current_spend || 0);
  };

  const getAccountRemaining = (acc: any) => {
    return Math.max(0, getAccountSpendLimit(acc) - getAccountSpent(acc));
  };

  const txnTotalPages = Math.ceil(txnCount / PAGE_SIZE);
  const invTotalPages = Math.ceil(invCount / PAGE_SIZE);

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
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Platform Balance</p>
                  <p className="text-5xl font-bold text-foreground">
                    <span className="text-primary">$</span>{Number(profile?.wallet_balance || 0).toFixed(2)}
                  </p>
                </div>
                <Button onClick={() => setTopUpOpen(true)} className="bg-primary text-primary-foreground font-bold rounded-full px-6">
                  <Plus className="w-4 h-4 mr-2" />Add Funds
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Active Accounts</p>
                <p className="text-2xl font-bold text-foreground">{adAccounts.filter(a => a.status === "active").length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Total Spent</p>
                <p className="text-2xl font-bold text-foreground">${dashStats.totalSpent.toFixed(2)}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Total Transactions</p>
                <p className="text-2xl font-bold text-foreground">{dashStats.txnCount}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Total Invoices</p>
                <p className="text-2xl font-bold text-foreground">{dashStats.invCount}</p>
              </div>
            </div>

            {adAccounts.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-3">Ad Accounts</h2>
                <div className="grid gap-3">
                  {adAccounts.slice(0, 3).map((acc) => (
                    <div key={acc.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{acc.account_name}</p>
                        <p className="text-sm text-muted-foreground">{acc.account_id} · {acc.platform} · {acc.currency}</p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="font-bold text-foreground">${getAccountRemaining(acc).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">Limit: ${getAccountSpendLimit(acc).toFixed(2)} · Spent: ${getAccountSpent(acc).toFixed(2)}</p>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => refreshAccountBalance(acc.account_id)}
                          disabled={refreshingAccount === acc.account_id} className="h-8 w-8">
                          <RefreshCw className={`w-3.5 h-3.5 ${refreshingAccount === acc.account_id ? "animate-spin" : ""}`} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              <div className="grid gap-4">
                {adAccounts.map((acc) => {
                  const balance = getAccountBalance(acc);
                  const spent = getAccountSpent(acc);
                  return (
                    <div key={acc.id} className="bg-card border border-border rounded-xl p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Account Name</p>
                            <p className="text-sm font-medium text-foreground">{acc.account_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Account ID</p>
                            <p className="text-sm font-mono text-foreground">{acc.account_id}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Platform</p>
                            <p className="text-sm text-foreground capitalize">{acc.platform}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Account Balance</p>
                            <p className="text-sm font-medium text-foreground">${balance.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Currency</p>
                            <p className="text-sm text-foreground">{acc.currency}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Timezone</p>
                            <p className="text-sm text-foreground text-xs">{acc.timezone}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <span className="flex items-center gap-1.5 text-sm">
                              {statusIcon(acc.status)}
                              <span className="capitalize text-muted-foreground">{acc.status}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => refreshAccountBalance(acc.account_id)}
                            disabled={refreshingAccount === acc.account_id} className="rounded-full">
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshingAccount === acc.account_id ? "animate-spin" : ""}`} />
                          </Button>
                          {acc.status === "active" && (
                            <>
                              <Button size="sm" onClick={() => { setTransferOpen({ open: true, account: acc }); setTransferAmount(""); }}
                                className="bg-primary text-primary-foreground font-bold rounded-full">
                                <ArrowUpRight className="w-3.5 h-3.5 mr-1" />Add Funds
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setWithdrawOpen({ open: true, account: acc }); setWithdrawAmount(""); }}
                                className="rounded-full border-primary text-primary">
                                <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />Withdraw
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {balance > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Spent: ${spent.toFixed(2)}</span>
                            <span>Balance: ${balance.toFixed(2)}</span>
                          </div>
                          <Progress value={balance > 0 ? (spent / balance) * 100 : 0} className="h-1.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Transaction History</h2>
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search transactions..." value={txnSearch} onChange={(e) => { setTxnSearch(e.target.value); setTxnPage(0); }} className="pl-10 bg-secondary border-border text-foreground" />
              </div>
              <select value={txnTypeFilter} onChange={(e) => { setTxnTypeFilter(e.target.value); setTxnPage(0); }} className="h-10 rounded-md bg-secondary border border-border px-3 text-foreground text-sm">
                <option value="">All types</option>
                <option value="wallet_topup">Wallet Top-Up</option>
                <option value="wallet_to_account">Transfer to Account</option>
                <option value="account_to_wallet">Withdraw to Wallet</option>
              </select>
            </div>
            {transactions.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No transactions found.</p>
              </div>
            ) : (
              <>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border">
                        <th className="text-left p-4 text-muted-foreground font-medium">Date</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Type</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Amount</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Commission</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Account</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Action</th>
                      </tr></thead>
                      <tbody>
                        {transactions.map((txn) => (
                          <tr key={txn.id} className="border-b border-border/50 hover:bg-secondary/50">
                            <td className="p-4 text-foreground">{new Date(txn.created_at).toLocaleDateString()}</td>
                            <td className="p-4 text-foreground">{txnTypeLabel(txn.type)}</td>
                            <td className="p-4 font-medium">
                              <span className={txnAmountColor(txn.type)}>{txnAmountPrefix(txn.type)}${Number(txn.amount).toFixed(2)}</span>
                            </td>
                            <td className="p-4 text-muted-foreground">{txn.commission ? `$${Number(txn.commission).toFixed(2)}` : "—"}</td>
                            <td className="p-4"><span className="flex items-center gap-1.5">{statusIcon(txn.status)}<span className="capitalize">{txn.status}</span></span></td>
                            <td className="p-4 text-muted-foreground font-mono text-xs">{txn.ad_account_id || "—"}</td>
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
                {txnTotalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Page {txnPage + 1} of {txnTotalPages} ({txnCount} total)</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={txnPage === 0} onClick={() => setTxnPage(p => p - 1)} className="rounded-full border-border">Previous</Button>
                      <Button size="sm" variant="outline" disabled={txnPage >= txnTotalPages - 1} onClick={() => setTxnPage(p => p + 1)} className="rounded-full border-border">Next</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === "invoices" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Invoices</h2>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search invoices..." value={invoiceSearch} onChange={(e) => { setInvoiceSearch(e.target.value); setInvPage(0); }} className="pl-10 bg-secondary border-border text-foreground" />
            </div>
            {invoices.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No invoices found.</p>
              </div>
            ) : (
              <>
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
                {invTotalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Page {invPage + 1} of {invTotalPages} ({invCount} total)</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={invPage === 0} onClick={() => setInvPage(p => p - 1)} className="rounded-full border-border">Previous</Button>
                      <Button size="sm" variant="outline" disabled={invPage >= invTotalPages - 1} onClick={() => setInvPage(p => p + 1)} className="rounded-full border-border">Next</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Top Up Dialog */}
      <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Funds to Wallet</DialogTitle>
            <DialogDescription>No commission is charged on wallet top-ups.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Amount (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="number" min="10" placeholder="100" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} className="pl-10 bg-secondary border-border text-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Minimum: $10. Full amount goes to your wallet.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                {[{ id: "manual", label: "Bank / Crypto" }, { id: "stripe", label: "Card (Stripe)" }].map((m) => (
                  <button key={m.id} onClick={() => setTopUpMethod(m.id)}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${topUpMethod === m.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:border-primary/50"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              {topUpMethod === "manual" && <p className="text-xs text-muted-foreground">Your request will be sent to admin for approval.</p>}
            </div>
            <Button onClick={handleTopUp} disabled={topUpLoading || !topUpAmount} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
              {topUpLoading ? "Processing..." : "Submit Top Up"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer to Account Dialog */}
      <Dialog open={transferOpen.open} onOpenChange={(open) => setTransferOpen({ ...transferOpen, open })}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Transfer to Account</DialogTitle>
            <DialogDescription>Add funds from your wallet to {transferOpen.account?.account_name}. A {commissionRate}% commission applies.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Amount (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="number" min="1" placeholder="50" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="pl-10 bg-secondary border-border text-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Available: ${Number(profile?.wallet_balance || 0).toFixed(2)}</p>
            </div>
            {Number(transferAmount) > 0 && (
              <div className="bg-secondary rounded-xl p-4 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Amount from wallet</span><span className="text-foreground">${Number(transferAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Commission ({commissionRate}%)</span><span className="text-destructive">-${transferCommission.toFixed(2)}</span>
                </div>
                <div className="border-t border-border pt-1 flex justify-between font-medium text-foreground">
                  <span>Sent to account</span><span className="text-primary">${transferNet.toFixed(2)}</span>
                </div>
              </div>
            )}
            <Button onClick={handleTransferToAccount} disabled={transferLoading || !transferAmount || Number(transferAmount) <= 0 || Number(transferAmount) > Number(profile?.wallet_balance || 0)} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
              {transferLoading ? "Processing..." : "Transfer to Account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw to Wallet Dialog */}
      <Dialog open={withdrawOpen.open} onOpenChange={(open) => setWithdrawOpen({ ...withdrawOpen, open })}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Withdraw to Wallet</DialogTitle>
            <DialogDescription>Withdraw funds from {withdrawOpen.account?.account_name} back to your wallet. Commission is refunded proportionally.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Amount to withdraw from account (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="number" min="1" placeholder="30" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="pl-10 bg-secondary border-border text-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Account Balance: ${getAccountBalance(withdrawOpen.account || {}).toFixed(2)}</p>
            </div>
            {Number(withdrawAmount) > 0 && (
              <div className="bg-secondary rounded-xl p-4 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Withdrawn from account</span><span className="text-foreground">${Number(withdrawAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Commission refund</span><span className="text-green-500">+${(withdrawRefund - Number(withdrawAmount)).toFixed(2)}</span>
                </div>
                <div className="border-t border-border pt-1 flex justify-between font-medium text-foreground">
                  <span>Added to wallet</span><span className="text-primary">${withdrawRefund.toFixed(2)}</span>
                </div>
              </div>
            )}
            <Button onClick={handleWithdrawToWallet} disabled={withdrawLoading || !withdrawAmount || Number(withdrawAmount) <= 0} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
              {withdrawLoading ? "Processing..." : "Withdraw to Wallet"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Account Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Request Ad Account</DialogTitle>
            <DialogDescription>Fill in all details below. Admin will review and create the account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Platform *</Label>
              <select value={requestPlatform} onChange={(e) => setRequestPlatform(e.target.value)} className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-foreground text-sm">
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="google">Google</option>
                <option value="snapchat">Snapchat</option>
              </select>
            </div>
            {requestPlatform !== "facebook" && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                Sorry, we are currently out of stock for <strong className="capitalize">{requestPlatform}</strong> accounts. We will notify you when they become available. Please check back later or contact support.
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-foreground">Account Name *</Label>
              <Input placeholder="e.g. Client X - US Campaign" value={requestAccountName} onChange={(e) => setRequestAccountName(e.target.value)} className="bg-secondary border-border text-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-foreground">Currency *</Label>
                <Input placeholder="USD, EUR..." value={requestCurrency} onChange={(e) => setRequestCurrency(e.target.value)} className="bg-secondary border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Timezone *</Label>
                <Input placeholder="America/New_York" value={requestTimezone} onChange={(e) => setRequestTimezone(e.target.value)} className="bg-secondary border-border text-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">
                Initial Balance (USD){hasActiveAccounts ? " *" : " (optional)"}
              </Label>
              <Input type="number" placeholder={hasActiveAccounts ? "Required for additional accounts" : "e.g. 1000 or leave empty"}
                value={requestPreferredLimit} onChange={(e) => setRequestPreferredLimit(e.target.value)}
                className="bg-secondary border-border text-foreground" required={hasActiveAccounts} />
              {!hasActiveAccounts && <p className="text-xs text-muted-foreground">Optional for your first account request.</p>}
            </div>
            <Button onClick={handleRequestAccount} disabled={requestLoading || requestPlatform !== "facebook"} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
              {requestLoading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
