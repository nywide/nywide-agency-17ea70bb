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
  return res.json();
}

async function fbUpdateSpendCap(adAccountId: string, amountInCents: number, token: string) {
  console.log(`[FB API] fbUpdateSpendCap: sending spend_cap=${amountInCents} (cents) to act_${adAccountId}`);
  const res = await fetch(`${FB_API_BASE}/act_${adAccountId}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `spend_cap=${amountInCents}&access_token=${token}`,
  });
  return res.json();
}

// Convert Facebook API cents to dollars
function centsToDollars(cents: number | string | null | undefined): number {
  if (cents === null || cents === undefined) return 0;
  return Number(cents) / 100;
}

// Convert dollars to Facebook API cents
function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Sync an ad account from Facebook API and update DB. Returns values in dollars. */
async function syncAdAccountFromFacebook(adminClient: any, accountId: string, token: string) {
  const fbData = await fbGet(accountId, "spend_cap,amount_spent", token);
  if (fbData.error) {
    console.log(`[FB API] syncAdAccount error for ${accountId}:`, fbData.error.message);
    return null;
  }
  const spendCapCents = fbData.spend_cap ? Number(fbData.spend_cap) : 0;
  const amountSpentCents = fbData.amount_spent ? Number(fbData.amount_spent) : 0;
  const spendLimitDollars = centsToDollars(spendCapCents);
  const amountSpentDollars = centsToDollars(amountSpentCents);

  console.log(`[FB API] sync ${accountId}: FB returned spend_cap=${spendCapCents} cents, amount_spent=${amountSpentCents} cents`);
  console.log(`[FB API] sync ${accountId}: Converted to dollars: spend_limit=$${spendLimitDollars}, amount_spent=$${amountSpentDollars}`);

  // Update ad_accounts table
  await adminClient.from("ad_accounts").update({
    spend_limit: spendLimitDollars,
    amount_spent: amountSpentDollars,
    current_spend: amountSpentDollars,
  }).eq("account_id", accountId);

  // Update cache
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

    // Sync a single account from Facebook
    if (action === "sync_account") {
      const result = await syncAdAccountFromFacebook(adminClient, ad_account_id, FB_ACCESS_TOKEN);
      if (!result) return jsonResponse({ error: "Failed to sync from Facebook" }, 400);
      return jsonResponse(result);
    }

    // Batch fetch spend limits with caching — returns values in DOLLARS
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
          // Cache values are already in dollars
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

    // Single account refresh (force sync from Facebook)
    if (action === "refresh_balance") {
      const result = await syncAdAccountFromFacebook(adminClient, ad_account_id, FB_ACCESS_TOKEN);
      if (!result) return jsonResponse({ error: "Failed to sync from Facebook" }, 400);
      return jsonResponse(result);
    }

    if (action === "get_spend_limit") {
      const result = await syncAdAccountFromFacebook(adminClient, ad_account_id, FB_ACCESS_TOKEN);
      if (!result) return jsonResponse({ error: "Failed to sync from Facebook" }, 400);
      return jsonResponse({
        spend_cap: result.spend_limit,
        amount_spent: result.amount_spent,
      });
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

      // Sync from Facebook first to get current state
      const synced = await syncAdAccountFromFacebook(adminClient, ad_account_id, FB_ACCESS_TOKEN);
      const currentCap = synced ? synced.spend_limit : 0;
      const newCap = currentCap + amountToFb;

      console.log(`[FB API] wallet_to_account: amount=$${amount}, commission=$${commission}, amountToFb=$${amountToFb}, currentCap=$${currentCap}, newCap=$${newCap}`);

      // Send to Facebook in CENTS
      const newCapCents = dollarsToCents(newCap);
      console.log(`[FB API] Sending to Facebook: ${newCapCents} cents ($${newCap})`);
      const fbUpdateData = await fbUpdateSpendCap(ad_account_id, newCapCents, FB_ACCESS_TOKEN);
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

      return jsonResponse({
        success: true, commission, amount_sent: amountToFb,
        new_wallet_balance: Number(profile.wallet_balance) - amount,
      });
    }

    if (action === "account_to_wallet") {
      const targetUserId = user_id || user.id;
      const commissionRate = await getCommissionRate(adminClient, targetUserId);

      // Sync from Facebook first
      const synced = await syncAdAccountFromFacebook(adminClient, ad_account_id, FB_ACCESS_TOKEN);
      const currentCap = synced ? synced.spend_limit : 0;
      const amountSpent = synced ? synced.amount_spent : 0;
      const availableBalance = currentCap - amountSpent;

      console.log(`[FB API] account_to_wallet: amount=$${amount}, currentCap=$${currentCap}, amountSpent=$${amountSpent}, available=$${availableBalance}`);

      if (amount > availableBalance) {
        return jsonResponse({ error: `Insufficient account balance. Available: $${availableBalance.toFixed(2)}` }, 400);
      }

      const refund = amount / (1 - commissionRate / 100);
      const newCap = currentCap - amount;

      // Send to Facebook in CENTS
      const newCapCents = dollarsToCents(newCap);
      console.log(`[FB API] Sending to Facebook: ${newCapCents} cents ($${newCap})`);
      const fbUpdateData = await fbUpdateSpendCap(ad_account_id, newCapCents, FB_ACCESS_TOKEN);
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

      return jsonResponse({
        success: true, refund, amount_withdrawn: amount,
        new_wallet_balance: Number(profile!.wallet_balance) + refund,
      });
    }

    // Admin: set spend limit directly (value in dollars, convert to cents for FB)
    if (action === "set_spend_limit") {
      const amountDollars = amount || 0;
      const amountCents = dollarsToCents(amountDollars);
      console.log(`[FB API] set_spend_limit: $${amountDollars} -> ${amountCents} cents`);
      const fbUpdateData = await fbUpdateSpendCap(ad_account_id, amountCents, FB_ACCESS_TOKEN);
      if (fbUpdateData.error) return jsonResponse({ error: `Facebook API: ${fbUpdateData.error.message}` }, 400);

      await adminClient.from("ad_account_cache").upsert({
        account_id: ad_account_id, spend_cap: amountDollars, last_fetched_at: new Date().toISOString(),
      }, { onConflict: "account_id" });

      return jsonResponse({ success: true, spend_limit: amountDollars });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
