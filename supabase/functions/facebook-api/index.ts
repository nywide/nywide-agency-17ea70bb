import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FB_API_BASE = "https://graph.facebook.com/v22.0";

async function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

async function getCommissionRate(adminClient: any, userId: string): Promise<number> {
  const { data: overrideData } = await adminClient
    .from("user_commission_overrides").select("rate").eq("user_id", userId).maybeSingle();
  if (overrideData) return overrideData.rate;
  const { data: settingsData } = await adminClient
    .from("commission_settings").select("rate").limit(1).single();
  return settingsData?.rate ?? 6;
}

async function fbGet(adAccountId: string, fields: string, token: string) {
  const res = await fetch(`${FB_API_BASE}/act_${adAccountId}?fields=${fields}&access_token=${token}`);
  const data = await res.json();
  // Convert cents → dollars
  if (data.spend_cap) {
    const rawCap = Number(data.spend_cap);
    data.spend_cap = rawCap / 100;
    console.log(`[FB API] Received spend_cap raw=${rawCap} cents -> $${data.spend_cap}`);
  }
  if (data.amount_spent) {
    const rawSpent = Number(data.amount_spent);
    data.amount_spent = rawSpent / 100;
    console.log(`[FB API] Received amount_spent raw=${rawSpent} cents -> $${data.amount_spent}`);
  }
  return data;
}

