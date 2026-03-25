import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NLogo } from "@/components/nywide/NLogo";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Home, LogOut, ArrowLeft } from "lucide-react";

interface NotificationSettings {
  email: boolean;
  telegram: boolean;
  telegram_chat_id: string | null;
  low_balance_threshold: number;
}

const defaultSettings: NotificationSettings = {
  email: true,
  telegram: false,
  telegram_chat_id: null,
  low_balance_threshold: 10,
};

export default function Settings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("notification_settings")
      .eq("id", user!.id)
      .single();
    if (data?.notification_settings) {
      setSettings({ ...defaultSettings, ...(data.notification_settings as any) });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ notification_settings: settings as any })
      .eq("id", user!.id);
    if (error) {
      toast({ title: "Error saving settings", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings saved" });
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <NLogo size={32} />
            <span className="font-bold text-lg"><span className="text-primary">NY</span><span className="text-foreground">WIDE</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/"><Button variant="ghost" size="icon"><Home className="w-4 h-4" /></Button></Link>
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-8">
        <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" />Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-8">Notification Settings</h1>

        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Receive notifications via email</p>
            </div>
            <Switch checked={settings.email} onCheckedChange={(v) => setSettings({ ...settings, email: v })} />
          </div>

          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium text-foreground">Telegram Notifications</p>
                <p className="text-sm text-muted-foreground">Receive notifications via Telegram bot</p>
              </div>
              <Switch checked={settings.telegram} onCheckedChange={(v) => setSettings({ ...settings, telegram: v })} />
            </div>
            {settings.telegram && (
              <div className="space-y-2">
                <Label className="text-foreground">Telegram Chat ID</Label>
                <Input
                  placeholder="e.g. 123456789"
                  value={settings.telegram_chat_id || ""}
                  onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value || null })}
                  className="bg-secondary border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Message @userinfobot on Telegram to get your Chat ID.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-6">
            <div className="space-y-2">
              <Label className="text-foreground">Low Balance Threshold ($)</Label>
              <Input
                type="number"
                min="1"
                value={settings.low_balance_threshold}
                onChange={(e) => setSettings({ ...settings, low_balance_threshold: Number(e.target.value) || 10 })}
                className="bg-secondary border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground">
                You'll be notified when your remaining account balance drops below this amount.
              </p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
