import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { NLogo } from "@/components/nywide/NLogo";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users, Monitor, FileText, Settings, LogOut, Home, Plus,
  DollarSign, CheckCircle, XCircle, Clock, Search, BarChart3, Receipt, CreditCard, Trash2
} from "lucide-react";

const PAGE_SIZE = 50;

export default function Admin() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const [overviewStats, setOverviewStats] = useState({ totalBalance: 0, totalRevenue: 0, totalUsers: 0, totalAccounts: 0 });

  const [users, setUsers] = useState<any[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [userPage, setUserPage] = useState(0);
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [accCount, setAccCount] = useState(0);
  const [accPage, setAccPage] = useState(0);
  const [requests, setRequests] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [txnCount, setTxnCount] = useState(0);
  const [txnPage, setTxnPage] = useState(0);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [invCount, setInvCount] = useState(0);
  const [invPage, setInvPage] = useState(0);
  const [commissionRate, setCommissionRate] = useState(6);
  const [commissionOverrides, setCommissionOverrides] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [txnFilter, setTxnFilter] = useState({ user: "", type: "", date: "" });
  const [invoiceSearch, setInvoiceSearch] = useState("");

  // Top-up requests
  const [topupRequests, setTopupRequests] = useState<any[]>([]);

  // Dialogs
  const [topUpDialog, setTopUpDialog] = useState<{ open: boolean; userId?: string; userName?: string }>({ open: false });
  const [topUpAmount, setTopUpAmount] = useState("");
  const [addAccountDialog, setAddAccountDialog] = useState(false);
  const [newAccount, setNewAccount] = useState({
    account_id: "", account_name: "", currency: "USD", timezone: "America/New_York", spend_limit: "", user_id: "", platform: "facebook",
  });
  const [editAccountDialog, setEditAccountDialog] = useState<{ open: boolean; account?: any }>({ open: false });
  const [overrideDialog, setOverrideDialog] = useState<{ open: boolean; userId?: string; userName?: string; rate?: string }>({ open: false });
  const [addingAccount, setAddingAccount] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [savingOverride, setSavingOverride] = useState(false);
  const [updatingAccount, setUpdatingAccount] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; account?: any }>({ open: false });
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [allUsersForDropdown, setAllUsersForDropdown] = useState<any[]>([]);

  // User total spent cache
  const [userTotalSpent, setUserTotalSpent] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    fetchOverviewStats();
    fetchCommission();
    fetchAllUsersForDropdown();
    fetchTopupRequests();
    fetchUsers();

    // Realtime subscription for profiles changes (new signups)
    const channel = supabase
      .channel('admin-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        console.log("[Admin] Profiles table changed, refreshing...");
        fetchOverviewStats();
        fetchAllUsersForDropdown();
        if (activeTab === "users") fetchUsers();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (user && activeTab === "users") fetchUsers();
  }, [user, activeTab, userPage, searchTerm]);

  useEffect(() => {
    if (user && activeTab === "accounts") fetchAccounts();
  }, [user, activeTab, accPage]);

  useEffect(() => {
    if (user && activeTab === "requests") fetchRequests();
  }, [user, activeTab]);

  useEffect(() => {
    if (user && activeTab === "topups") fetchTopupRequests();
  }, [user, activeTab]);

  useEffect(() => {
    if (user && activeTab === "transactions") fetchTransactions();
  }, [user, activeTab, txnPage, txnFilter]);

  useEffect(() => {
    if (user && activeTab === "invoices") fetchInvoices();
  }, [user, activeTab, invPage, invoiceSearch]);

  useEffect(() => {
    if (user && activeTab === "overview") fetchOverviewUsers();
  }, [user, activeTab]);

  const fetchOverviewStats = async () => {
    const [balRes, revRes, userCountRes, accCountRes] = await Promise.all([
      supabase.from("profiles").select("wallet_balance"),
      supabase.from("transactions").select("commission").eq("status", "completed").eq("type", "wallet_to_account"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("ad_accounts").select("id", { count: "exact", head: true }),
    ]);
    setOverviewStats({
      totalBalance: (balRes.data || []).reduce((s, u) => s + Number(u.wallet_balance || 0), 0),
      totalRevenue: (revRes.data || []).reduce((s, t) => s + Number(t.commission || 0), 0),
      totalUsers: userCountRes.count || 0,
      totalAccounts: accCountRes.count || 0,
    });
  };

  const [overviewUsers, setOverviewUsers] = useState<any[]>([]);
  const [overviewAccounts, setOverviewAccounts] = useState<any[]>([]);

  const fetchOverviewUsers = async () => {
    const [usersRes, accsRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("ad_accounts").select("*, profiles(full_name, email)").order("created_at", { ascending: false }).limit(10),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (usersRes.data) {
      const rolesMap: Record<string, string[]> = {};
      (rolesRes.data || []).forEach((r: any) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r.role);
      });
      setOverviewUsers(usersRes.data.map(u => ({ ...u, _roles: rolesMap[u.id] || ["user"] })));
    }
    if (accsRes.data) setOverviewAccounts(accsRes.data);
  };

  const fetchAllUsersForDropdown = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name, email");
    if (data) setAllUsersForDropdown(data);
  };

  const fetchCommission = async () => {
    const [commRes, overridesRes] = await Promise.all([
      supabase.from("commission_settings").select("*").limit(1).single(),
      supabase.from("user_commission_overrides").select("*"),
    ]);
    if (commRes.data) setCommissionRate(commRes.data.rate);
    if (overridesRes.data) setCommissionOverrides(overridesRes.data);
  };

  const fetchUsers = async () => {
    console.log("[Admin] fetchUsers called, page:", userPage, "search:", searchTerm);
    try {
      let query = supabase.from("profiles").select("*", { count: "exact" });
      if (searchTerm) query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      const [profilesResult, rolesResult] = await Promise.all([
        query.order("created_at", { ascending: false }).range(userPage * PAGE_SIZE, (userPage + 1) * PAGE_SIZE - 1),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const { data, count, error } = profilesResult;
      console.log("[Admin] fetchUsers result - data length:", data?.length, "count:", count, "error:", error);
      if (error) {
        console.error("[Admin] fetchUsers error:", error);
        toast({ title: "Error loading users", description: error.message, variant: "destructive" });
        return;
      }
      // Build roles map
      const rolesMap: Record<string, string[]> = {};
      (rolesResult.data || []).forEach((r: any) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r.role);
      });
      if (data) {
        const enriched = data.map(u => ({ ...u, _roles: rolesMap[u.id] || ["user"] }));
        console.log("[Admin] Setting users state with", enriched.length, "users");
        setUsers(enriched);
        setUserCount(count || data.length);
        const userIds = data.map((u: any) => u.id);
        if (userIds.length > 0) {
          const { data: spentData } = await supabase.from("transactions").select("user_id, amount").eq("type", "wallet_to_account").eq("status", "completed").in("user_id", userIds);
          const spentMap: Record<string, number> = {};
          (spentData || []).forEach((t: any) => { spentMap[t.user_id] = (spentMap[t.user_id] || 0) + Number(t.amount); });
          setUserTotalSpent(spentMap);
        }
      } else {
        setUsers([]);
        setUserCount(count || 0);
      }
    } catch (err: any) {
      console.error("[Admin] fetchUsers exception:", err);
      toast({ title: "Error loading users", description: err.message, variant: "destructive" });
    }
  };

  const [refreshingAccountId, setRefreshingAccountId] = useState<string | null>(null);
  const [accountCache, setAccountCache] = useState<Record<string, { spend_cap: number; amount_spent: number }>>({});

  const fetchAccounts = async () => {
    const { data, count } = await supabase.from("ad_accounts").select("*, profiles(full_name, email)", { count: "exact" })
      .order("created_at", { ascending: false }).range(accPage * PAGE_SIZE, (accPage + 1) * PAGE_SIZE - 1);
    if (data) {
      setAdAccounts(data);
      // Fetch cached FB data in background
      const fbAccountIds = data.filter(a => a.platform === "facebook").map(a => a.account_id);
      if (fbAccountIds.length > 0) {
        supabase.functions.invoke("facebook-api", {
          body: { action: "batch_get_spend_limits", account_ids: fbAccountIds },
        }).then(({ data: fbData }) => {
          if (fbData?.results) {
            setAccountCache(fbData.results);
            // Update local state with fresh data
            setAdAccounts(prev => prev.map(acc => {
              const cached = fbData.results[acc.account_id];
              if (cached) {
                return { ...acc, spend_limit: cached.spend_cap ?? acc.spend_limit, current_spend: cached.amount_spent ?? acc.current_spend };
              }
              return acc;
            }));
          }
        }).catch(err => console.warn("[Admin] Cache fetch failed:", err));
      }
    }
    setAccCount(count || 0);
  };

  const handleRefreshAccount = async (accountId: string) => {
    setRefreshingAccountId(accountId);
    try {
      const { data, error } = await supabase.functions.invoke("facebook-api", {
        body: { action: "refresh_balance", ad_account_id: accountId },
      });
      if (error || data?.error) {
        toast({ title: "Refresh failed", description: data?.error || error?.message, variant: "destructive" });
      } else {
        setAdAccounts(prev => prev.map(acc =>
          acc.account_id === accountId ? { ...acc, spend_limit: data.spend_cap, current_spend: data.amount_spent } : acc
        ));
        toast({ title: "Account refreshed" });
      }
    } catch (err: any) {
      toast({ title: "Refresh error", description: err.message, variant: "destructive" });
    } finally {
      setRefreshingAccountId(null);
    }
  };

  const fetchRequests = async () => {
    const { data } = await supabase.from("account_requests").select("*, profiles(full_name, email)").order("created_at", { ascending: false });
    if (data) setRequests(data);
  };

  const fetchTopupRequests = async () => {
    const { data } = await supabase.from("topup_requests").select("*, profiles(full_name, email)").order("created_at", { ascending: false });
    if (data) setTopupRequests(data);
  };

  const fetchTransactions = async () => {
    let query = supabase.from("transactions").select("*, profiles(full_name, email)", { count: "exact" });
    if (txnFilter.type) query = query.eq("type", txnFilter.type);
    if (txnFilter.date) query = query.gte("created_at", txnFilter.date).lt("created_at", txnFilter.date + "T23:59:59");
    if (txnFilter.user) query = query.or(`profiles.full_name.ilike.%${txnFilter.user}%,profiles.email.ilike.%${txnFilter.user}%`);
    const { data, count } = await query.order("created_at", { ascending: false }).range(txnPage * PAGE_SIZE, (txnPage + 1) * PAGE_SIZE - 1);
    if (data) setAllTransactions(data);
    setTxnCount(count || 0);
  };

  const fetchInvoices = async () => {
    let query = supabase.from("invoices").select("*, profiles(full_name, email)", { count: "exact" });
    if (invoiceSearch) query = query.or(`invoice_number.ilike.%${invoiceSearch}%`);
    const { data, count } = await query.order("created_at", { ascending: false }).range(invPage * PAGE_SIZE, (invPage + 1) * PAGE_SIZE - 1);
    if (data) setAllInvoices(data);
    setInvCount(count || 0);
  };

  const handleManualTopUp = async () => {
    if (!topUpDialog.userId || !topUpAmount || Number(topUpAmount) <= 0) return;
    setToppingUp(true);
    try {
      // Insert transaction first
      const { error: txnError } = await supabase.from("transactions").insert({
        user_id: topUpDialog.userId, type: "wallet_topup", amount: Number(topUpAmount),
        status: "completed", payment_method: "manual",
      });
      if (txnError) {
        console.error("[Admin] Transaction insert error:", txnError);
        toast({ title: "Error adding top-up", description: txnError.message, variant: "destructive" });
        setToppingUp(false);
        return;
      }
      // Fetch current balance then update
      const { data: prof, error: profError } = await supabase.from("profiles").select("wallet_balance").eq("id", topUpDialog.userId).single();
      if (profError || !prof) {
        console.error("[Admin] Profile fetch error:", profError);
        toast({ title: "Error fetching profile", description: profError?.message || "Profile not found", variant: "destructive" });
        setToppingUp(false);
        return;
      }
      const { error: updateError } = await supabase.from("profiles").update({
        wallet_balance: Number(prof.wallet_balance) + Number(topUpAmount),
      }).eq("id", topUpDialog.userId);
      if (updateError) {
        console.error("[Admin] Profile update error:", updateError);
        toast({ title: "Error updating balance", description: updateError.message, variant: "destructive" });
        setToppingUp(false);
        return;
      }
      toast({ title: "Top-up added", description: `$${topUpAmount} added to ${topUpDialog.userName}'s wallet.` });
      setTopUpDialog({ open: false });
      setTopUpAmount("");
      fetchOverviewStats();
      if (activeTab === "users") fetchUsers();
    } catch (err: any) {
      console.error("[Admin] handleManualTopUp exception:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setToppingUp(false);
    }
  };

  const handleApproveTopup = async (req: any) => {
    setApprovingId(req.id);
    const { data: prof } = await supabase.from("profiles").select("wallet_balance").eq("id", req.user_id).single();
    if (prof) {
      await supabase.from("profiles").update({
        wallet_balance: Number(prof.wallet_balance) + Number(req.amount),
      }).eq("id", req.user_id);
    }
    await supabase.from("transactions").insert({
      user_id: req.user_id, type: "wallet_topup", amount: Number(req.amount),
      status: "completed", payment_method: req.payment_method || "manual",
    });
    await supabase.from("topup_requests").update({ status: "approved" } as any).eq("id", req.id);
    setApprovingId(null);
    toast({ title: "Top-up approved", description: `$${Number(req.amount).toFixed(2)} added to ${req.profiles?.full_name || "user"}'s wallet.` });
    fetchTopupRequests();
    fetchOverviewStats();
  };

  const handleRejectTopup = async (req: any) => {
    setApprovingId(req.id);
    await supabase.from("topup_requests").update({ status: "rejected" } as any).eq("id", req.id);
    setApprovingId(null);
    toast({ title: "Top-up rejected" });
    fetchTopupRequests();
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (newRole === "admin") {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" as any });
    } else {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin" as any);
    }
    toast({ title: "Role updated" });
    fetchUsers();
  };

  const handleAddAccount = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    console.log("[Admin] handleAddAccount called with data:", JSON.stringify(newAccount));
    if (!newAccount.account_id || !newAccount.account_name) {
      toast({ title: "Account ID and Name are required", variant: "destructive" });
      return;
    }
    setAddingAccount(true);
    try {
      const spendLimit = Number(newAccount.spend_limit) || 0;
      const insertData = {
        account_id: newAccount.account_id.trim(),
        account_name: newAccount.account_name.trim(),
        currency: newAccount.currency || "USD",
        timezone: newAccount.timezone || "America/New_York",
        spend_limit: spendLimit,
        platform: newAccount.platform || "facebook",
        user_id: newAccount.user_id || null,
        assigned_at: newAccount.user_id ? new Date().toISOString() : null,
      };

      // If Facebook account with balance, set spend limit on FB first
      if (spendLimit > 0 && insertData.platform === "facebook") {
        console.log("[Admin] Setting Facebook spend limit to $" + spendLimit);
        const { data: fbData, error: fbError } = await supabase.functions.invoke("facebook-api", {
          body: { action: "set_spend_limit", ad_account_id: insertData.account_id, amount: spendLimit },
        });
        if (fbError) {
          console.error("[Admin] FB API error:", fbError);
          toast({ title: "Facebook API error", description: fbError.message, variant: "destructive" });
          setAddingAccount(false);
          return;
        }
        if (fbData?.error) {
          console.error("[Admin] FB API returned error:", fbData.error);
          toast({ title: "Facebook API error", description: fbData.error, variant: "destructive" });
          setAddingAccount(false);
          return;
        }
        console.log("[Admin] Facebook spend limit set successfully");
      }

      // Insert into database
      const { data, error } = await supabase.from("ad_accounts").insert(insertData).select();
      if (error) {
        console.error("[Admin] Insert error:", error);
        toast({ title: "Error creating account", description: error.message, variant: "destructive" });
        return;
      }
      console.log("[Admin] Account created:", data);
      toast({ title: "Account created successfully" });
      setAddAccountDialog(false);
      setNewAccount({ account_id: "", account_name: "", currency: "USD", timezone: "America/New_York", spend_limit: "", user_id: "", platform: "facebook" });
      fetchAccounts();
      fetchOverviewStats();
    } catch (err: any) {
      console.error("[Admin] handleAddAccount exception:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingAccount(false);
    }
  };

  const handleUpdateAccount = async () => {
    if (!editAccountDialog.account) return;
    setUpdatingAccount(true);
    const acc = editAccountDialog.account;
    try {
      const newSpendLimit = Number(acc.spend_limit);
      // Update Facebook spend limit if it's a facebook account
      if (acc.platform === "facebook" && newSpendLimit >= 0) {
        console.log("[Admin] Updating Facebook spend limit to $" + newSpendLimit);
        const { data: fbData, error: fbError } = await supabase.functions.invoke("facebook-api", {
          body: { action: "set_spend_limit", ad_account_id: acc.account_id, amount: newSpendLimit },
        });
        if (fbError || fbData?.error) {
          const msg = fbError?.message || fbData?.error;
          console.error("[Admin] FB API error on update:", msg);
          toast({ title: "Facebook API error", description: msg, variant: "destructive" });
          setUpdatingAccount(false);
          return;
        }
      }
      const { error } = await supabase.from("ad_accounts").update({
        spend_limit: newSpendLimit, current_spend: Number(acc.current_spend),
        status: acc.status, user_id: acc.user_id || null,
        assigned_at: acc.user_id ? new Date().toISOString() : null,
      }).eq("id", acc.id);
      if (error) {
        toast({ title: "Error updating account", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Account updated" });
      }
    } catch (err: any) {
      console.error("[Admin] handleUpdateAccount exception:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingAccount(false);
      setEditAccountDialog({ open: false });
      fetchAccounts();
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm.account) return;
    setDeletingAccount(true);
    try {
      const { error } = await supabase.from("ad_accounts").delete().eq("id", deleteConfirm.account.id);
      if (error) {
        toast({ title: "Error deleting account", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Account deleted" });
        fetchAccounts();
        fetchOverviewStats();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeletingAccount(false);
      setDeleteConfirm({ open: false });
    }
  };

    setApprovingId(req.id);
    await supabase.from("ad_accounts").insert({
      account_id: `FB-${Date.now().toString(36).toUpperCase()}`,
      account_name: (req as any).account_name || `Account for ${req.profiles?.full_name || "User"}`,
      platform: req.platform || "facebook",
      currency: (req as any).currency || "USD",
      timezone: (req as any).timezone || "America/New_York",
      user_id: req.user_id, spend_limit: Number(req.preferred_limit) || 0,
      assigned_at: new Date().toISOString(),
    });
    await supabase.from("account_requests").update({ status: "approved" }).eq("id", req.id);
    setApprovingId(null);
    toast({ title: "Request approved", description: "Ad account created and assigned." });
    fetchRequests();
    fetchOverviewStats();
  };

  const handleRejectRequest = async (req: any) => {
    await supabase.from("account_requests").update({ status: "rejected" }).eq("id", req.id);
    toast({ title: "Request rejected" });
    fetchRequests();
  };

  const handleUpdateCommission = async () => {
    const { data } = await supabase.from("commission_settings").select("id").limit(1).single();
    if (data) {
      await supabase.from("commission_settings").update({ rate: commissionRate, updated_at: new Date().toISOString() }).eq("id", data.id);
      toast({ title: "Commission rate updated", description: `New default rate: ${commissionRate}%` });
    }
  };

  const handleSaveOverride = async () => {
    if (!overrideDialog.userId || !overrideDialog.rate) return;
    setSavingOverride(true);
    const existing = commissionOverrides.find(o => o.user_id === overrideDialog.userId);
    if (existing) {
      await supabase.from("user_commission_overrides").update({ rate: Number(overrideDialog.rate), updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("user_commission_overrides").insert({ user_id: overrideDialog.userId, rate: Number(overrideDialog.rate) } as any);
    }
    setSavingOverride(false);
    toast({ title: "Custom rate saved", description: `${overrideDialog.userName}: ${overrideDialog.rate}%` });
    setOverrideDialog({ open: false });
    fetchCommission();
  };

  const handleRemoveOverride = async (userId: string) => {
    await supabase.from("user_commission_overrides").delete().eq("user_id", userId);
    toast({ title: "Custom rate removed" });
    fetchCommission();
  };

  const getUserRole = (u: any) => {
    const roles = u._roles;
    if (Array.isArray(roles) && roles.includes("admin")) return "admin";
    return "user";
  };

  const getUserCommissionRate = (userId: string) => {
    const override = commissionOverrides.find(o => o.user_id === userId);
    return override ? override.rate : commissionRate;
  };

  const txnTypeLabel = (type: string) => {
    switch (type) {
      case "wallet_topup": return "Wallet Top-Up";
      case "top_up": return "Wallet Top-Up";
      case "wallet_to_account": return "Transfer to Account";
      case "account_to_wallet": return "Withdraw to Wallet";
      default: return type.replace(/_/g, " ");
    }
  };

  const pendingTopupCount = topupRequests.filter(r => r.status === "pending").length;

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "accounts", label: "Ad Accounts", icon: Monitor },
    { id: "requests", label: "Requests", icon: FileText, badge: requests.filter(r => r.status === "pending").length },
    { id: "topups", label: "Pending Top-Ups", icon: CreditCard, badge: pendingTopupCount },
    { id: "transactions", label: "Transactions", icon: DollarSign },
    { id: "invoices", label: "Invoices", icon: Receipt },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const txnTotalPages = Math.ceil(txnCount / PAGE_SIZE);
  const userTotalPages = Math.ceil(userCount / PAGE_SIZE);
  const accTotalPages = Math.ceil(accCount / PAGE_SIZE);
  const invTotalPages = Math.ceil(invCount / PAGE_SIZE);

  const PaginationControls = ({ page, setPage, totalPages, count }: { page: number; setPage: (fn: (p: number) => number) => void; totalPages: number; count: number }) => (
    totalPages > 1 ? (
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages} ({count} total)</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="rounded-full border-border">Previous</Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="rounded-full border-border">Next</Button>
        </div>
      </div>
    ) : null
  );

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
            <Link to="/"><Button variant="ghost" size="icon"><Home className="w-4 h-4" /></Button></Link>
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Admin Panel</h1>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge ? <span className="ml-1 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">{tab.badge}</span> : null}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Total Platform Balance</p>
                <p className="text-3xl font-bold text-foreground"><span className="text-primary">$</span>{overviewStats.totalBalance.toFixed(2)}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Total Revenue (Commissions)</p>
                <p className="text-3xl font-bold text-foreground"><span className="text-primary">$</span>{overviewStats.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Total Users</p>
                <p className="text-3xl font-bold text-foreground">{overviewStats.totalUsers}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Total Ad Accounts</p>
                <p className="text-3xl font-bold text-foreground">{overviewStats.totalAccounts}</p>
              </div>
            </div>

            {/* Recent Profiles */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-3">Recent Profiles</h2>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border">
                      <th className="text-left p-4 text-muted-foreground font-medium">Name</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Email</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Role</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Balance</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Commission</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Joined</th>
                    </tr></thead>
                    <tbody>
                      {overviewUsers.map((u) => (
                        <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/50">
                          <td className="p-4 text-foreground font-medium">{u.full_name || "—"}</td>
                          <td className="p-4 text-muted-foreground text-xs">{u.email || "—"}</td>
                          <td className="p-4 capitalize text-foreground">{getUserRole(u)}</td>
                          <td className="p-4 text-foreground">${Number(u.wallet_balance).toFixed(2)}</td>
                          <td className="p-4 text-foreground">
                            {commissionOverrides.find(o => o.user_id === u.id)
                              ? <span className="text-primary font-medium">{getUserCommissionRate(u.id)}% (custom)</span>
                              : <span>{commissionRate}%</span>}
                          </td>
                          <td className="p-4 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Recent Ad Accounts */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-3">Recent Ad Accounts</h2>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border">
                      <th className="text-left p-4 text-muted-foreground font-medium">Account ID</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Name</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Platform</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Spending Limit</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Current Spend</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Assigned To</th>
                    </tr></thead>
                    <tbody>
                      {overviewAccounts.map((acc) => (
                        <tr key={acc.id} className="border-b border-border/50 hover:bg-secondary/50">
                          <td className="p-4 text-foreground font-mono text-xs">{acc.account_id}</td>
                          <td className="p-4 text-foreground">{acc.account_name}</td>
                          <td className="p-4 text-foreground capitalize">{acc.platform}</td>
                          <td className="p-4 text-foreground">${Number(acc.spend_limit).toFixed(2)}</td>
                          <td className="p-4 text-foreground">${Number(acc.current_spend).toFixed(2)}</td>
                          <td className="p-4 capitalize text-foreground">{acc.status}</td>
                          <td className="p-4 text-muted-foreground">{acc.profiles?.full_name || "Unassigned"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name or email..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setUserPage(0); }} className="pl-10 bg-secondary border-border text-foreground" />
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left p-4 text-muted-foreground font-medium">Full Name</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Email</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Role</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Commission (%)</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Wallet Balance</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Total Spent</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Date Joined</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Actions</th>
                  </tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/50">
                        <td className="p-4 text-foreground font-medium">{u.full_name || "—"}</td>
                        <td className="p-4 text-muted-foreground text-xs">{u.email || "—"}</td>
                        <td className="p-4">
                          <select value={getUserRole(u)} onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            className="bg-secondary border border-border rounded-lg px-2 py-1 text-sm text-foreground">
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <button className="text-foreground hover:text-primary transition-colors" onClick={() => {
                            const existing = commissionOverrides.find(o => o.user_id === u.id);
                            setOverrideDialog({ open: true, userId: u.id, userName: u.full_name, rate: existing ? String(existing.rate) : String(commissionRate) });
                          }}>
                            {getUserCommissionRate(u.id)}%
                            {commissionOverrides.find(o => o.user_id === u.id) && <span className="text-primary text-xs ml-1">(custom)</span>}
                          </button>
                        </td>
                        <td className="p-4 text-foreground">${Number(u.wallet_balance).toFixed(2)}</td>
                        <td className="p-4 text-foreground">${(userTotalSpent[u.id] || 0).toFixed(2)}</td>
                        <td className="p-4 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="p-4 flex gap-2">
                          <Button size="sm" variant="outline" className="rounded-full border-primary text-primary" onClick={() => setTopUpDialog({ open: true, userId: u.id, userName: u.full_name })}>
                            <Plus className="w-3.5 h-3.5 mr-1" />Top Up
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <PaginationControls page={userPage} setPage={setUserPage} totalPages={userTotalPages} count={userCount} />
          </div>
        )}

        {/* Ad Accounts Tab */}
        {activeTab === "accounts" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">All Ad Accounts</h2>
              <Button onClick={() => setAddAccountDialog(true)} className="bg-primary text-primary-foreground font-bold rounded-full px-5">
                <Plus className="w-4 h-4 mr-2" />Add Account
              </Button>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left p-4 text-muted-foreground font-medium">Account ID</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Name</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Platform</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Currency</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Timezone</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Spending Limit</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Current Spend</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Assigned To</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Actions</th>
                  </tr></thead>
                  <tbody>
                    {adAccounts.map((acc) => (
                      <tr key={acc.id} className="border-b border-border/50 hover:bg-secondary/50">
                        <td className="p-4 text-foreground font-mono text-xs">{acc.account_id}</td>
                        <td className="p-4 text-foreground">{acc.account_name}</td>
                        <td className="p-4 text-foreground capitalize">{acc.platform}</td>
                        <td className="p-4 text-foreground">{acc.currency}</td>
                        <td className="p-4 text-foreground text-xs">{acc.timezone}</td>
                        <td className="p-4 text-foreground">${Number(acc.spend_limit).toFixed(2)}</td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <span className="text-foreground">${Number(acc.current_spend).toFixed(2)}</span>
                            <Progress value={acc.spend_limit > 0 ? (acc.current_spend / acc.spend_limit) * 100 : 0} className="h-1.5" />
                          </div>
                        </td>
                        <td className="p-4 capitalize text-foreground">{acc.status}</td>
                        <td className="p-4 text-muted-foreground">{acc.profiles?.full_name || "Unassigned"}</td>
                        <td className="p-4 flex gap-1">
                          <Button size="sm" variant="ghost" className="text-primary" onClick={() => setEditAccountDialog({ open: true, account: { ...acc } })}>Edit</Button>
                          {acc.platform === "facebook" && (
                            <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={refreshingAccountId === acc.account_id}
                              onClick={() => handleRefreshAccount(acc.account_id)}>
                              {refreshingAccountId === acc.account_id ? "..." : "↻"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <PaginationControls page={accPage} setPage={setAccPage} totalPages={accTotalPages} count={accCount} />
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Account Requests</h2>
            {requests.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <p className="text-muted-foreground">No requests yet.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {requests.map((req) => (
                  <div key={req.id} className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{req.profiles?.full_name || "User"}</p>
                      <p className="text-sm text-muted-foreground">{req.profiles?.email || ""}</p>
                      <p className="text-sm text-muted-foreground">
                        Platform: {req.platform}
                        {(req as any).account_name && ` · Name: ${(req as any).account_name}`}
                        {(req as any).currency && ` · Currency: ${(req as any).currency}`}
                        {(req as any).timezone && ` · TZ: ${(req as any).timezone}`}
                      </p>
                      <p className="text-sm text-muted-foreground">Initial Balance: {req.preferred_limit || "Not specified"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.status === "pending" ? (
                        <>
                          <Button size="sm" onClick={() => handleApproveRequest(req)} disabled={approvingId === req.id} className="bg-green-600 hover:bg-green-700 text-foreground rounded-full">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRejectRequest(req)} className="rounded-full">
                            <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                          </Button>
                        </>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${req.status === "approved" ? "bg-green-500/20 text-green-500" : "bg-destructive/20 text-destructive"}`}>
                          {req.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Top-Ups Tab */}
        {activeTab === "topups" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Pending Top-Up Requests</h2>
            {topupRequests.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <p className="text-muted-foreground">No top-up requests yet.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border">
                      <th className="text-left p-4 text-muted-foreground font-medium">User</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Amount</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Currency</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Method</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Date</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Actions</th>
                    </tr></thead>
                    <tbody>
                      {topupRequests.map((req) => (
                        <tr key={req.id} className="border-b border-border/50 hover:bg-secondary/50">
                          <td className="p-4">
                            <p className="text-foreground font-medium">{req.profiles?.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{req.profiles?.email || ""}</p>
                          </td>
                          <td className="p-4 text-foreground font-medium">${Number(req.amount).toFixed(2)}</td>
                          <td className="p-4 text-foreground">{req.currency}</td>
                          <td className="p-4 text-foreground capitalize">{req.payment_method || "—"}</td>
                          <td className="p-4 text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              req.status === "pending" ? "bg-primary/20 text-primary" :
                              req.status === "approved" ? "bg-green-500/20 text-green-500" :
                              "bg-destructive/20 text-destructive"
                            }`}>{req.status}</span>
                          </td>
                          <td className="p-4">
                            {req.status === "pending" && (
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleApproveTopup(req)} disabled={approvingId === req.id} className="bg-green-600 hover:bg-green-700 text-foreground rounded-full">
                                  <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectTopup(req)} disabled={approvingId === req.id} className="rounded-full">
                                  <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                                </Button>
                              </div>
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

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">All Transactions</h2>
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by user..." value={txnFilter.user} onChange={(e) => { setTxnFilter({ ...txnFilter, user: e.target.value }); setTxnPage(0); }} className="pl-10 bg-secondary border-border text-foreground" />
              </div>
              <select value={txnFilter.type} onChange={(e) => { setTxnFilter({ ...txnFilter, type: e.target.value }); setTxnPage(0); }} className="h-10 rounded-md bg-secondary border border-border px-3 text-foreground text-sm">
                <option value="">All types</option>
                <option value="wallet_topup">Wallet Top-Up</option>
                <option value="wallet_to_account">Transfer to Account</option>
                <option value="account_to_wallet">Withdraw to Wallet</option>
              </select>
              <Input type="date" value={txnFilter.date} onChange={(e) => { setTxnFilter({ ...txnFilter, date: e.target.value }); setTxnPage(0); }} className="bg-secondary border-border text-foreground w-44" />
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left p-4 text-muted-foreground font-medium">Date</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">User</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Type</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Amount</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Commission</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Account</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Method</th>
                  </tr></thead>
                  <tbody>
                    {allTransactions.map((txn) => (
                      <tr key={txn.id} className="border-b border-border/50 hover:bg-secondary/50">
                        <td className="p-4 text-foreground">{new Date(txn.created_at).toLocaleDateString()}</td>
                        <td className="p-4 text-foreground">{txn.profiles?.full_name || txn.profiles?.email || "—"}</td>
                        <td className="p-4 text-foreground">{txnTypeLabel(txn.type)}</td>
                        <td className="p-4 font-medium text-foreground">${Number(txn.amount).toFixed(2)}</td>
                        <td className="p-4 text-muted-foreground">{txn.commission ? `$${Number(txn.commission).toFixed(2)}` : "—"}</td>
                        <td className="p-4 text-muted-foreground font-mono text-xs">{txn.ad_account_id || "—"}</td>
                        <td className="p-4 capitalize text-foreground">{txn.status}</td>
                        <td className="p-4 text-muted-foreground capitalize">{txn.payment_method || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <PaginationControls page={txnPage} setPage={setTxnPage} totalPages={txnTotalPages} count={txnCount} />
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === "invoices" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">All Invoices</h2>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search invoices by number..." value={invoiceSearch} onChange={(e) => { setInvoiceSearch(e.target.value); setInvPage(0); }} className="pl-10 bg-secondary border-border text-foreground" />
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left p-4 text-muted-foreground font-medium">Invoice #</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">User</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Amount</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Date</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Download</th>
                  </tr></thead>
                  <tbody>
                    {allInvoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-border/50 hover:bg-secondary/50">
                        <td className="p-4 text-foreground font-medium">{inv.invoice_number}</td>
                        <td className="p-4 text-foreground">{inv.profiles?.full_name || inv.profiles?.email || "—"}</td>
                        <td className="p-4 text-foreground">${Number(inv.amount).toFixed(2)} {inv.currency}</td>
                        <td className="p-4 text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</td>
                        <td className="p-4">
                          <Button size="sm" variant="outline" className="rounded-full border-border" disabled={!inv.pdf_url}>
                            {inv.pdf_url ? "Download" : "PDF Pending"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <PaginationControls page={invPage} setPage={setInvPage} totalPages={invTotalPages} count={invCount} />
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">Commission Settings</h2>
            <div className="bg-card border border-border rounded-xl p-6 max-w-md">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Default Commission Rate (%)</Label>
                  <Input type="number" value={commissionRate} onChange={(e) => setCommissionRate(Number(e.target.value))} className="bg-secondary border-border text-foreground" />
                  <p className="text-xs text-muted-foreground">Applied when transferring from wallet to ad account.</p>
                </div>
                <Button onClick={handleUpdateCommission} className="bg-primary text-primary-foreground font-bold rounded-full">Save Default Rate</Button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-foreground">User Commission Overrides</h3>
            {commissionOverrides.length === 0 ? (
              <p className="text-muted-foreground text-sm">No custom rates set. Click on a user's commission rate in the Users tab to set a custom rate.</p>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden max-w-lg">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left p-4 text-muted-foreground font-medium">User</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Custom Rate</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Actions</th>
                  </tr></thead>
                  <tbody>
                    {commissionOverrides.map((o) => {
                      const u = allUsersForDropdown.find(u => u.id === o.user_id);
                      return (
                        <tr key={o.id} className="border-b border-border/50">
                          <td className="p-4 text-foreground">{u?.full_name || u?.email || o.user_id}</td>
                          <td className="p-4 text-primary font-medium">{o.rate}%</td>
                          <td className="p-4">
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveOverride(o.user_id)}>Remove</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Top Up Dialog */}
      <Dialog open={topUpDialog.open} onOpenChange={(open) => setTopUpDialog({ ...topUpDialog, open })}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Manual Top Up – {topUpDialog.userName}</DialogTitle>
            <DialogDescription>Add funds to this user's wallet. No commission is deducted on top-ups.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Amount (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="number" min="1" placeholder="100" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} className="pl-10 bg-secondary border-border text-foreground" />
              </div>
            </div>
            <Button onClick={handleManualTopUp} disabled={toppingUp} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
              {toppingUp ? "Processing..." : "Add Funds"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog open={addAccountDialog} onOpenChange={setAddAccountDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add New Ad Account</DialogTitle>
            <DialogDescription>Create a new ad account and optionally assign it to a user.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAccount} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Platform</Label>
              <select value={newAccount.platform} onChange={(e) => setNewAccount({ ...newAccount, platform: e.target.value })} className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-foreground text-sm">
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="google">Google</option>
                <option value="snapchat">Snapchat</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-foreground">Account ID</Label>
                <Input required placeholder="179656207641303" value={newAccount.account_id} onChange={(e) => setNewAccount({ ...newAccount, account_id: e.target.value })} className="bg-secondary border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Account Name</Label>
                <Input required placeholder="My Agency Account" value={newAccount.account_name} onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })} className="bg-secondary border-border text-foreground" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-foreground">Currency</Label>
                <Input placeholder="USD, EUR, GBP..." value={newAccount.currency} onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value })} className="bg-secondary border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Timezone</Label>
                <Input placeholder="America/New_York" value={newAccount.timezone} onChange={(e) => setNewAccount({ ...newAccount, timezone: e.target.value })} className="bg-secondary border-border text-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Balance (USD)</Label>
              <Input type="number" placeholder="1000" value={newAccount.spend_limit} onChange={(e) => setNewAccount({ ...newAccount, spend_limit: e.target.value })} className="bg-secondary border-border text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Assign to User (optional)</Label>
              <select value={newAccount.user_id} onChange={(e) => setNewAccount({ ...newAccount, user_id: e.target.value })} className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-foreground text-sm">
                <option value="">Unassigned</option>
                {allUsersForDropdown.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email || u.id}</option>)}
              </select>
            </div>
            <Button type="submit" disabled={addingAccount} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
              {addingAccount ? "Creating..." : "Create Account"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={editAccountDialog.open} onOpenChange={(open) => setEditAccountDialog({ ...editAccountDialog, open })}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Ad Account</DialogTitle>
            <DialogDescription>Update account details.</DialogDescription>
          </DialogHeader>
          {editAccountDialog.account && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-foreground">Spending Limit</Label>
                  <Input type="number" value={editAccountDialog.account.spend_limit} onChange={(e) => setEditAccountDialog({ ...editAccountDialog, account: { ...editAccountDialog.account, spend_limit: e.target.value } })} className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Current Spend</Label>
                  <Input type="number" value={editAccountDialog.account.current_spend} onChange={(e) => setEditAccountDialog({ ...editAccountDialog, account: { ...editAccountDialog.account, current_spend: e.target.value } })} className="bg-secondary border-border text-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Status</Label>
                <select value={editAccountDialog.account.status} onChange={(e) => setEditAccountDialog({ ...editAccountDialog, account: { ...editAccountDialog.account, status: e.target.value } })} className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-foreground text-sm">
                  <option value="active">Active</option><option value="suspended">Suspended</option><option value="pending">Pending</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Assign to User</Label>
                <select value={editAccountDialog.account.user_id || ""} onChange={(e) => setEditAccountDialog({ ...editAccountDialog, account: { ...editAccountDialog.account, user_id: e.target.value || null } })} className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-foreground text-sm">
                  <option value="">Unassigned</option>
                  {allUsersForDropdown.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email || u.id}</option>)}
                </select>
              </div>
              <Button onClick={handleUpdateAccount} disabled={updatingAccount} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
                {updatingAccount ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Commission Override Dialog */}
      <Dialog open={overrideDialog.open} onOpenChange={(open) => setOverrideDialog({ ...overrideDialog, open })}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Custom Commission – {overrideDialog.userName}</DialogTitle>
            <DialogDescription>Set a custom commission rate for this user (overrides the default {commissionRate}%).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Commission Rate (%)</Label>
              <Input type="number" min="0" max="100" step="0.5" value={overrideDialog.rate || ""} onChange={(e) => setOverrideDialog({ ...overrideDialog, rate: e.target.value })} className="bg-secondary border-border text-foreground" />
            </div>
            <Button onClick={handleSaveOverride} disabled={savingOverride} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
              {savingOverride ? "Saving..." : "Save Custom Rate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
