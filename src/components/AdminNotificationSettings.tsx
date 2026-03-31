import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { TIMEZONES } from "@/lib/timezone";

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

interface AdminDailyReportSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  include_new_users: boolean;
  include_new_account_requests: boolean;
  include_new_topup_requests: boolean;
  include_low_balance: boolean;
  include_total_stats: boolean;
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

const defaultDailyReport: AdminDailyReportSettings = {
  enabled: false,
  hour: 9,
  minute: 0,
  include_new_users: true,
  include_new_account_requests: true,
  include_new_topup_requests: true,
  include_low_balance: true,
  include_total_stats: true,
};

export function AdminNotificationSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AdminNotifSettings>(defaults);
  const [dailyReport, setDailyReport] = useState<AdminDailyReportSettings>(defaultDailyReport);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [adminTimezone, setAdminTimezone] = useState("UTC");

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
      if (data.timezone) setAdminTimezone(data.timezone);
      if ((data as any).daily_report_settings) {
        setDailyReport({ ...defaultDailyReport, ...((data as any).daily_report_settings as any) });
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    if (settingsId) {
      const { error } = await supabase.from("admin_settings").update({
        notification_settings: settings as any,
        timezone: adminTimezone,
        daily_report_settings: dailyReport as any,
        updated_at: new Date().toISOString(),
      } as any).eq("id", settingsId);
      if (error) {
        toast({ title: "Error saving", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Admin notification settings saved" });
      }
    } else {
      const { error } = await supabase.from("admin_settings").insert({
        notification_settings: settings as any,
        daily_report_settings: dailyReport as any,
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

  const dailyReportIncludes = [
    { key: "include_new_users" as const, label: "New users today" },
    { key: "include_new_account_requests" as const, label: "New account requests today" },
    { key: "include_new_topup_requests" as const, label: "New top-up requests today" },
    { key: "include_low_balance" as const, label: "Low balance alerts" },
    { key: "include_total_stats" as const, label: "Total platform stats" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">Admin Notification Settings</h3>
      <div className="bg-card border border-border rounded-xl p-6 max-w-md space-y-5">
        {/* Timezone */}
        <div>
          <p className="font-medium text-foreground text-sm mb-2">Admin Timezone</p>
          <select
            value={adminTimezone}
            onChange={(e) => setAdminTimezone(e.target.value)}
            className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-foreground text-sm"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">Used for displaying dates and times in admin dashboard.</p>
        </div>

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
              <p className="text-xs text-muted-foreground mt-1">
                ⚠️ Before receiving messages, send <strong>/start</strong> to{" "}
                <a href="https://t.me/nywideagencybot" target="_blank" rel="noopener noreferrer" className="text-primary underline">@nywideagencybot</a>{" "}
                on Telegram.
              </p>
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

        {/* Daily Report */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-medium text-foreground text-sm">Admin Daily Report</p>
              <p className="text-xs text-muted-foreground">Receive a daily platform summary via Telegram</p>
            </div>
            <Switch checked={dailyReport.enabled} onCheckedChange={(v) => setDailyReport({ ...dailyReport, enabled: v })} />
          </div>
          {dailyReport.enabled && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-foreground text-sm">Hour (0-23)</Label>
                  <Input type="number" min="0" max="23" value={dailyReport.hour}
                    onChange={(e) => setDailyReport({ ...dailyReport, hour: Math.max(0, Math.min(23, Number(e.target.value))) })}
                    className="bg-secondary border-border text-foreground" />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-foreground text-sm">Minute (0-59)</Label>
                  <Input type="number" min="0" max="59" value={dailyReport.minute}
                    onChange={(e) => setDailyReport({ ...dailyReport, minute: Math.max(0, Math.min(59, Number(e.target.value))) })}
                    className="bg-secondary border-border text-foreground" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Report sent at {String(dailyReport.hour).padStart(2, '0')}:{String(dailyReport.minute).padStart(2, '0')} in admin timezone ({adminTimezone}).</p>
              <div className="space-y-2 mt-2">
                <p className="text-xs font-medium text-foreground">Include in report:</p>
                {dailyReportIncludes.map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <p className="text-xs text-foreground">{item.label}</p>
                    <Switch checked={dailyReport[item.key]} onCheckedChange={(v) => setDailyReport({ ...dailyReport, [item.key]: v })} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
          {saving ? "Saving..." : "Save Notification Settings"}
        </Button>
      </div>
    </div>
  );
}
