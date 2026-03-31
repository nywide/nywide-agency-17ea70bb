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

    let alertsSent = 0;

    // === USER CUSTOM METRICS ===
    const { data: metrics } = await supabase
      .from("user_custom_metrics")
      .select("*")
      .eq("alert_enabled", true);

    if (metrics && metrics.length > 0) {
      const userMetrics: Record<string, any[]> = {};
      for (const m of metrics) {
        if (!userMetrics[m.user_id]) userMetrics[m.user_id] = [];
        userMetrics[m.user_id].push(m);
      }

      for (const [userId, userMetricList] of Object.entries(userMetrics)) {
        const [profileRes, accountsRes, commissionRes] = await Promise.all([
          supabase.from("profiles").select("wallet_balance, notification_settings").eq("id", userId).single(),
          supabase.from("ad_accounts").select("spend_limit, amount_spent").eq("user_id", userId),
          supabase.from("commission_settings").select("rate").limit(1).single(),
        ]);

        const profile = profileRes.data;
        const accounts = accountsRes.data || [];
        const commissionRate = commissionRes.data?.rate || 6;

        const totalSpendLimit = accounts.reduce((s: number, a: any) => s + Number(a.spend_limit || 0), 0);
        const totalAmountSpent = accounts.reduce((s: number, a: any) => s + Number(a.amount_spent || 0), 0);

        const variables: Record<string, number> = {
          spend_limit: totalSpendLimit,
          amount_spent: totalAmountSpent,
          commission_rate: commissionRate,
          wallet_balance: Number(profile?.wallet_balance || 0),
        };

        for (const metric of userMetricList) {
          try {
            let expr = metric.formula;
            for (const [key, val] of Object.entries(variables)) {
              expr = expr.replace(new RegExp(key, "g"), String(val));
            }
            const result = new Function(`return (${expr})`)();
            if (typeof result !== "number" || isNaN(result)) continue;
            if (metric.threshold === null) continue;

            const triggered =
              (metric.alert_type === "below" && result < metric.threshold) ||
              (metric.alert_type === "above" && result > metric.threshold);

            if (triggered) {
              const settings = profile?.notification_settings as any;
              if (settings?.telegram && settings?.telegram_chat_id) {
                await supabase.functions.invoke("send-telegram-notification", {
                  body: {
                    chat_id: settings.telegram_chat_id,
                    message: `📊 <b>Custom Metric Alert: ${metric.name}</b>\nValue: ${result.toFixed(2)} is ${metric.alert_type} threshold ${metric.threshold}\nFormula: ${metric.formula}`,
                  },
                });
                alertsSent++;
              }
              await supabase.from("notifications").insert({
                user_id: userId,
                title: `Metric Alert: ${metric.name}`,
                message: `Value ${result.toFixed(2)} is ${metric.alert_type} threshold ${metric.threshold}`,
                type: "custom_metric",
                recipient_type: "user",
              });
            }
          } catch (evalErr) {
            console.error(`[CustomMetrics] Error evaluating user metric ${metric.id}:`, evalErr);
          }
        }
      }
    }

    // === ADMIN CUSTOM METRICS ===
    const { data: adminMetrics } = await supabase
      .from("admin_custom_metrics")
      .select("*")
      .eq("alert_enabled", true);

    if (adminMetrics && adminMetrics.length > 0) {
      // Fetch platform-wide aggregates
      const [balRes, accRes, txnRes, userCountRes, accCountRes] = await Promise.all([
        supabase.from("profiles").select("wallet_balance"),
        supabase.from("ad_accounts").select("spend_limit, amount_spent"),
        supabase.from("transactions").select("commission").eq("status", "completed").eq("type", "wallet_to_account"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("ad_accounts").select("id", { count: "exact", head: true }),
      ]);

      const totalWalletBalance = (balRes.data || []).reduce((s: number, p: any) => s + Number(p.wallet_balance || 0), 0);
      const totalSpendLimit = (accRes.data || []).reduce((s: number, a: any) => s + Number(a.spend_limit || 0), 0);
      const totalAmountSpent = (accRes.data || []).reduce((s: number, a: any) => s + Number(a.amount_spent || 0), 0);
      const totalCommissionEarned = (txnRes.data || []).reduce((s: number, t: any) => s + Number(t.commission || 0), 0);

      const adminVars: Record<string, number> = {
        total_wallet_balance: totalWalletBalance,
        total_spend_limit: totalSpendLimit,
        total_amount_spent: totalAmountSpent,
        total_commission_earned: totalCommissionEarned,
        active_users_count: userCountRes.count || 0,
        total_accounts: accCountRes.count || 0,
      };

      // Fetch admin Telegram settings
      const { data: adminSettings } = await supabase
        .from("admin_settings")
        .select("notification_settings")
        .limit(1)
        .single();
      const adminNs = adminSettings?.notification_settings as any;

      for (const metric of adminMetrics) {
        try {
          let expr = metric.formula;
          for (const [key, val] of Object.entries(adminVars)) {
            expr = expr.replace(new RegExp(key, "g"), String(val));
          }
          const result = new Function(`return (${expr})`)();
          if (typeof result !== "number" || isNaN(result)) continue;
          if (metric.threshold === null) continue;

          const triggered =
            (metric.alert_type === "below" && result < metric.threshold) ||
            (metric.alert_type === "above" && result > metric.threshold);

          if (triggered) {
            if (adminNs?.telegram && adminNs?.telegram_chat_id) {
              await supabase.functions.invoke("send-telegram-notification", {
                body: {
                  chat_id: adminNs.telegram_chat_id,
                  message: `📊 <b>[Admin] Metric Alert: ${metric.name}</b>\nValue: ${result.toFixed(2)} is ${metric.alert_type} threshold ${metric.threshold}\nFormula: ${metric.formula}`,
                },
              });
              alertsSent++;
            }
            await supabase.from("notifications").insert({
              user_id: null,
              title: `Admin Metric Alert: ${metric.name}`,
              message: `Value ${result.toFixed(2)} is ${metric.alert_type} threshold ${metric.threshold}`,
              type: "custom_metric",
              recipient_type: "admin",
            });
          }
        } catch (evalErr) {
          console.error(`[CustomMetrics] Error evaluating admin metric ${metric.id}:`, evalErr);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, evaluated: (metrics?.length || 0) + (adminMetrics?.length || 0), alertsSent }), {
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
