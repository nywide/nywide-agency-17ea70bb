import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NLogo } from "@/components/nywide/NLogo";
import { NotificationBell } from "@/components/nywide/NotificationBell";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Home, LogOut, ArrowLeft, Plus, Trash2, BarChart3 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

interface AdminMetric {
  id: string;
  name: string;
  formula: string;
  threshold: number | null;
  alert_enabled: boolean;
  alert_type: string | null;
  created_at: string;
}

const FORMULA_EXAMPLES = [
  { label: "Total Wallet Balance", formula: "total_wallet_balance" },
  { label: "Total Remaining", formula: "total_spend_limit - total_amount_spent" },
  { label: "Total Commission", formula: "total_commission_earned" },
];

export default function AdminCustomMetrics() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<AdminMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const [name, setName] = useState("");
  const [formula, setFormula] = useState("");
  const [threshold, setThreshold] = useState("");
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertType, setAlertType] = useState<string>("below");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchMetrics();
  }, [user]);

  const fetchMetrics = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_custom_metrics" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setMetrics(data as any);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!name.trim() || !formula.trim()) {
      toast({ title: "Name and formula are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("admin_custom_metrics" as any).insert({
      name: name.trim(),
      formula: formula.trim(),
      threshold: threshold ? Number(threshold) : null,
      alert_enabled: alertEnabled,
      alert_type: alertEnabled ? alertType : null,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Admin metric created" });
      setCreateOpen(false);
      setName(""); setFormula(""); setThreshold(""); setAlertEnabled(false); setAlertType("below");
      fetchMetrics();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("admin_custom_metrics" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Metric deleted" });
      fetchMetrics();
    }
  };

  const handleToggleAlert = async (metric: AdminMetric) => {
    const { error } = await supabase
      .from("admin_custom_metrics" as any)
      .update({ alert_enabled: !metric.alert_enabled } as any)
      .eq("id", metric.id);
    if (!error) fetchMetrics();
  };

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
            <Link to="/"><Button variant="ghost" size="icon"><Home className="w-4 h-4" /></Button></Link>
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/admin" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" />Back to Admin
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Custom Metrics</h1>
            <p className="text-sm text-muted-foreground mt-1">Track platform-wide metrics with custom formulas and alerts.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-primary text-primary-foreground font-bold rounded-full px-5">
            <Plus className="w-4 h-4 mr-2" />New Metric
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : metrics.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No admin metrics yet. Create one to track platform-wide data!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {metrics.map((metric) => (
              <div key={metric.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{metric.name}</p>
                    <p className="text-sm text-muted-foreground font-mono mt-1">{metric.formula}</p>
                    {metric.threshold !== null && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Alert: when value is {metric.alert_type === "above" ? "above" : "below"} {metric.threshold}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {metric.threshold !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Alert</span>
                        <Switch checked={metric.alert_enabled} onCheckedChange={() => handleToggleAlert(metric)} />
                      </div>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(metric.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Admin Metric</DialogTitle>
            <DialogDescription>Define a formula using platform-wide data fields.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Name *</Label>
              <Input placeholder="e.g. Total Platform Balance" value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Formula *</Label>
              <Input placeholder="e.g. total_wallet_balance" value={formula} onChange={(e) => setFormula(e.target.value)} className="bg-secondary border-border text-foreground font-mono" />
              <p className="text-xs text-muted-foreground">
                Variables: <code className="text-primary">total_wallet_balance</code>, <code className="text-primary">total_spend_limit</code>, <code className="text-primary">total_amount_spent</code>, <code className="text-primary">total_commission_earned</code>, <code className="text-primary">active_users_count</code>, <code className="text-primary">total_accounts</code>
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {FORMULA_EXAMPLES.map((ex) => (
                  <button key={ex.label} type="button" onClick={() => { setFormula(ex.formula); if (!name) setName(ex.label); }}
                    className="text-xs px-2 py-1 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Alert Threshold (optional)</Label>
              <Input type="number" placeholder="e.g. 100" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="bg-secondary border-border text-foreground" />
            </div>
            {threshold && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground">Enable Alert</Label>
                  <Switch checked={alertEnabled} onCheckedChange={setAlertEnabled} />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Alert When</Label>
                  <Select value={alertType} onValueChange={setAlertType}>
                    <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="below">Value falls below threshold</SelectItem>
                      <SelectItem value="above">Value rises above threshold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <Button onClick={handleCreate} disabled={saving || !name.trim() || !formula.trim()} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
              {saving ? "Creating..." : "Create Metric"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
