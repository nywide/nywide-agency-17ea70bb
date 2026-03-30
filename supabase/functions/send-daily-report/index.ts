import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const currentHourUTC = now.getUTCHours();
    const currentMinuteUTC = now.getUTCMinutes();

    // Fetch all profiles with daily report enabled and Telegram configured
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, wallet_balance, timezone, notification_settings, daily_report_settings");

    if (error || !profiles) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const profile of profiles) {
      const reportSettings = profile.daily_report_settings as any;
      const notifSettings = profile.notification_settings as any;

      if (!reportSettings?.enabled) continue;
      if (!notifSettings?.telegram || !notifSettings?.telegram_chat_id) continue;

      const userTz = profile.timezone || "UTC";
      
      // Calculate the user's current local hour/minute from UTC
      // Simple offset calculation using Intl
      const userLocalTime = new Date(now.toLocaleString("en-US", { timeZone: userTz }));
      const userHour = userLocalTime.getHours();
      const userMinute = userLocalTime.getMinutes();

      // Check if it's the right time (within a 30-minute window to account for cron granularity)
      const targetHour = reportSettings.hour ?? 9;
      const targetMinute = reportSettings.minute ?? 0;

      if (userHour !== targetHour || Math.abs(userMinute - targetMinute) > 30) continue;

      // Fetch user's ad accounts
      const { data: accounts } = await supabase
        .from("ad_accounts")
        .select("account_name, user_account_name, account_id, spend_limit, amount_spent, timezone, facebook_email, is_disabled, platform, currency")
        .eq("user_id", profile.id);

      // Fetch commission rate
      const [overrideRes, globalRes] = await Promise.all([
        supabase.from("user_commission_overrides").select("rate").eq("user_id", profile.id).maybeSingle(),
        supabase.from("commission_settings").select("rate").limit(1).single(),
      ]);
      const commissionRate = overrideRes.data?.rate ?? globalRes.data?.rate ?? 6;

      // Fetch recent transactions (last 24 hours)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentTxns } = await supabase
        .from("transactions")
        .select("type, amount, status, created_at")
        .eq("user_id", profile.id)
        .gte("created_at", oneDayAgo)
        .order("created_at", { ascending: false });

      // Fetch custom metrics
      const { data: customMetrics } = await supabase
        .from("user_custom_metrics")
        .select("name, formula, threshold, alert_type")
        .eq("user_id", profile.id);

      // Build report message
      const accs = accounts || [];
      const totalSpendLimit = accs.reduce((s: number, a: any) => s + Number(a.spend_limit || 0), 0);
      const totalAmountSpent = accs.reduce((s: number, a: any) => s + Number(a.amount_spent || 0), 0);
      const totalRemaining = totalSpendLimit - totalAmountSpent;

      let msg = `📋 <b>Daily Report</b>\n`;
      msg += `━━━━━━━━━━━━━━━━\n`;
      msg += `💰 <b>Wallet Balance:</b> $${Number(profile.wallet_balance).toFixed(2)}\n`;
      msg += `📊 <b>Commission Rate:</b> ${commissionRate}%\n\n`;

      if (accs.length > 0) {
        msg += `<b>Ad Accounts (${accs.length}):</b>\n`;
        for (const acc of accs) {
          const name = acc.user_account_name || acc.account_name;
          const remaining = Number(acc.spend_limit || 0) - Number(acc.amount_spent || 0);
          const disabled = acc.is_disabled ? " ❌" : "";
          msg += `\n• <b>${name}</b>${disabled}\n`;
          msg += `  ID: <code>${acc.account_id}</code>\n`;
          msg += `  Limit: $${Number(acc.spend_limit || 0).toFixed(2)} | Spent: $${Number(acc.amount_spent || 0).toFixed(2)} | Left: $${remaining.toFixed(2)}\n`;
          if (acc.timezone) msg += `  TZ: ${acc.timezone}\n`;
          if (acc.facebook_email) msg += `  FB Email: ${acc.facebook_email}\n`;
        }
        msg += `\n<b>Totals:</b> Limit $${totalSpendLimit.toFixed(2)} | Spent $${totalAmountSpent.toFixed(2)} | Remaining $${totalRemaining.toFixed(2)}\n`;
      }

      if (customMetrics && customMetrics.length > 0) {
        msg += `\n<b>Custom Metrics:</b>\n`;
        const variables: Record<string, number> = {
          spend_limit: totalSpendLimit,
          amount_spent: totalAmountSpent,
          commission_rate: commissionRate,
          wallet_balance: Number(profile.wallet_balance),
        };
        for (const cm of customMetrics) {
          try {
            let expr = cm.formula;
            for (const [key, val] of Object.entries(variables)) {
              expr = expr.replace(new RegExp(key, "g"), String(val));
            }
            const result = new Function(`return (${expr})`)();
            msg += `• ${cm.name}: ${typeof result === "number" ? result.toFixed(2) : "N/A"}`;
            if (cm.threshold !== null) msg += ` (threshold: ${cm.alert_type} ${cm.threshold})`;
            msg += `\n`;
          } catch {
            msg += `• ${cm.name}: Error\n`;
          }
        }
      }

      const txns = recentTxns || [];
      if (txns.length > 0) {
        msg += `\n<b>Recent Transactions (24h):</b>\n`;
        for (const t of txns.slice(0, 10)) {
          msg += `• ${t.type.replace(/_/g, " ")} $${Number(t.amount).toFixed(2)} [${t.status}]\n`;
        }
        if (txns.length > 10) msg += `  ...and ${txns.length - 10} more\n`;
      }

      // Send via Telegram
      await supabase.functions.invoke("send-telegram-notification", {
        body: {
          chat_id: notifSettings.telegram_chat_id,
          message: msg,
        },
      });
      sentCount++;
    }

    return new Response(JSON.stringify({ ok: true, sent: sentCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});