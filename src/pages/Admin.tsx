import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NLogo } from "@/components/nywide/NLogo";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  Users, Monitor, FileText, Settings, LogOut, Home, Plus,
  DollarSign, CheckCircle, XCircle, Clock, Search
} from "lucide-react";

export default function Admin() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState<any[]>([]);
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [commissionRate, setCommissionRate] = useState(6);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialogs
  const [topUpDialog, setTopUpDialog] = useState<{ open: boolean; userId?: string; userName?: string }>({ open: false });
  const [topUpAmount, setTopUpAmount] = useState("");
  const [addAccountDialog, setAddAccountDialog] = useState(false);
  const [newAccount, setNewAccount] = useState({
    account_id: "", account_name: "", currency: "USD", timezone: "America/New_York",
    spend_limit: "", user_id: "",
  });
  const [editAccountDialog, setEditAccountDialog] = useState<{ open: boolean; account?: any }>({ open: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [profilesRes, accountsRes, requestsRes, txnRes, commRes] = await Promise.all([
      supabase.from("profiles").select("*, user_roles(role)"),
      supabase.from("ad_accounts").select("*, profiles(full_name)"),
      supabase.from("account_requests").select("*, profiles(full_name)").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*, profiles(full_name)").order("created_at", { ascending: false }),
      supabase.from("commission_settings").select("*").limit(1).single(),
    ]);
    if (profilesRes.data) setUsers(profilesRes.data);
    if (accountsRes.data) setAdAccounts(accountsRes.data);
    if (requestsRes.data) setRequests(requestsRes.data);
    if (txnRes.data) setAllTransactions(txnRes.data);
    if (commRes.data) setCommissionRate(commRes.data.rate);
  };

  const handleManualTopUp = async () => {
    if (!topUpDialog.userId || !topUpAmount || Number(topUpAmount) <= 0) return;
    setLoading(true);
    // Create transaction
    await supabase.from("transactions").insert({
      user_id: topUpDialog.userId,
      type: "top_up",
      amount: Number(topUpAmount),
      status: "completed",
      payment_method: "manual",
    });
    // Update wallet balance
    const currentUser = users.find(u => u.id === topUpDialog.userId);
    if (currentUser) {
      await supabase.from("profiles").update({
        wallet_balance: Number(currentUser.wallet_balance) + Number(topUpAmount),
      }).eq("id", topUpDialog.userId);
    }
    setLoading(false);
    toast({ title: "Top-up added", description: `$${topUpAmount} added to ${topUpDialog.userName}'s wallet.` });
    setTopUpDialog({ open: false });
    setTopUpAmount("");
    fetchAll();
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (newRole === "admin") {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" as any });
    } else {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin" as any);
    }
    toast({ title: "Role updated" });
    fetchAll();
  };

  const handleAddAccount = async () => {
    if (!newAccount.account_id || !newAccount.account_name) return;
    setLoading(true);
    const { error } = await supabase.from("ad_accounts").insert({
      account_id: newAccount.account_id,
      account_name: newAccount.account_name,
      currency: newAccount.currency,
      timezone: newAccount.timezone,
      spend_limit: Number(newAccount.spend_limit) || 0,
      user_id: newAccount.user_id || null,
      assigned_at: newAccount.user_id ? new Date().toISOString() : null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created" });
      setAddAccountDialog(false);
      setNewAccount({ account_id: "", account_name: "", currency: "USD", timezone: "America/New_York", spend_limit: "", user_id: "" });
      fetchAll();
    }
  };

  const handleUpdateAccount = async () => {
    if (!editAccountDialog.account) return;
    setLoading(true);
    const acc = editAccountDialog.account;
    await supabase.from("ad_accounts").update({
      spend_limit: Number(acc.spend_limit),
      current_spend: Number(acc.current_spend),
      status: acc.status,
      user_id: acc.user_id || null,
      assigned_at: acc.user_id ? new Date().toISOString() : null,
    }).eq("id", acc.id);
    setLoading(false);
    toast({ title: "Account updated" });
    setEditAccountDialog({ open: false });
    fetchAll();
  };

  const handleApproveRequest = async (req: any) => {
    // Create ad account for user
    await supabase.from("ad_accounts").insert({
      account_id: `FB-${Date.now().toString(36).toUpperCase()}`,
      account_name: `Account for ${req.profiles?.full_name || "User"}`,
      user_id: req.user_id,
      spend_limit: Number(req.preferred_limit) || 250,
      assigned_at: new Date().toISOString(),
    });
    await supabase.from("account_requests").update({ status: "approved" }).eq("id", req.id);
    toast({ title: "Request approved", description: "Ad account created and assigned." });
    fetchAll();
  };

  const handleRejectRequest = async (req: any) => {
    await supabase.from("account_requests").update({ status: "rejected" }).eq("id", req.id);
    toast({ title: "Request rejected" });
    fetchAll();
  };

  const handleUpdateCommission = async () => {
    const { data } = await supabase.from("commission_settings").select("id").limit(1).single();
    if (data) {
      await supabase.from("commission_settings").update({ rate: commissionRate, updated_at: new Date().toISOString() }).eq("id", data.id);
      toast({ title: "Commission rate updated", description: `New rate: ${commissionRate}%` });
    }
  };

  const getUserRole = (u: any) => {
    const roles = u.user_roles;
    if (Array.isArray(roles) && roles.some((r: any) => r.role === "admin")) return "admin";
    return "user";
  };

  const filteredUsers = users.filter(u =>
    (u.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.includes(searchTerm)
  );

  const tabs = [
    { id: "users", label: "Users", icon: Users },
    { id: "accounts", label: "Ad Accounts", icon: Monitor },
    { id: "requests", label: "Requests", icon: FileText, badge: requests.filter(r => r.status === "pending").length },
    { id: "transactions", label: "Transactions", icon: DollarSign },
    { id: "settings", label: "Settings", icon: Settings },
  ];

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
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge ? <span className="ml-1 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">{tab.badge}</span> : null}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-secondary border-border text-foreground" />
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left p-4 text-muted-foreground font-medium">Name</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Role</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Balance</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Joined</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Actions</th>
                  </tr></thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/50">
                        <td className="p-4 text-foreground font-medium">{u.full_name || "—"}</td>
                        <td className="p-4">
                          <select
                            value={getUserRole(u)}
                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            className="bg-secondary border border-border rounded-lg px-2 py-1 text-sm text-foreground"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="p-4 text-foreground">${Number(u.wallet_balance).toFixed(2)}</td>
                        <td className="p-4 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="p-4">
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
                    <th className="text-left p-4 text-muted-foreground font-medium">Spend</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Assigned To</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Actions</th>
                  </tr></thead>
                  <tbody>
                    {adAccounts.map((acc) => (
                      <tr key={acc.id} className="border-b border-border/50 hover:bg-secondary/50">
                        <td className="p-4 text-foreground font-mono text-xs">{acc.account_id}</td>
                        <td className="p-4 text-foreground">{acc.account_name}</td>
                        <td className="p-4 text-foreground">${Number(acc.current_spend).toFixed(2)} / ${Number(acc.spend_limit).toFixed(2)}</td>
                        <td className="p-4 capitalize text-foreground">{acc.status}</td>
                        <td className="p-4 text-muted-foreground">{acc.profiles?.full_name || "Unassigned"}</td>
                        <td className="p-4">
                          <Button size="sm" variant="ghost" className="text-primary" onClick={() => setEditAccountDialog({ open: true, account: { ...acc } })}>Edit</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
                      <p className="text-sm text-muted-foreground">Platform: {req.platform} · Preferred limit: {req.preferred_limit || "Any"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.status === "pending" ? (
                        <>
                          <Button size="sm" onClick={() => handleApproveRequest(req)} className="bg-green-600 hover:bg-green-700 text-foreground rounded-full">
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

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">All Transactions</h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left p-4 text-muted-foreground font-medium">Date</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">User</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Type</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Amount</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Method</th>
                  </tr></thead>
                  <tbody>
                    {allTransactions.map((txn) => (
                      <tr key={txn.id} className="border-b border-border/50 hover:bg-secondary/50">
                        <td className="p-4 text-foreground">{new Date(txn.created_at).toLocaleDateString()}</td>
                        <td className="p-4 text-foreground">{txn.profiles?.full_name || "—"}</td>
                        <td className="p-4 capitalize text-foreground">{txn.type.replace("_", " ")}</td>
                        <td className="p-4 font-medium text-foreground">${Number(txn.amount).toFixed(2)}</td>
                        <td className="p-4 capitalize text-foreground">{txn.status}</td>
                        <td className="p-4 text-muted-foreground capitalize">{txn.payment_method || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
                </div>
                <Button onClick={handleUpdateCommission} className="bg-primary text-primary-foreground font-bold rounded-full">Save Changes</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Top Up Dialog */}
      <Dialog open={topUpDialog.open} onOpenChange={(open) => setTopUpDialog({ ...topUpDialog, open })}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Manual Top Up – {topUpDialog.userName}</DialogTitle>
            <DialogDescription>Add funds to this user's wallet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Amount (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="number" min="1" placeholder="100" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} className="pl-10 bg-secondary border-border text-foreground" />
              </div>
            </div>
            <Button onClick={handleManualTopUp} disabled={loading} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
              {loading ? "Processing..." : "Add Funds"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog open={addAccountDialog} onOpenChange={setAddAccountDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add New Ad Account</DialogTitle>
            <DialogDescription>Create a new Facebook ad account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-foreground">Account ID</Label>
                <Input placeholder="179656207641303" value={newAccount.account_id} onChange={(e) => setNewAccount({ ...newAccount, account_id: e.target.value })} className="bg-secondary border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Account Name</Label>
                <Input placeholder="My Agency Account" value={newAccount.account_name} onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })} className="bg-secondary border-border text-foreground" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-foreground">Currency</Label>
                <select value={newAccount.currency} onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value })} className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-foreground text-sm">
                  <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="AED">AED</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Timezone</Label>
                <select value={newAccount.timezone} onChange={(e) => setNewAccount({ ...newAccount, timezone: e.target.value })} className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-foreground text-sm">
                  <option value="America/New_York">America/New_York</option><option value="Europe/London">Europe/London</option><option value="Asia/Dubai">Asia/Dubai</option><option value="UTC">UTC</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Spend Limit (USD)</Label>
              <Input type="number" placeholder="1000" value={newAccount.spend_limit} onChange={(e) => setNewAccount({ ...newAccount, spend_limit: e.target.value })} className="bg-secondary border-border text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Assign to User (optional)</Label>
              <select value={newAccount.user_id} onChange={(e) => setNewAccount({ ...newAccount, user_id: e.target.value })} className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-foreground text-sm">
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.id}</option>)}
              </select>
            </div>
            <Button onClick={handleAddAccount} disabled={loading} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </div>
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
                  <Label className="text-foreground">Spend Limit</Label>
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
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.id}</option>)}
                </select>
              </div>
              <Button onClick={handleUpdateAccount} disabled={loading} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
