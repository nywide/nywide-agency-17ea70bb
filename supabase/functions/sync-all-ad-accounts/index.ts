import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FB_API_BASE = "https://graph.facebook.com/v22.0";

async function fbGet(adAccountId: string, fields: string, token: string) {
  const res = await fetch(`${FB_API_BASE}/act_${adAccountId}?fields=${fields}&access_token=${token}`);
  const data = await res.json();
  // Facebook returns values in cents, convert to dollars
  if (data.spend_cap) data.spend_cap = Number(data.spend_cap) / 100;
  if (data.amount_spent) data.amount_spent = Number(data.amount_spent) / 100;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const fbAccessToken = Deno.env.get("FB_ACCESS_TOKEN");

  if (!fbAccessToken) {
    return new Response(JSON.stringify({ error: "FB_ACCESS_TOKEN not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let syncedCount = 0;
  let offset = 0;
  const limit = 50;
  let hasMore = true;

  while (hasMore) {
    const { data: accounts, error } = await supabase
      .from("ad_accounts")
      .select("id, account_id, user_id, spend_limit, amount_spent")
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[sync-all] Error fetching accounts:", error);
      break;
    }

    if (!accounts || accounts.length === 0) break;

    for (const account of accounts) {
      try {
        const fbData = await fbGet(account.account_id, "spend_cap,amount_spent", fbAccessToken);
        if (fbData.error) {
          console.error(`[sync-all] Facebook error for ${account.account_id}:`, fbData.error.message);
          continue;
        }

        const newSpendLimit = fbData.spend_cap ?? Number(account.spend_limit);
        const newAmountSpent = fbData.amount_spent ?? Number(account.amount_spent);
        const oldAmountSpent = Number(account.amount_spent || 0);
        const amountSpentChanged = Math.abs(newAmountSpent - oldAmountSpent) > 0.01;

        // Update ad_accounts
        await supabase
          .from("ad_accounts")
          .update({
            spend_limit: newSpendLimit,
            amount_spent: newAmountSpent,
            current_spend: newAmountSpent,
          })
          .eq("id", account.id);

        // Update cache
        await supabase.from("ad_account_cache").upsert({
          account_id: account.account_id,
          spend_cap: newSpendLimit,
          amount_spent: newAmountSpent,
          last_fetched_at: new Date().toISOString(),
        }, { onConflict: "account_id" });

        // Log spend change
        if (amountSpentChanged) {
          await supabase.from("ad_account_transactions").insert({
            ad_account_id: account.account_id,
            user_id: account.user_id || null,
            type: "spend",
            amount: newAmountSpent - oldAmountSpent,
            old_amount_spent: oldAmountSpent,
            new_amount_spent: newAmountSpent,
            old_spend_limit: Number(account.spend_limit),
            new_spend_limit: newSpendLimit,
          });
        }

        // Check low balance
        if (account.user_id) {
          const remaining = Math.max(0, newSpendLimit - newAmountSpent);
          const { data: profile } = await supabase
            .from("profiles")
            .select("notification_settings, full_name, email")
            .eq("id", account.user_id)
            .single();

          const settings = profile?.notification_settings as any;
          const threshold = settings?.low_balance_threshold ?? 10;
          const alertEnabled = settings?.notify_low_balance !== false;

          if (alertEnabled && remaining > 0 && remaining < threshold && newSpendLimit > 0) {
            const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
            const { data: recentNotif } = await supabase
              .from("notifications")
              .select("id")
              .eq("user_id", account.user_id)
              .eq("type", "low_balance")
              .gte("created_at", sixHoursAgo)
              .limit(1);

            if (!recentNotif || recentNotif.length === 0) {
              const userIdentifier = profile?.full_name || profile?.email || account.user_id;

              // Notify user
              await supabase.from("notifications").insert({
                user_id: account.user_id,
                title: "Low ad account balance",
                message: `Account ${account.account_id} has $${remaining.toFixed(2)} remaining (threshold: $${threshold}).`,
                type: "low_balance",
                recipient_type: "user",
              });

              // Notify admin with user name
              await supabase.from("notifications").insert({
                user_id: null,
                title: "Low Balance Alert",
                message: `User ${userIdentifier} has $${remaining.toFixed(2)} remaining in ad account ${account.account_id}.`,
                type: "low_balance",
                recipient_type: "admin",
              });

              console.log(`[sync-all] Low balance notification for ${userIdentifier}, remaining: $${remaining.toFixed(2)}`);

              // Send Telegram to user if enabled
              if (settings?.telegram && settings?.telegram_chat_id) {
                const telegramUrl = supabaseUrl + "/functions/v1/send-telegram-notification";
                await fetch(telegramUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
                  body: JSON.stringify({
                    chat_id: settings.telegram_chat_id,
                    message: `⚠️ <b>Low Balance Alert</b>\nAccount ${account.account_id} has <b>$${remaining.toFixed(2)}</b> remaining (threshold: $${threshold}).`,
                  }),
                });
              }

              // Send Telegram to admin if enabled
              try {
                const { data: adminSettings } = await supabase
                  .from("admin_settings")
                  .select("notification_settings")
                  .limit(1)
                  .single();
                const adminNs = adminSettings?.notification_settings as any;
                if (adminNs?.telegram && adminNs?.telegram_chat_id && adminNs?.notify_low_balance !== false) {
                  const telegramUrl = supabaseUrl + "/functions/v1/send-telegram-notification";
                  await fetch(telegramUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
                    body: JSON.stringify({
                      chat_id: adminNs.telegram_chat_id,
                      message: `🛡️ <b>[Admin] Low Balance Alert</b>\nUser ${userIdentifier} has <b>$${remaining.toFixed(2)}</b> remaining in account ${account.account_id}.`,
                    }),
                  });
                }
              } catch (adminErr) {
                console.warn("[sync-all] Admin Telegram error:", adminErr);
              }
            }
          }
        }

        syncedCount++;
      } catch (err) {
        console.error(`[sync-all] Failed to sync account ${account.account_id}:`, err);
      }
    }

    offset += limit;
    hasMore = accounts.length === limit;
  }

  console.log(`[sync-all] Synced ${syncedCount} accounts`);

  return new Response(JSON.stringify({ success: true, synced: syncedCount }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