async function fbUpdateSpendCap(adAccountId: string, newCapDollars: number, token: string) {
  // Facebook API expects spend_cap in cents
  const capCents = Math.max(1, Math.round(newCapDollars * 100));
  console.log(`[FB API] Sending spend_cap=${capCents} cents ($${newCapDollars}) to act_${adAccountId}`);
  const res = await fetch(`${FB_API_BASE}/act_${adAccountId}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `spend_cap=${capCents}&access_token=${token}`,
  });
  return res.json();
}

function toNumber(val: number | string | null | undefined): number {
  if (val === null || val === undefined) return 0;
  return Number(val);
}

async function logAdAccountTransaction(adminClient: any, data: {
  ad_account_id: string; user_id?: string; type: string; amount: number;
  old_spend_limit: number; new_spend_limit: number; old_amount_spent: number; new_amount_spent: number;
}) {
  try {
    await adminClient.from("ad_account_transactions").insert(data);
  } catch (err) {
    console.warn("[FB API] Failed to log ad_account_transaction:", err);
  }
}

async function logSpendChangeIfNeeded(adminClient: any, accountId: string, oldSpent: number, newSpent: number, userId?: string) {
  if (Math.abs(newSpent - oldSpent) > 0.01) {
    console.log(`[FB API] Spend change detected for ${accountId}: $${oldSpent} -> $${newSpent}`);
    await adminClient.from("ad_account_transactions").insert({
      ad_account_id: accountId,
      user_id: userId || null,
      type: "spend",
      amount: newSpent - oldSpent,
      old_amount_spent: oldSpent,
      new_amount_spent: newSpent,
      old_spend_limit: 0,
      new_spend_limit: 0,
    });
  }
}

async function syncAdAccountFromFacebook(adminClient: any, accountId: string, token: string) {
  // Pre-fetch current values for spend change tracking
  const { data: currentAccount } = await adminClient
    .from("ad_accounts")
    .select("amount_spent, user_id")
    .eq("account_id", accountId)
    .maybeSingle();
  const oldSpent = Number(currentAccount?.amount_spent || 0);

  const fbData = await fbGet(accountId, "spend_cap,amount_spent", token);
  if (fbData.error) {
    console.log(`[FB API] syncAdAccount error for ${accountId}:`, fbData.error.message);
    return null;
  }
  // fbGet already converts cents → dollars
  const spendLimitDollars = toNumber(fbData.spend_cap);
  const amountSpentDollars = toNumber(fbData.amount_spent);

  console.log(`[FB API] sync ${accountId}: spend_cap=$${spendLimitDollars}, amount_spent=$${amountSpentDollars}`);

  await adminClient.from("ad_accounts").update({
    spend_limit: spendLimitDollars,
    amount_spent: amountSpentDollars,
    current_spend: amountSpentDollars,
  }).eq("account_id", accountId);

  await adminClient.from("ad_account_cache").upsert({
    account_id: accountId,
    spend_cap: spendLimitDollars,
    amount_spent: amountSpentDollars,
    last_fetched_at: new Date().toISOString(),
  }, { onConflict: "account_id" });

  // Log spend change if any
  await logSpendChangeIfNeeded(adminClient, accountId, oldSpent, amountSpentDollars, currentAccount?.user_id);

  // Check low balance and notify user if below threshold
  if (currentAccount?.user_id) {
    const remaining = Math.max(0, spendLimitDollars - amountSpentDollars);
    try {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("notification_settings, full_name, email")
        .eq("id", currentAccount.user_id)
        .single();
      const settings = profile?.notification_settings as any;
      const threshold = settings?.low_balance_threshold ?? 10;
      const alertEnabled = settings?.notify_low_balance !== false;
      if (alertEnabled && remaining > 0 && remaining < threshold && spendLimitDollars > 0) {
        // Check if we already notified recently (last 6 hours) to avoid spam
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
        const { data: recentNotif } = await adminClient
          .from("notifications")
          .select("id")
          .eq("user_id", currentAccount.user_id)
          .eq("type", "low_balance")
          .gte("created_at", sixHoursAgo)
          .limit(1);
        if (!recentNotif || recentNotif.length === 0) {
          const userIdentifier = profile?.full_name || profile?.email || currentAccount.user_id;

          await adminClient.from("notifications").insert({
            user_id: currentAccount.user_id,
            title: "Low ad account balance",
            message: `Account ${accountId} has $${remaining.toFixed(2)} remaining (threshold: $${threshold}).`,
            type: "low_balance",
            recipient_type: "user",
          });
          // Also notify admin with user name
          await adminClient.from("notifications").insert({
            user_id: null,
            title: "Low Balance Alert",
            message: `User ${userIdentifier} has $${remaining.toFixed(2)} remaining in ad account ${accountId}.`,
            type: "low_balance",
            recipient_type: "admin",
          });
          console.log(`[FB API] Low balance notification for user ${userIdentifier}, remaining: $${remaining.toFixed(2)}`);
          // Send Telegram to user if enabled
          if (settings?.telegram && settings?.telegram_chat_id) {
            const telegramUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/send-telegram-notification";
            const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
            await fetch(telegramUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
              body: JSON.stringify({
                chat_id: settings.telegram_chat_id,
                message: `⚠️ <b>Low Balance Alert</b>\nAccount ${accountId} has <b>$${remaining.toFixed(2)}</b> remaining (threshold: $${threshold}).`,
              }),
            });
          }
          // Send Telegram to admin if enabled
          try {
            const { data: adminSettings } = await adminClient
              .from("admin_settings")
              .select("notification_settings")
              .limit(1)
              .single();
            const adminNs = adminSettings?.notification_settings as any;
            if (adminNs?.telegram && adminNs?.telegram_chat_id && adminNs?.notify_low_balance !== false) {
              const telegramUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/send-telegram-notification";
              const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
              await fetch(telegramUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
                body: JSON.stringify({
                  chat_id: adminNs.telegram_chat_id,
                  message: `🛡️ <b>[Admin] Low Balance Alert</b>\nUser ${userIdentifier} has <b>$${remaining.toFixed(2)}</b> remaining in account ${accountId}.`,
                }),
              });
            }
          } catch (adminErr) {
            console.warn("[FB API] Admin Telegram error:", adminErr);
          }
        }
      }
    } catch (err) {
      console.warn("[FB API] Low balance check error:", err);
    }
  }

  return { spend_limit: spendLimitDollars, amount_spent: amountSpentDollars };
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const FB_ACCESS_TOKEN = Deno.env.get("FB_ACCESS_TOKEN");
  if (!FB_ACCESS_TOKEN) return jsonResponse({ error: "FB_ACCESS_TOKEN not configured" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

  const adminClient = await getAdminClient();

  try {
    const body = await req.json();
    const { action, ad_account_id, amount, user_id, account_ids } = body;

    if (action === "sync_account") {
      const result = await syncAdAccountFromFacebook(adminClient, ad_account_id, FB_ACCESS_TOKEN);
      if (!result) return jsonResponse({ error: "Failed to sync from Facebook" }, 400);
      return jsonResponse(result);
    }

    if (action === "batch_get_spend_limits") {
      const ids: string[] = account_ids || [];
      if (!ids.length) return jsonResponse({ results: {} });

      // Pre-fetch current spends for change tracking
      const { data: currentSpends } = await adminClient
        .from("ad_accounts")
        .select("account_id, amount_spent, user_id")
        .in("account_id", ids);
      const spendMap = new Map<string, { amount: number; userId: string | null }>();
      (currentSpends || []).forEach((c: any) => spendMap.set(c.account_id, { amount: Number(c.amount_spent), userId: c.user_id }));

      const { data: cached } = await adminClient
        .from("ad_account_cache").select("*").in("account_id", ids);
      const cacheMap: Record<string, any> = {};
      const staleIds: string[] = [];
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      for (const c of cached || []) {
        if (c.last_fetched_at > oneHourAgo) {
          cacheMap[c.account_id] = { spend_cap: Number(c.spend_cap), amount_spent: Number(c.amount_spent), cached: true };
        } else {
          staleIds.push(c.account_id);
        }
      }
      const uncachedIds = ids.filter(id => !cacheMap[id] && !staleIds.includes(id));
      const toFetch = [...staleIds, ...uncachedIds];

      const fetchPromises = toFetch.map(async (id) => {
        try {
          const result = await syncAdAccountFromFacebook(adminClient, id, FB_ACCESS_TOKEN);
          if (result) {
            cacheMap[id] = { spend_cap: result.spend_limit, amount_spent: result.amount_spent, cached: false };
          }
        } catch { /* skip failed accounts */ }
      });
      await Promise.all(fetchPromises);

      return jsonResponse({ results: cacheMap });
    }

    if (action === "refresh_balance") {
      const result = await syncAdAccountFromFacebook(adminClient, ad_account_id, FB_ACCESS_TOKEN);
      if (!result) return jsonResponse({ error: "Failed to sync from Facebook" }, 400);
      return jsonResponse(result);
    }

    if (action === "get_spend_limit") {
      const result = await syncAdAccountFromFacebook(adminClient, ad_account_id, FB_ACCESS_TOKEN);
      if (!result) return jsonResponse({ error: "Failed to sync from Facebook" }, 400);
      return jsonResponse({ spend_cap: result.spend_limit, amount_spent: result.amount_spent });
    }

    if (action === "wallet_to_account") {
      const targetUserId = user_id || user.id;

      // Check if account is disabled
      const { data: accCheck } = await adminClient.from("ad_accounts").select("is_disabled, disabled_reason").eq("account_id", ad_account_id).maybeSingle();
      if (accCheck?.is_disabled) {
        return jsonResponse({ error: `Account is disabled: ${accCheck.disabled_reason || "No reason provided"}` }, 400);
      }

      const commissionRate = await getCommissionRate(adminClient, targetUserId);

      const { data: profile } = await adminClient
        .from("profiles").select("wallet_balance").eq("id", targetUserId).single();
      if (!profile || Number(profile.wallet_balance) < amount) {
        return jsonResponse({ error: "Insufficient wallet balance" }, 400);
      }

      const commission = amount * (commissionRate / 100);
      const amountToFb = amount - commission;

      const synced = await syncAdAccountFromFacebook(adminClient, ad_account_id, FB_ACCESS_TOKEN);
      const currentCap = synced ? synced.spend_limit : 0;
      const currentSpent = synced ? synced.amount_spent : 0;
      const newCap = currentCap + amountToFb;

      console.log(`[FB API] wallet_to_account: amount=$${amount}, commission=$${commission}, amountToFb=$${amountToFb}, currentCap=$${currentCap}, newCap=$${newCap}`);

      const fbUpdateData = await fbUpdateSpendCap(ad_account_id, newCap, FB_ACCESS_TOKEN);
      if (fbUpdateData.error) return jsonResponse({ error: `Facebook API: ${fbUpdateData.error.message}` }, 400);

      await adminClient.from("profiles").update({
        wallet_balance: Number(profile.wallet_balance) - amount,
      }).eq("id", targetUserId);

      await adminClient.from("ad_accounts").update({ spend_limit: newCap }).eq("account_id", ad_account_id);

      await adminClient.from("ad_account_cache").upsert({
        account_id: ad_account_id, spend_cap: newCap, last_fetched_at: new Date().toISOString(),
      }, { onConflict: "account_id" });

      await adminClient.from("transactions").insert({
        user_id: targetUserId, type: "wallet_to_account", amount, commission,
        ad_account_id, status: "completed", payment_method: "platform",
      });

      await logAdAccountTransaction(adminClient, {
        ad_account_id, user_id: targetUserId, type: "topup", amount: amountToFb,
        old_spend_limit: currentCap, new_spend_limit: newCap,
        old_amount_spent: currentSpent, new_amount_spent: currentSpent,
      });

      return jsonResponse({
        success: true, commission, amount_sent: amountToFb,
        new_wallet_balance: Number(profile.wallet_balance) - amount,
      });
    }

    if (action === "account_to_wallet") {
      const targetUserId = user_id || user.id;

      // Check if account is disabled
      const { data: accCheck2 } = await adminClient.from("ad_accounts").select("is_disabled, disabled_reason").eq("account_id", ad_account_id).maybeSingle();
      if (accCheck2?.is_disabled) {
        return jsonResponse({ error: `Account is disabled: ${accCheck2.disabled_reason || "No reason provided"}` }, 400);
      }

      const commissionRate = await getCommissionRate(adminClient, targetUserId);

      const synced = await syncAdAccountFromFacebook(adminClient, ad_account_id, FB_ACCESS_TOKEN);
      const currentCap = synced ? synced.spend_limit : 0;
      const amountSpent = synced ? synced.amount_spent : 0;
      const availableBalance = currentCap - amountSpent;

      if (amount > availableBalance) {
        return jsonResponse({ error: `Insufficient account balance. Available: $${availableBalance.toFixed(2)}` }, 400);
      }

      const newCap = currentCap - amount;

      // Enforce minimum remaining balance
      const remainingAfterWithdraw = newCap - amountSpent;
      if (remainingAfterWithdraw < 0.01 && newCap > 0) {
        return jsonResponse({ error: "Account must retain at least $0.01 balance." }, 400);
      }

      const refund = amount / (1 - commissionRate / 100);

      const fbUpdateData = await fbUpdateSpendCap(ad_account_id, newCap, FB_ACCESS_TOKEN);
      if (fbUpdateData.error) return jsonResponse({ error: `Facebook API: ${fbUpdateData.error.message}` }, 400);

      const { data: profile } = await adminClient
        .from("profiles").select("wallet_balance").eq("id", targetUserId).single();
      await adminClient.from("profiles").update({
        wallet_balance: Number(profile!.wallet_balance) + refund,
      }).eq("id", targetUserId);

      await adminClient.from("ad_accounts").update({ spend_limit: newCap }).eq("account_id", ad_account_id);

      await adminClient.from("ad_account_cache").upsert({
        account_id: ad_account_id, spend_cap: newCap, amount_spent: amountSpent,
        last_fetched_at: new Date().toISOString(),
      }, { onConflict: "account_id" });

      await adminClient.from("transactions").insert({
        user_id: targetUserId, type: "account_to_wallet", amount: refund,
        commission: refund - amount, ad_account_id, status: "completed", payment_method: "platform",
      });

      await logAdAccountTransaction(adminClient, {
        ad_account_id, user_id: targetUserId, type: "withdrawal", amount,
        old_spend_limit: currentCap, new_spend_limit: newCap,
        old_amount_spent: amountSpent, new_amount_spent: amountSpent,
      });

      return jsonResponse({
        success: true, refund, amount_withdrawn: amount,
        new_wallet_balance: Number(profile!.wallet_balance) + refund,
      });
    }

    if (action === "set_spend_limit") {
      const amountDollars = amount || 0;
      
      // Get old values for logging
      const { data: oldAcc } = await adminClient.from("ad_accounts").select("spend_limit, amount_spent").eq("account_id", ad_account_id).maybeSingle();
      
      const fbUpdateData = await fbUpdateSpendCap(ad_account_id, amountDollars, FB_ACCESS_TOKEN);
      if (fbUpdateData.error) return jsonResponse({ error: `Facebook API: ${fbUpdateData.error.message}` }, 400);

      await adminClient.from("ad_account_cache").upsert({
        account_id: ad_account_id, spend_cap: amountDollars, last_fetched_at: new Date().toISOString(),
      }, { onConflict: "account_id" });

      await logAdAccountTransaction(adminClient, {
        ad_account_id, type: "admin_set", amount: amountDollars,
        old_spend_limit: Number(oldAcc?.spend_limit || 0), new_spend_limit: amountDollars,
        old_amount_spent: Number(oldAcc?.amount_spent || 0), new_amount_spent: Number(oldAcc?.amount_spent || 0),
      });

      return jsonResponse({ success: true, spend_limit: amountDollars });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
