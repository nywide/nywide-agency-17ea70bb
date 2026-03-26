import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface AdminNotifSettings {
  telegram: boolean;
  telegram_chat_id: string | null;
  low_balance_threshold: number;
  notify_new_user: boolean;
  notify_new_account_request: boolean;
  notify_new_topup_request: boolean;
  notify_low_balance: boolean;
  notify_account_disabled: boolean;
}

const defaults: AdminNotifSettings = {
  telegram: false,
  telegram_chat_id: null,
  low_balance_threshold: 10,
  notify_new_user: true,
  notify_new_account_request: true,
  notify_new_topup_request: true,
  notify_low_balance: true,
  notify_account_disabled: true,
};

export function AdminNotificationSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AdminNotifSettings>(defaults);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from("admin_settings").select("*").limit(1).single();
    if (data) {
      setSettingsId(data.id);
      if (data.notification_settings) {
        setSettings({ ...defaults, ...(data.notification_settings as any) });
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    if (settingsId) {
      const { error } = await supabase.from("admin_settings").update({
        notification_settings: settings as any,
        updated_at: new Date().toISOString(),
      }).eq("id", settingsId);
      if (error) {
        toast({ title: "Error saving", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Admin notification settings saved" });
      }
    } else {
      const { error } = await supabase.from("admin_settings").insert({
        notification_settings: settings as any,
      } as any);
      if (error) {
        toast({ title: "Error saving", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Admin notification settings saved" });
        fetchSettings();
      }
    }
    setSaving(false);
  };

  const toggleItems = [
    { key: "notify_new_user" as const, label: "New User Registration" },
    { key: "notify_new_account_request" as const, label: "New Account Request" },
    { key: "notify_new_topup_request" as const, label: "New Top-Up Request" },
    { key: "notify_low_balance" as const, label: "Low Balance Alerts" },
    { key: "notify_account_disabled" as const, label: "Account Disabled" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">Admin Notification Settings</h3>
      <div className="bg-card border border-border rounded-xl p-6 max-w-md space-y-5">
        {/* Telegram */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-medium text-foreground text-sm">Telegram Notifications</p>
              <p className="text-xs text-muted-foreground">Receive admin alerts via Telegram</p>
            </div>
            <Switch checked={settings.telegram} onCheckedChange={(v) => setSettings({ ...settings, telegram: v })} />
          </div>
          {settings.telegram && (
            <div className="space-y-2">
              <Label className="text-foreground text-sm">Telegram Chat ID</Label>
              <Input
                placeholder="e.g. 123456789"
                value={settings.telegram_chat_id || ""}
                onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value || null })}
                className="bg-secondary border-border text-foreground"
              />
            </div>
          )}
        </div>

        {/* Event Toggles */}
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Notify on Events</p>
          {toggleItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <p className="text-sm text-foreground">{item.label}</p>
              <Switch checked={settings[item.key]} onCheckedChange={(v) => setSettings({ ...settings, [item.key]: v })} />
            </div>
          ))}
        </div>

        {/* Low Balance Threshold */}
        <div className="border-t border-border pt-4 space-y-2">
          <Label className="text-foreground text-sm">Low Balance Threshold ($)</Label>
          <Input
            type="number"
            min="1"
            value={settings.low_balance_threshold}
            onChange={(e) => setSettings({ ...settings, low_balance_threshold: Number(e.target.value) || 10 })}
            className="bg-secondary border-border text-foreground"
          />
          <p className="text-xs text-muted-foreground">Alert when user account balance falls below this amount.</p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
          {saving ? "Saving..." : "Save Notification Settings"}
        </Button>
      </div>
    </div>
  );
}
