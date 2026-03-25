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
  console.log(`[FB API] Sending spend_cap=${newCapDollars} dollars to act_${adAccountId}`);
  const res = await fetch(`${FB_API_BASE}/act_${adAccountId}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `spend_cap=${newCapDollars}&access_token=${token}`,
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

async function syncAdAccountFromFacebook(adminClient: any, accountId: string, token: string) {
  const fbData = await fbGet(accountId, "spend_cap,amount_spent", token);
  if (fbData.error) {
    console.log(`[FB API] syncAdAccount error for ${accountId}:`, fbData.error.message);
    return null;
  }
  // Facebook returns cents — divide by 100 to get dollars
  const spendLimitDollars = toNumber(fbData.spend_cap) / 100;
  const amountSpentDollars = toNumber(fbData.amount_spent) / 100;

  console.log(`[FB API] sync ${accountId}: FB returned spend_cap=${fbData.spend_cap} cents -> $${spendLimitDollars}, amount_spent=${fbData.amount_spent} cents -> $${amountSpentDollars}`);

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
      const commissionRate = await getCommissionRate(adminClient, targetUserId);

      const synced = await syncAdAccountFromFacebook(adminClient, ad_account_id, FB_ACCESS_TOKEN);
      const currentCap = synced ? synced.spend_limit : 0;
      const amountSpent = synced ? synced.amount_spent : 0;
      const availableBalance = currentCap - amountSpent;

      if (amount > availableBalance) {
        return jsonResponse({ error: `Insufficient account balance. Available: $${availableBalance.toFixed(2)}` }, 400);
      }

      const refund = amount / (1 - commissionRate / 100);
      const newCap = currentCap - amount;

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
