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

    // Get all users with custom metrics that have alerts enabled
    const { data: metrics, error: metricsError } = await supabase
      .from("user_custom_metrics")
      .select("*")
      .eq("alert_enabled", true);

    if (metricsError || !metrics || metrics.length === 0) {
      return new Response(JSON.stringify({ ok: true, evaluated: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by user_id
    const userMetrics: Record<string, any[]> = {};
    for (const m of metrics) {
      if (!userMetrics[m.user_id]) userMetrics[m.user_id] = [];
      userMetrics[m.user_id].push(m);
    }

    let alertsSent = 0;

    for (const [userId, userMetricList] of Object.entries(userMetrics)) {
      // Fetch user data
      const [profileRes, accountsRes, commissionRes] = await Promise.all([
        supabase.from("profiles").select("wallet_balance, notification_settings").eq("id", userId).single(),
        supabase.from("ad_accounts").select("spend_limit, amount_spent").eq("user_id", userId),
        supabase.from("commission_settings").select("rate").limit(1).single(),
      ]);

      const profile = profileRes.data;
      const accounts = accountsRes.data || [];
      const commissionRate = commissionRes.data?.rate || 6;

      // Aggregate values
      const totalSpendLimit = accounts.reduce((s: number, a: any) => s + Number(a.spend_limit || 0), 0);
      const totalAmountSpent = accounts.reduce((s: number, a: any) => s + Number(a.amount_spent || 0), 0);
      const walletBalance = Number(profile?.wallet_balance || 0);

      const variables: Record<string, number> = {
        spend_limit: totalSpendLimit,
        amount_spent: totalAmountSpent,
        commission_rate: commissionRate,
        wallet_balance: walletBalance,
      };

      for (const metric of userMetricList) {
        try {
          // Safely evaluate formula
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

            // Also insert in-app notification
            await supabase.from("notifications").insert({
              user_id: userId,
              title: `Metric Alert: ${metric.name}`,
              message: `Value ${result.toFixed(2)} is ${metric.alert_type} threshold ${metric.threshold}`,
              type: "custom_metric",
              recipient_type: "user",
            });
          }
        } catch (evalErr) {
          console.error(`[CustomMetrics] Error evaluating metric ${metric.id}:`, evalErr);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, evaluated: metrics.length, alertsSent }), {
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