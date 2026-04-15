import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { fromZonedTime } from "date-fns-tz";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NLogo } from "@/components/nywide/NLogo";
import { NotificationBell } from "@/components/nywide/NotificationBell";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Wallet, Monitor, FileText, Receipt, Plus, LogOut, Home,
  DollarSign, Clock, CheckCircle, XCircle, AlertCircle,
  ArrowUpRight, ArrowDownLeft, Search, LayoutDashboard, RefreshCw, ClipboardList, Ban, Settings, Pencil, CalendarDays
} from "lucide-react";
import { createNotification } from "@/lib/notifications";
import { formatDateTime, getCurrentTime } from "@/lib/timezone";

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

  // Date filter for historical cards
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userTimezone, setUserTimezone] = useState("UTC");
  const [historicalStats, setHistoricalStats] = useState({ allTimeAdSpend: 0, totalDeposits: 0 });

  // Account request form fields
  const [requestPlatform, setRequestPlatform] = useState("facebook");
  const [requestAccountName, setRequestAccountName] = useState("");
  const [requestPreferredLimit, setRequestPreferredLimit] = useState("");
  const [requestFacebookEmail, setRequestFacebookEmail] = useState("");

  // Rename account dialog
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; account?: any }>({ open: false });
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  // Pending account requests & topup requests
  const [accountRequests, setAccountRequests] = useState<any[]>([]);
  const [pendingTopups, setPendingTopups] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchCommission();
      fetchDashStats();
      fetchAccountRequests();
      fetchPendingTopups();
      fetchUserTimezone();
    }
  }, [user]);

  // Fetch historical stats when date filter changes
  useEffect(() => {
    if (user) fetchHistoricalStats();
  }, [user, dateFrom, dateTo, adAccounts.length]);

  // Auto-refresh ad accounts: staggered, one account every 60s, cycling through all
  const autoRefreshIndexRef = useRef(0);
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (adAccounts.length === 0) return;
      const idx = autoRefreshIndexRef.current % adAccounts.length;
      const acc = adAccounts[idx];
      console.log(`[Dashboard] Auto-refresh account ${idx + 1}/${adAccounts.length}: ${acc.account_id}`);
      refreshAccountBalance(acc.account_id);
      autoRefreshIndexRef.current = idx + 1;
    }, 60000); // every 60 seconds, one account at a time
    return () => clearInterval(interval);
  }, [user, adAccounts.length]);

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

  const fetchUserTimezone = async () => {
    const { data } = await supabase.from("profiles").select("timezone").eq("id", user!.id).single();
    if (data?.timezone) setUserTimezone(data.timezone);
  };

  const fetchHistoricalStats = async () => {
    const userAccountIds = adAccounts.map(a => a.account_id);

    // All-Time Ad Spend (User) - positive increments in ad_account_transactions
    let spendQuery = supabase
      .from("ad_account_transactions")
      .select("old_amount_spent, new_amount_spent")
      .eq("type", "spend");
    if (userAccountIds.length > 0) {
      spendQuery = spendQuery.in("ad_account_id", userAccountIds);
    } else {
      // No accounts, zero spend
      setHistoricalStats(prev => ({ ...prev, allTimeAdSpend: 0 }));
    }
    const tz = userTimezone || "UTC";
    const startUtc = dateFrom ? fromZonedTime(`${dateFrom}T00:00:00`, tz).toISOString() : null;
    const endUtc = dateTo ? fromZonedTime(`${dateTo}T23:59:59`, tz).toISOString() : null;

    if (startUtc) spendQuery = spendQuery.gte("created_at", startUtc);
    if (endUtc) spendQuery = spendQuery.lte("created_at", endUtc);

    // Total Deposits (Wallet) - completed wallet_topup transactions
    let depositQuery = supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user!.id)
      .eq("type", "wallet_topup")
      .eq("status", "completed");
    if (startUtc) depositQuery = depositQuery.gte("created_at", startUtc);
    if (endUtc) depositQuery = depositQuery.lte("created_at", endUtc);

    const [spendRes, depositRes] = await Promise.all([
      userAccountIds.length > 0 ? spendQuery : Promise.resolve({ data: [] as any[] }),
      depositQuery,
    ]);

    let allTimeAdSpend = 0;
    ((spendRes as any).data || []).forEach((txn: any) => {
      const inc = (Number(txn.new_amount_spent) || 0) - (Number(txn.old_amount_spent) || 0);
      if (inc > 0) allTimeAdSpend += inc;
    });

    const totalDeposits = (depositRes.data || []).reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

    setHistoricalStats({ allTimeAdSpend, totalDeposits });
  };

  const fetchAccountRequests = async () => {
    const { data } = await supabase.from("account_requests").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    if (data) setAccountRequests(data);
  };

  const fetchPendingTopups = async () => {
    const { data } = await supabase.from("topup_requests").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    if (data) setPendingTopups(data);
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
        setFbBalances(prev => ({ ...prev, [accountId]: { spend_cap: data.spend_limit ?? data.spend_cap, amount_spent: data.amount_spent } }));
        toast({ title: "Balance refreshed" });
      }
    } catch { /* ignore */ }
    setRefreshingAccount(null);
  };

  const handleTopUp = async () => {
    console.log("[Dashboard] handleTopUp called", { topUpAmount, topUpMethod });
    if (!topUpAmount || Number(topUpAmount) < 10) {
      toast({ title: "Minimum top-up amount is $10", variant: "destructive" });
      return;
    }
    setTopUpLoading(true);
    try {
      if (topUpMethod === "manual") {
        const insertData = {
          user_id: user!.id, amount: Number(topUpAmount), currency: "USD", payment_method: topUpMethod, status: "pending",
        };
        const { data, error } = await supabase.from("topup_requests").insert(insertData as any).select();
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Top-up request submitted", description: "Admin will review and approve your request." });
          setTopUpOpen(false);
          setTopUpAmount("");
          fetchPendingTopups();
          // Notify admin about new top-up request
          await createNotification({
            recipientType: "admin",
            title: "New top-up request",
            message: `User ${profile?.full_name || user!.email} requested $${Number(topUpAmount).toFixed(2)} top-up via ${topUpMethod}.`,
            type: "new_topup_request",
          });
        }
      } else {
        toast({ title: "Coming Soon", description: "Stripe payments will be available soon.", variant: "default" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setTopUpLoading(false);
    }
  };

  // Count pending requests for first-request logic
  const pendingRequestCount = accountRequests.filter(r => r.status === "pending").length;
  const isFirstRequest = adAccounts.length + pendingRequestCount === 0;
  const hasActiveAccounts = adAccounts.some(a => a.status === "active");

  const handleRequestAccount = async () => {
    if (!requestAccountName) {
      toast({ title: "Account Name is required", variant: "destructive" });
      return;
    }
    const preferredLimit = Number(requestPreferredLimit) || 0;
    // For subsequent requests (not first), require $10 min
    if (!isFirstRequest && preferredLimit < 10) {
      toast({ title: "Initial Balance required (min $10)", description: "Please specify an initial balance of at least $10 for additional accounts.", variant: "destructive" });
      return;
    }
    // For first request, if balance is specified it must be >= $10
    if (isFirstRequest && requestPreferredLimit && preferredLimit > 0 && preferredLimit < 10) {
      toast({ title: "Minimum $10", description: "If providing an initial balance, it must be at least $10.", variant: "destructive" });
      return;
    }
    setRequestLoading(true);
    try {
      let balanceDeducted = false;
      const shouldDeduct = preferredLimit >= 10;
      if (shouldDeduct) {
        // Deduct balance immediately for any request with initial balance >= $10
        const commission = preferredLimit * (commissionRate / 100);
        const totalDeduction = preferredLimit;
        const walletBalance = Number(profile?.wallet_balance || 0);
        if (walletBalance < totalDeduction) {
          toast({ title: "Insufficient wallet balance", description: `You need $${totalDeduction.toFixed(2)} in your wallet (including commission).`, variant: "destructive" });
          setRequestLoading(false);
          return;
        }
        const { error: walletError } = await supabase.from("profiles").update({
          wallet_balance: walletBalance - totalDeduction,
        }).eq("id", user!.id);
        if (walletError) {
          toast({ title: "Error deducting balance", description: walletError.message, variant: "destructive" });
          setRequestLoading(false);
          return;
        }
        await supabase.from("transactions").insert({
          user_id: user!.id, type: "wallet_to_account", amount: totalDeduction,
          commission, status: "pending", payment_method: "platform",
        });
        balanceDeducted = true;
        console.log("[Dashboard] Balance deducted for account request:", { totalDeduction, commission });
      }

      const insertData: any = {
        user_id: user!.id,
        platform: requestPlatform,
        preferred_limit: requestPreferredLimit || null,
        account_name: requestAccountName,
        balance_deducted: balanceDeducted,
        facebook_email: requestPlatform === "facebook" ? requestFacebookEmail || null : null,
      };
      const { error } = await supabase.from("account_requests").insert(insertData).select();
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Request submitted", description: balanceDeducted ? `$${preferredLimit.toFixed(2)} deducted from wallet. Admin will review your request.` : "Admin will review your request." });
        setRequestOpen(false);
        setRequestPreferredLimit("");
        setRequestPlatform("facebook");
        setRequestAccountName("");
        setRequestFacebookEmail("");
        fetchAccountRequests();
        if (balanceDeducted) await refreshProfile();
        // Notify admin about new account request
        await createNotification({
          recipientType: "admin",
          title: "New account request",
          message: `User ${profile?.full_name || user!.email} requested a ${requestPlatform} account "${requestAccountName}".`,
          type: "new_account_request",
        });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRequestLoading(false);
    }
  };

  const handleRenameAccount = async () => {
    if (!renameDialog.account || !renameValue.trim()) return;
    setRenaming(true);
    const { error } = await supabase.from("ad_accounts")
      .update({ user_account_name: renameValue.trim() } as any)
      .eq("id", renameDialog.account.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account renamed" });
      fetchAccounts();
    }
    setRenaming(false);
    setRenameDialog({ open: false });
  };

  const handleTransferToAccount = async () => {
    const amount = Number(transferAmount);
    if (!amount || amount < 10) {
      toast({ title: "Minimum top-up amount is $10", variant: "destructive" });
      return;
    }
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
      pdf_url: null,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Invoice created", description: `Invoice ${invoiceNumber} is pending PDF generation.` });
      fetchInvoices();
      fetchDashStats();
    }
  };

  const statusIcon = (status: string) => {
    if (status === "completed" || status === "active" || status === "approved") return <CheckCircle className="w-4 h-4 text-green-500" />;
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

  // Custom metrics data for dashboard cards
  const [customMetrics, setCustomMetrics] = useState<any[]>([]);
  const [customMetricValues, setCustomMetricValues] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (user) fetchCustomMetrics();
  }, [user, adAccounts.length]);

  const fetchCustomMetrics = async () => {
    const { data } = await supabase.from("user_custom_metrics" as any).select("*").eq("user_id", user!.id);
    if (data && data.length > 0) {
      setCustomMetrics(data as any);
      // Evaluate each metric
      const totalSpendLimit = adAccounts.reduce((s, a) => s + getAccountSpendLimit(a), 0);
      const totalAmountSpent = adAccounts.reduce((s, a) => s + getAccountSpent(a), 0);
      const variables: Record<string, number> = {
        spend_limit: totalSpendLimit,
        amount_spent: totalAmountSpent,
        commission_rate: commissionRate,
        wallet_balance: Number(profile?.wallet_balance || 0),
      };
      const vals: Record<string, number | null> = {};
      for (const m of data as any[]) {
        try {
          let expr = m.formula;
          for (const [key, val] of Object.entries(variables)) {
            expr = expr.replace(new RegExp(key, "g"), String(val));
          }
          const result = new Function(`return (${expr})`)();
          vals[m.id] = typeof result === "number" && !isNaN(result) ? result : null;
        } catch { vals[m.id] = null; }
      }
      setCustomMetricValues(vals);
    } else {
      setCustomMetrics([]);
    }
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "accounts", label: "Ad Accounts", icon: Monitor },
    { id: "requests", label: "My Requests", icon: ClipboardList },
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

  const getAccountDisplayName = (acc: any) => {
    return acc.user_account_name || acc.display_name || acc.account_name;
  };

  const txnTotalPages = Math.ceil(txnCount / PAGE_SIZE);
  const invTotalPages = Math.ceil(invCount / PAGE_SIZE);

  // Combine transactions + pending topups for transaction view
  const pendingTopupAsTransactions = pendingTopups.map(t => ({
    id: t.id,
    created_at: t.created_at,
    type: "wallet_topup",
    amount: t.amount,
    commission: null,
    status: t.status === "approved" ? "completed" : t.status,
    ad_account_id: null,
    payment_method: t.payment_method,
    currency: t.currency,
    _source: "topup_request",
  }));

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
            <NotificationBell recipientType="user" />
            <Link to="/settings"><Button variant="ghost" size="icon"><Settings className="w-4 h-4" /></Button></Link>
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
              <p className="text-xs text-muted-foreground mt-2">Current time ({userTimezone}): {getCurrentTime(userTimezone)}</p>
            </div>

            {/* Date Filter */}
            <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl p-4">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Date filter:</span>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-secondary border-border text-foreground w-40 h-9" />
              <span className="text-muted-foreground">to</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-secondary border-border text-foreground w-40 h-9" />
              {(dateFrom || dateTo) && (
                <Button size="sm" variant="ghost" onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-xs text-muted-foreground">Clear</Button>
              )}
            </div>

            {/* Historical Cards (linked to date filter) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-muted-foreground text-sm">All-Time Ad Spend (User)</p>
                <p className="text-2xl font-bold text-foreground"><span className="text-primary">$</span>{historicalStats.allTimeAdSpend.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">{dateFrom || dateTo ? "Filtered by date range" : "All time"}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Total Deposits (Wallet)</p>
                <p className="text-2xl font-bold text-foreground"><span className="text-primary">$</span>{historicalStats.totalDeposits.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">{dateFrom || dateTo ? "Filtered by date range" : "All time"}</p>
              </div>
            </div>

            {/* Snapshot Cards (unaffected by date filter) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Active Accounts</p>
                <p className="text-2xl font-bold text-foreground">{adAccounts.filter(a => a.status === "active").length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Spending Limit</p>
                <p className="text-2xl font-bold text-foreground"><span className="text-primary">$</span>{adAccounts.reduce((s, a) => s + getAccountSpendLimit(a), 0).toFixed(2)}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Remaining</p>
                <p className="text-2xl font-bold text-foreground"><span className="text-primary">$</span>{adAccounts.reduce((s, a) => s + getAccountRemaining(a), 0).toFixed(2)}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Total Transactions</p>
                <p className="text-2xl font-bold text-foreground">{dashStats.txnCount}</p>
              </div>
            </div>

            {/* Custom Metrics Cards */}
            {customMetrics.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-foreground">Custom Metrics</h2>
                  <Link to="/custom-metrics">
                    <Button size="sm" variant="ghost" className="text-primary text-xs">Manage →</Button>
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customMetrics.map((m: any) => {
                    const val = customMetricValues[m.id];
                    const isAlert = m.alert_enabled && m.threshold !== null && val !== null && (
                      (m.alert_type === "below" && val < m.threshold) ||
                      (m.alert_type === "above" && val > m.threshold)
                    );
                    return (
                      <div key={m.id} className={`bg-card border rounded-xl p-5 ${isAlert ? "border-destructive" : "border-border"}`}>
                        <p className="text-muted-foreground text-sm">{m.name}</p>
                        <p className="text-2xl font-bold text-foreground">
                          {val !== null ? val.toFixed(2) : "N/A"}
                        </p>
                        {isAlert && (
                          <p className="text-xs text-destructive mt-1">⚠️ {m.alert_type === "below" ? "Below" : "Above"} threshold ({m.threshold})</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{m.formula}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-5 text-center">
                <p className="text-muted-foreground text-sm mb-2">No custom metrics defined.</p>
                <Link to="/custom-metrics">
                  <Button size="sm" variant="outline" className="rounded-full border-border text-sm">
                    <Plus className="w-3.5 h-3.5 mr-1" />Create Custom Metric
                  </Button>
                </Link>
              </div>
            )}

            {adAccounts.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-3">Ad Accounts</h2>
                <div className="grid gap-3">
                  {adAccounts.slice(0, 3).map((acc) => (
                    <div key={acc.id} className={`bg-card border rounded-xl p-4 flex items-center justify-between ${acc.is_disabled ? "border-destructive/30 opacity-70" : "border-border"}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{getAccountDisplayName(acc)}</p>
                          {acc.is_disabled && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/20 text-destructive">Disabled</span>}
                        </div>
                        <p className="text-sm text-muted-foreground">{acc.account_id} · {acc.platform} · {acc.currency}</p>
                        {acc.is_disabled && acc.disabled_reason && (
                          <p className="text-xs text-destructive mt-1">Reason: {acc.disabled_reason}</p>
                        )}
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

            {/* Pending Topup Requests on Dashboard */}
            {pendingTopups.filter(t => t.status === "pending").length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-3">Pending Top-Up Requests</h2>
                <div className="grid gap-3">
                  {pendingTopups.filter(t => t.status === "pending").map((t) => (
                    <div key={t.id} className="bg-card border border-primary/20 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">${Number(t.amount).toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground capitalize">{t.payment_method || "Manual"} · {new Date(t.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">Pending</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Account Requests on Dashboard */}
            {accountRequests.filter(r => r.status === "pending").length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-3">Pending Account Requests</h2>
                <div className="grid gap-3">
                  {accountRequests.filter(r => r.status === "pending").map((r) => (
                    <div key={r.id} className="bg-card border border-primary/20 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-foreground">{r.account_name || "Unnamed Account"}</p>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">Pending</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-muted-foreground">
                        <div><span className="text-xs text-muted-foreground">Platform:</span> <span className="text-foreground capitalize">{r.platform}</span></div>
                        <div><span className="text-xs text-muted-foreground">Currency:</span> <span className="text-foreground">{r.currency}</span></div>
                        <div><span className="text-xs text-muted-foreground">Timezone:</span> <span className="text-foreground text-xs">{r.timezone}</span></div>
                        <div><span className="text-xs text-muted-foreground">Balance:</span> <span className="text-foreground">{r.preferred_limit || "N/A"}</span></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
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
              <div>
                <h2 className="text-xl font-bold text-foreground">Your Ad Accounts</h2>
                <p className="text-xs text-muted-foreground mt-1">Auto-refresh: one account every 60s</p>
              </div>
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
                  const spendLimit = getAccountSpendLimit(acc);
                  const spent = getAccountSpent(acc);
                  const remaining = getAccountRemaining(acc);
                  return (
                    <div key={acc.id} className={`bg-card border rounded-xl p-5 ${acc.is_disabled ? "border-destructive/30" : "border-border"}`}>
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Account Name</p>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-foreground">{getAccountDisplayName(acc)}</p>
                              {acc.is_disabled && <Ban className="w-3.5 h-3.5 text-destructive" />}
                              {!acc.is_disabled && (
                                <button onClick={() => { setRenameDialog({ open: true, account: acc }); setRenameValue(acc.user_account_name || acc.account_name); }}
                                  className="text-muted-foreground hover:text-primary transition-colors">
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </div>
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
                            <p className="text-xs text-muted-foreground">Timezone</p>
                            <p className="text-sm text-foreground text-xs">{acc.timezone || "N/A"}</p>
                          </div>
                          {acc.facebook_email && (
                            <div>
                              <p className="text-xs text-muted-foreground">Facebook Email</p>
                              <p className="text-sm text-foreground text-xs">{acc.facebook_email}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground">Spending Limit</p>
                            <p className="text-sm font-medium text-foreground">${spendLimit.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Amount Spent</p>
                            <p className="text-sm font-medium text-foreground">${spent.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Remaining</p>
                            <p className="text-sm font-medium text-primary">${remaining.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Commission</p>
                            <p className="text-sm font-medium text-primary">{commissionRate}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            {acc.is_disabled ? (
                              <span className="flex items-center gap-1.5 text-sm">
                                <Ban className="w-4 h-4 text-destructive" />
                                <span className="text-destructive font-medium">Disabled</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-sm">
                                {statusIcon(acc.status)}
                                <span className="capitalize text-muted-foreground">{acc.status}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => refreshAccountBalance(acc.account_id)}
                            disabled={refreshingAccount === acc.account_id} className="rounded-full">
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshingAccount === acc.account_id ? "animate-spin" : ""}`} />
                          </Button>
                          {acc.status === "active" && !acc.is_disabled && (
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
                      {acc.is_disabled && acc.disabled_reason && (
                        <p className="text-xs text-destructive mt-2">Reason: {acc.disabled_reason}</p>
                      )}
                      {spendLimit > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Spent: ${spent.toFixed(2)}</span>
                            <span>Remaining: ${remaining.toFixed(2)}</span>
                          </div>
                          <Progress value={spendLimit > 0 ? (spent / spendLimit) * 100 : 0} className="h-1.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* My Requests Tab */}
        {activeTab === "requests" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">My Requests</h2>

            {/* Account Requests */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Account Requests</h3>
              {accountRequests.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-8 text-center">
                  <p className="text-muted-foreground">No account requests yet.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {accountRequests.map((r) => (
                    <div key={r.id} className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-foreground">{r.account_name || "Unnamed"}</p>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          r.status === "pending" ? "bg-primary/20 text-primary" :
                          r.status === "approved" ? "bg-green-500/20 text-green-500" :
                          "bg-destructive/20 text-destructive"
                        }`}>{r.status}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
                        <div><span className="text-xs text-muted-foreground">Platform</span><p className="text-foreground capitalize">{r.platform}</p></div>
                        <div><span className="text-xs text-muted-foreground">Currency</span><p className="text-foreground">{r.currency}</p></div>
                        <div><span className="text-xs text-muted-foreground">Timezone</span><p className="text-foreground text-xs">{r.timezone}</p></div>
                        <div><span className="text-xs text-muted-foreground">Initial Balance</span><p className="text-foreground">{r.preferred_limit || "N/A"}</p></div>
                        <div><span className="text-xs text-muted-foreground">Date</span><p className="text-foreground">{new Date(r.created_at).toLocaleDateString()}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top-Up Requests */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Top-Up Requests</h3>
              {pendingTopups.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-8 text-center">
                  <p className="text-muted-foreground">No top-up requests yet.</p>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border">
                      <th className="text-left p-4 text-muted-foreground font-medium">Date</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Amount</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Method</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                    </tr></thead>
                    <tbody>
                      {pendingTopups.map((t) => (
                        <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/50">
                          <td className="p-4 text-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                          <td className="p-4 text-foreground font-medium">${Number(t.amount).toFixed(2)}</td>
                          <td className="p-4 text-foreground capitalize">{t.payment_method || "Manual"}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              t.status === "pending" ? "bg-primary/20 text-primary" :
                              t.status === "approved" ? "bg-green-500/20 text-green-500" :
                              "bg-destructive/20 text-destructive"
                            }`}>{t.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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

            {/* Show pending topups as pending transactions */}
            {pendingTopups.filter(t => t.status === "pending").length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-sm font-medium text-primary mb-2">Pending Top-Up Requests</p>
                {pendingTopups.filter(t => t.status === "pending").map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-sm text-foreground">{formatDateTime(t.created_at, userTimezone)}</span>
                      <span className="text-sm text-foreground">Wallet Top-Up</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-green-500">+${Number(t.amount).toFixed(2)}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary">Pending</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
                            <td className="p-4 text-foreground text-xs">{formatDateTime(txn.created_at, userTimezone)}</td>
                            <td className="p-4 text-foreground">{txnTypeLabel(txn.type)}</td>
                            <td className="p-4 font-medium">
                              <span className={txnAmountColor(txn.type)}>{txnAmountPrefix(txn.type)}${Number(txn.amount).toFixed(2)}</span>
                            </td>
                            <td className="p-4 text-muted-foreground">{txn.commission ? `$${Number(txn.commission).toFixed(2)}` : "—"}</td>
                            <td className="p-4"><span className="flex items-center gap-1.5">{statusIcon(txn.status)}<span className="capitalize">{txn.status}</span></span></td>
                            <td className="p-4 text-muted-foreground font-mono text-xs">{txn.ad_account_id || "—"}</td>
                            <td className="p-4">
                              {txn.status === "completed" && (txn.type === "wallet_topup" || txn.type === "top_up") && (
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{inv.invoice_number}</p>
                          {!inv.pdf_url && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/20 text-primary">Pending</span>
                          )}
                        </div>
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
                <button onClick={() => setTopUpMethod("manual")}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${topUpMethod === "manual" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:border-primary/50"}`}>
                  Bank / Crypto
                </button>
                <button onClick={() => toast({ title: "Coming Soon", description: "Stripe payments will be available soon." })}
                  className="p-3 rounded-xl border text-sm font-medium border-border bg-secondary text-muted-foreground opacity-50 cursor-not-allowed relative">
                  Card (Stripe)
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">Soon</span>
                </button>
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
      <Dialog open={transferOpen.open} onOpenChange={(open) => {
        setTransferOpen({ ...transferOpen, open });
        if (!open) setTransferAmount("");
      }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Transfer to Account</DialogTitle>
            <DialogDescription>Add funds from your wallet to {transferOpen.account?.account_name}. A {commissionRate}% commission applies.</DialogDescription>
          </DialogHeader>
          <DepositDialogBody
            account={transferOpen.account}
            commissionRate={commissionRate}
            walletBalance={Number(profile?.wallet_balance || 0)}
            transferAmount={transferAmount}
            setTransferAmount={setTransferAmount}
            onSubmit={handleTransferToAccount}
            loading={transferLoading}
            getAccountSpendLimit={getAccountSpendLimit}
            getAccountSpent={getAccountSpent}
            refreshAccountBalance={refreshAccountBalance}
          />
        </DialogContent>
      </Dialog>

      {/* Withdraw to Wallet Dialog */}
      <Dialog open={withdrawOpen.open} onOpenChange={(open) => {
        setWithdrawOpen({ ...withdrawOpen, open });
        if (!open) setWithdrawAmount("");
      }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Withdraw to Wallet</DialogTitle>
            <DialogDescription>Withdraw funds from {withdrawOpen.account?.account_name} back to your wallet. Commission is refunded proportionally.</DialogDescription>
          </DialogHeader>
          <WithdrawDialogBody
            account={withdrawOpen.account}
            commissionRate={commissionRate}
            withdrawAmount={withdrawAmount}
            setWithdrawAmount={setWithdrawAmount}
            onSubmit={handleWithdrawToWallet}
            loading={withdrawLoading}
            getAccountSpendLimit={getAccountSpendLimit}
            getAccountSpent={getAccountSpent}
            getAccountRemaining={getAccountRemaining}
            refreshAccountBalance={refreshAccountBalance}
          />
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
                <option value="facebook">Facebook ({commissionRate}% commission)</option>
                <option value="tiktok">TikTok (Not available)</option>
                <option value="google">Google (Not available)</option>
                <option value="snapchat">Snapchat (Not available)</option>
              </select>
              {requestPlatform === "facebook" && (
                <p className="text-xs text-muted-foreground mt-1">Commission rate: <span className="text-primary font-medium">{commissionRate}%</span></p>
              )}
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
            {requestPlatform === "facebook" && (
              <div className="space-y-2">
                <Label className="text-foreground">Facebook Email *</Label>
                <Input type="email" placeholder="email@example.com" value={requestFacebookEmail} onChange={(e) => setRequestFacebookEmail(e.target.value)} className="bg-secondary border-border text-foreground" />
                <p className="text-xs text-muted-foreground">The email associated with your Facebook account.</p>
              </div>
            )}
            {hasActiveAccounts && (
              <div className="space-y-2">
                <Label className="text-foreground">Initial Balance (USD) *</Label>
                <Input type="number" min="10" placeholder="Minimum $10"
                  value={requestPreferredLimit} onChange={(e) => setRequestPreferredLimit(e.target.value)}
                  className="bg-secondary border-border text-foreground" required />
              </div>
            )}
            {!hasActiveAccounts && (
              <p className="text-xs text-muted-foreground">Your first account is free — no initial balance required.</p>
            )}
            <Button onClick={handleRequestAccount} disabled={requestLoading || requestPlatform !== "facebook" || (requestPlatform === "facebook" && !requestFacebookEmail)} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
              {requestLoading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Account Dialog */}
      <Dialog open={renameDialog.open} onOpenChange={(open) => setRenameDialog({ ...renameDialog, open })}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Rename Account</DialogTitle>
            <DialogDescription>Change the display name for this ad account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Account Name</Label>
              <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="bg-secondary border-border text-foreground" />
            </div>
            <Button onClick={handleRenameAccount} disabled={renaming || !renameValue.trim()} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
              {renaming ? "Saving..." : "Save Name"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
