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
import { TIMEZONES } from "@/lib/timezone";

interface NotificationSettings {
  telegram: boolean;
  telegram_chat_id: string | null;
  low_balance_threshold: number;
  notify_low_balance: boolean;
  notify_account_disabled: boolean;
  notify_topup_approved: boolean;
  notify_account_request_approved: boolean;
  notify_withdrawal: boolean;
}

interface DailyReportSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  include_wallet_balance: boolean;
  include_ad_accounts: boolean;
  include_custom_metrics: boolean;
  include_recent_transactions: boolean;
}

const defaultSettings: NotificationSettings = {
  telegram: false,
  telegram_chat_id: null,
  low_balance_threshold: 10,
  notify_low_balance: true,
  notify_account_disabled: true,
  notify_topup_approved: true,
  notify_account_request_approved: true,
  notify_withdrawal: true,
};

const defaultDailyReport: DailyReportSettings = {
  enabled: false,
  hour: 9,
  minute: 0,
};

export default function Settings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [dailyReport, setDailyReport] = useState<DailyReportSettings>(defaultDailyReport);
  const [saving, setSaving] = useState(false);
  const [userTimezone, setUserTimezone] = useState("UTC");

  useEffect(() => {
    if (user) fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("notification_settings, timezone, daily_report_settings")
      .eq("id", user!.id)
      .single();
    if (data?.notification_settings) {
      setSettings({ ...defaultSettings, ...(data.notification_settings as any) });
    }
    if (data?.timezone) {
      setUserTimezone(data.timezone);
    }
    if ((data as any)?.daily_report_settings) {
      setDailyReport({ ...defaultDailyReport, ...((data as any).daily_report_settings as any) });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ notification_settings: settings as any, timezone: userTimezone, daily_report_settings: dailyReport as any } as any)
      .eq("id", user!.id);
    if (error) {
      toast({ title: "Error saving settings", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings saved" });
    }
    setSaving(false);
  };

  const toggleItems = [
    { key: "notify_low_balance" as const, label: "Low Balance Alerts", desc: "Get notified when your ad account balance drops below threshold" },
    { key: "notify_account_disabled" as const, label: "Account Disabled", desc: "Get notified when an ad account is disabled" },
    { key: "notify_topup_approved" as const, label: "Top-Up Approved", desc: "Get notified when your top-up request is approved" },
    { key: "notify_account_request_approved" as const, label: "Account Request Approved", desc: "Get notified when your account request is approved" },
    { key: "notify_withdrawal" as const, label: "Withdrawal Notifications", desc: "Get notified about withdrawal activity" },
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
          {/* Timezone Section */}
          <div>
            <p className="font-medium text-foreground mb-2">Timezone</p>
            <select
              value={userTimezone}
              onChange={(e) => setUserTimezone(e.target.value)}
              className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-foreground text-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">Used for displaying dates and times in the dashboard.</p>
          </div>

          {/* Telegram Section */}
          <div>
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
                  Message <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-primary underline">@userinfobot</a> on Telegram to get your Chat ID.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ⚠️ Before receiving messages, send <strong>/start</strong> to{" "}
                  <a href="https://t.me/nywideagencybot" target="_blank" rel="noopener noreferrer" className="text-primary underline">@nywideagencybot</a>{" "}
                  on Telegram to activate your chat ID.
                </p>
              </div>
            )}
          </div>

          {/* Notification Type Toggles */}
          <div className="border-t border-border pt-6 space-y-4">
            <p className="font-medium text-foreground text-sm">Notification Types</p>
            {toggleItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch checked={settings[item.key]} onCheckedChange={(v) => setSettings({ ...settings, [item.key]: v })} />
              </div>
            ))}
          </div>

          {/* Low Balance Threshold */}
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

          {/* Daily Report Section */}
          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium text-foreground">Daily Telegram Report</p>
                <p className="text-sm text-muted-foreground">Receive a daily summary of all accounts via Telegram</p>
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
                <p className="text-xs text-muted-foreground">Report will be sent at {String(dailyReport.hour).padStart(2, '0')}:{String(dailyReport.minute).padStart(2, '0')} in your timezone ({userTimezone}). Telegram must be enabled with a valid Chat ID.</p>
              </div>
            )}
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground font-bold rounded-full">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
