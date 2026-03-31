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
    let sentCount = 0;

    // === USER DAILY REPORTS ===
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, wallet_balance, timezone, notification_settings, daily_report_settings");

    if (profiles) {
      for (const profile of profiles) {
        const reportSettings = profile.daily_report_settings as any;
        const notifSettings = profile.notification_settings as any;

        if (!reportSettings?.enabled) continue;
        if (!notifSettings?.telegram || !notifSettings?.telegram_chat_id) continue;

        const userTz = profile.timezone || "UTC";
        const userLocalTime = new Date(now.toLocaleString("en-US", { timeZone: userTz }));
        const userHour = userLocalTime.getHours();
        const userMinute = userLocalTime.getMinutes();

        const targetHour = reportSettings.hour ?? 9;
        const targetMinute = reportSettings.minute ?? 0;

        if (userHour !== targetHour || Math.abs(userMinute - targetMinute) > 30) continue;

        const { data: accounts } = await supabase
          .from("ad_accounts")
          .select("account_name, user_account_name, account_id, spend_limit, amount_spent, timezone, facebook_email, is_disabled, platform, currency")
          .eq("user_id", profile.id);

        const [overrideRes, globalRes] = await Promise.all([
          supabase.from("user_commission_overrides").select("rate").eq("user_id", profile.id).maybeSingle(),
          supabase.from("commission_settings").select("rate").limit(1).single(),
        ]);
        const commissionRate = overrideRes.data?.rate ?? globalRes.data?.rate ?? 6;

        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recentTxns } = await supabase
          .from("transactions")
          .select("type, amount, status, created_at")
          .eq("user_id", profile.id)
          .gte("created_at", oneDayAgo)
          .order("created_at", { ascending: false });

        const { data: customMetrics } = await supabase
          .from("user_custom_metrics")
          .select("name, formula, threshold, alert_type")
          .eq("user_id", profile.id);

        const accs = accounts || [];
        const totalSpendLimit = accs.reduce((s: number, a: any) => s + Number(a.spend_limit || 0), 0);
        const totalAmountSpent = accs.reduce((s: number, a: any) => s + Number(a.amount_spent || 0), 0);
        const totalRemaining = totalSpendLimit - totalAmountSpent;

        let msg = `📋 <b>Daily Report</b>\n━━━━━━━━━━━━━━━━\n`;
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
          }
          msg += `\n<b>Totals:</b> Limit $${totalSpendLimit.toFixed(2)} | Spent $${totalAmountSpent.toFixed(2)} | Remaining $${totalRemaining.toFixed(2)}\n`;
        }

        if (customMetrics && customMetrics.length > 0) {
          msg += `\n<b>Custom Metrics:</b>\n`;
          const variables: Record<string, number> = {
            spend_limit: totalSpendLimit, amount_spent: totalAmountSpent,
            commission_rate: commissionRate, wallet_balance: Number(profile.wallet_balance),
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
            } catch { msg += `• ${cm.name}: Error\n`; }
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

        await supabase.functions.invoke("send-telegram-notification", {
          body: { chat_id: notifSettings.telegram_chat_id, message: msg },
        });
        sentCount++;
      }
    }

    // === ADMIN DAILY REPORT ===
    const { data: adminSettings } = await supabase
      .from("admin_settings")
      .select("notification_settings, daily_report_settings, timezone")
      .limit(1)
      .single();

    if (adminSettings) {
      const adminNs = adminSettings.notification_settings as any;
      const adminReport = (adminSettings as any).daily_report_settings as any;
      const adminTz = adminSettings.timezone || "UTC";

      if (adminReport?.enabled && adminNs?.telegram && adminNs?.telegram_chat_id) {
        const adminLocalTime = new Date(now.toLocaleString("en-US", { timeZone: adminTz }));
        const adminHour = adminLocalTime.getHours();
        const adminMinute = adminLocalTime.getMinutes();
        const targetHour = adminReport.hour ?? 9;
        const targetMinute = adminReport.minute ?? 0;

        if (adminHour === targetHour && Math.abs(adminMinute - targetMinute) <= 30) {
          const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          let msg = `🛡️ <b>Admin Daily Report</b>\n━━━━━━━━━━━━━━━━\n\n`;

          if (adminReport.include_total_stats !== false) {
            const [balRes, accRes, txnRes] = await Promise.all([
              supabase.from("profiles").select("wallet_balance"),
              supabase.from("ad_accounts").select("spend_limit, amount_spent"),
              supabase.from("transactions").select("commission").eq("status", "completed").eq("type", "wallet_to_account"),
            ]);
            const totalBal = (balRes.data || []).reduce((s: number, p: any) => s + Number(p.wallet_balance || 0), 0);
            const totalLimit = (accRes.data || []).reduce((s: number, a: any) => s + Number(a.spend_limit || 0), 0);
            const totalSpent = (accRes.data || []).reduce((s: number, a: any) => s + Number(a.amount_spent || 0), 0);
            const totalComm = (txnRes.data || []).reduce((s: number, t: any) => s + Number(t.commission || 0), 0);
            msg += `<b>Platform Stats:</b>\n`;
            msg += `💰 Total Wallet Balance: $${totalBal.toFixed(2)}\n`;
            msg += `📊 Total Spend Limit: $${totalLimit.toFixed(2)}\n`;
            msg += `💸 Total Amount Spent: $${totalSpent.toFixed(2)}\n`;
            msg += `🏦 Total Commission: $${totalComm.toFixed(2)}\n\n`;
          }

          if (adminReport.include_new_users !== false) {
            const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", oneDayAgo);
            msg += `👤 New users today: ${count || 0}\n`;
          }

          if (adminReport.include_new_account_requests !== false) {
            const { count } = await supabase.from("account_requests").select("id", { count: "exact", head: true }).gte("created_at", oneDayAgo);
            msg += `📝 New account requests: ${count || 0}\n`;
          }

          if (adminReport.include_new_topup_requests !== false) {
            const { count } = await supabase.from("topup_requests").select("id", { count: "exact", head: true }).gte("created_at", oneDayAgo);
            msg += `💳 New top-up requests: ${count || 0}\n`;
          }

          if (adminReport.include_low_balance !== false) {
            const { data: lowBal } = await supabase.from("notifications").select("id").eq("type", "low_balance").eq("recipient_type", "admin").gte("created_at", oneDayAgo);
            msg += `⚠️ Low balance alerts today: ${lowBal?.length || 0}\n`;
          }

          await supabase.functions.invoke("send-telegram-notification", {
            body: { chat_id: adminNs.telegram_chat_id, message: msg },
          });
          sentCount++;
        }
      }
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
