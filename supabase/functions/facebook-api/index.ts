import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FB_API_BASE = "https://graph.facebook.com/v22.0";
const CENTS_PER_DOLLAR = 100;

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * CENTS_PER_DOLLAR);
}

function centsToDollars(cents: number): number {
  return cents / CENTS_PER_DOLLAR;
}

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

// Facebook returns cents — this function converts to dollars before returning
async function fbGet(adAccountId: string, fields: string, token: string) {
  const res = await fetch(`${FB_API_BASE}/act_${adAccountId}?fields=${fields}&access_token=${token}`);
  const data = await res.json();
  if (data.spend_cap !== undefined) {
    const rawCents = Number(data.spend_cap);
    data.spend_cap = centsToDollars(rawCents);
    console.log(`[FB API] fbGet: spend_cap raw=${rawCents} cents -> ${data.spend_cap} dollars`);
  }
  if (data.amount_spent !== undefined) {
    const rawCents = Number(data.amount_spent);
    data.amount_spent = centsToDollars(rawCents);
    console.log(`[FB API] fbGet: amount_spent raw=${rawCents} cents -> ${data.amount_spent} dollars`);
  }
  return data;
}

// Accepts DOLLARS, converts to cents, sends to Facebook
async function fbUpdateSpendCap(adAccountId: string, spendLimitDollars: number, token: string) {
  const spendLimitCents = dollarsToCents(spendLimitDollars);
  console.log(`[FB API] fbUpdateSpendCap: sending spend_cap=${spendLimitCents} cents (${spendLimitDollars} dollars) to act_${adAccountId}`);
  const res = await fetch(`${FB_API_BASE}/act_${adAccountId}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `spend_cap=${spendLimitCents}&access_token=${token}`,
  });
  return res.json();
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Normalize a value to dollars. If > 1000, assume it's cents.
function normalizeToDollars(value: number, label: string): number {
  if (value > 1000) {
    console.warn(`[FB API] ${label}: value ${value} > 1000, assuming cents, converting to dollars.`);
    return centsToDollars(value);
  }
  return value;
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

    // Batch fetch spend limits with caching — fbGet already returns dollars
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
          const fbData = await fbGet(id, "spend_cap,amount_spent", FB_ACCESS_TOKEN);
          if (fbData.error) return;
          // fbGet already returns dollars
          const entry = {
            spend_cap: fbData.spend_cap ?? 0,
            amount_spent: fbData.amount_spent ?? 0,
          };
          cacheMap[id] = { ...entry, cached: false };
          await adminClient.from("ad_account_cache").upsert({
            account_id: id, ...entry, last_fetched_at: new Date().toISOString(),
          }, { onConflict: "account_id" });
        } catch { /* skip failed accounts */ }
      });
      await Promise.all(fetchPromises);

      return jsonResponse({ results: cacheMap });
    }

    // Single account refresh (force) — fbGet returns dollars
    if (action === "refresh_balance") {
      const fbData = await fbGet(ad_account_id, "spend_cap,amount_spent", FB_ACCESS_TOKEN);
      if (fbData.error) return jsonResponse({ error: fbData.error.message }, 400);
      const entry = {
        spend_cap: fbData.spend_cap ?? 0,
        amount_spent: fbData.amount_spent ?? 0,
      };
      await adminClient.from("ad_account_cache").upsert({
        account_id: ad_account_id, ...entry, last_fetched_at: new Date().toISOString(),
      }, { onConflict: "account_id" });
      return jsonResponse(entry);
    }

    if (action === "get_spend_limit") {
      const fbData = await fbGet(ad_account_id, "spend_cap,amount_spent", FB_ACCESS_TOKEN);
      if (fbData.error) return jsonResponse({ error: fbData.error.message }, 400);
      return jsonResponse({
        spend_cap: fbData.spend_cap ?? null,
        amount_spent: fbData.amount_spent ?? 0,
      });
    }

    if (action === "wallet_to_account") {
      const targetUserId = user_id || user.id;
      const commissionRate = await getCommissionRate(adminClient, targetUserId);

      // Normalize amount to dollars
      let amountDollars = normalizeToDollars(Number(amount), "wallet_to_account amount");
      console.log(`[FB API] wallet_to_account: raw amount=${amount}, amountDollars=${amountDollars}`);

      // Validate wallet balance
      const { data: profile } = await adminClient
        .from("profiles").select("wallet_balance").eq("id", targetUserId).single();
      if (!profile || Number(profile.wallet_balance) < amountDollars) {
        return jsonResponse({ error: "Insufficient wallet balance" }, 400);
      }

      // Get current spend_limit from DB (dollars), normalize if needed
      const { data: adAccount } = await adminClient
        .from("ad_accounts").select("spend_limit").eq("account_id", ad_account_id).single();
      let currentCapDollars = normalizeToDollars(adAccount ? Number(adAccount.spend_limit) : 0, "wallet_to_account currentCap");

      const commission = amountDollars * (commissionRate / 100);
      const amountToFb = amountDollars - commission;
      const newCapDollars = currentCapDollars + amountToFb;

      console.log(`[FB API] wallet_to_account: currentCap=$${currentCapDollars}, newCap=$${newCapDollars}, cents=${dollarsToCents(newCapDollars)}`);

      // Send to Facebook — fbUpdateSpendCap accepts dollars
      const fbUpdateData = await fbUpdateSpendCap(ad_account_id, newCapDollars, FB_ACCESS_TOKEN);
      if (fbUpdateData.error) {
        console.error("[FB API] Facebook error:", fbUpdateData.error);
        return jsonResponse({ error: `Facebook API: ${fbUpdateData.error.message}` }, 400);
      }

      // Update database (all in dollars)
      await adminClient.from("profiles").update({
        wallet_balance: Number(profile.wallet_balance) - amountDollars,
      }).eq("id", targetUserId);

      await adminClient.from("ad_accounts").update({ spend_limit: newCapDollars }).eq("account_id", ad_account_id);

      await adminClient.from("ad_account_cache").upsert({
        account_id: ad_account_id, spend_cap: newCapDollars, last_fetched_at: new Date().toISOString(),
      }, { onConflict: "account_id" });

      await adminClient.from("transactions").insert({
        user_id: targetUserId, type: "wallet_to_account", amount: amountDollars, commission,
        ad_account_id, status: "completed", payment_method: "platform",
      });

      return jsonResponse({
        success: true, commission, amount_sent: amountToFb,
        new_wallet_balance: Number(profile.wallet_balance) - amountDollars,
        debug: {
          raw_amount: amount,
          amount_dollars: amountDollars,
          current_cap_dollars: currentCapDollars,
          new_cap_dollars: newCapDollars,
          new_cap_cents: dollarsToCents(newCapDollars),
          facebook_response: fbUpdateData,
        },
      });
    }

    if (action === "account_to_wallet") {
      let amountDollars = normalizeToDollars(Number(amount), "account_to_wallet amount");
      const targetUserId = user_id || user.id;
      const commissionRate = await getCommissionRate(adminClient, targetUserId);

      const { data: adAccount } = await adminClient
        .from("ad_accounts").select("spend_limit, current_spend").eq("account_id", ad_account_id).single();
      let currentCapDollars = normalizeToDollars(adAccount ? Number(adAccount.spend_limit) : 0, "account_to_wallet currentCap");
      const amountSpent = adAccount ? Number(adAccount.current_spend) : 0;
      const availableBalance = currentCapDollars - amountSpent;

      console.log(`[FB API] account_to_wallet: raw=${amount}, dollars=${amountDollars}, currentCap=$${currentCapDollars}, spent=$${amountSpent}, available=$${availableBalance}`);

      if (amountDollars > availableBalance) {
        return jsonResponse({ error: `Insufficient account balance. Available: $${availableBalance.toFixed(2)}` }, 400);
      }

      const refund = amountDollars / (1 - commissionRate / 100);
      const newCapDollars = currentCapDollars - amountDollars;

      // Send to Facebook — accepts dollars
      const fbUpdateData = await fbUpdateSpendCap(ad_account_id, newCapDollars, FB_ACCESS_TOKEN);
      if (fbUpdateData.error) return jsonResponse({ error: `Facebook API: ${fbUpdateData.error.message}` }, 400);

      const { data: profile } = await adminClient
        .from("profiles").select("wallet_balance").eq("id", targetUserId).single();
      await adminClient.from("profiles").update({
        wallet_balance: Number(profile!.wallet_balance) + refund,
      }).eq("id", targetUserId);

      await adminClient.from("ad_accounts").update({ spend_limit: newCapDollars }).eq("account_id", ad_account_id);

      await adminClient.from("ad_account_cache").upsert({
        account_id: ad_account_id, spend_cap: newCapDollars, amount_spent: amountSpent,
        last_fetched_at: new Date().toISOString(),
      }, { onConflict: "account_id" });

      await adminClient.from("transactions").insert({
        user_id: targetUserId, type: "account_to_wallet", amount: refund,
        commission: refund - amountDollars, ad_account_id, status: "completed", payment_method: "platform",
      });

      return jsonResponse({
        success: true, refund, amount_withdrawn: amountDollars,
        new_wallet_balance: Number(profile!.wallet_balance) + refund,
        debug: {
          raw_amount: amount,
          amount_dollars: amountDollars,
          current_cap_dollars: currentCapDollars,
          new_cap_dollars: newCapDollars,
          new_cap_cents: dollarsToCents(newCapDollars),
        },
      });
    }

    // Admin: set spend limit — amount is in DOLLARS
    if (action === "set_spend_limit") {
      const amountDollars = Number(amount) || 0;
      console.log(`[FB API] set_spend_limit: dollars=${amountDollars}, will send cents=${dollarsToCents(amountDollars)}`);

      // fbUpdateSpendCap accepts dollars and converts internally
      const fbUpdateData = await fbUpdateSpendCap(ad_account_id, amountDollars, FB_ACCESS_TOKEN);
      if (fbUpdateData.error) return jsonResponse({ error: `Facebook API: ${fbUpdateData.error.message}` }, 400);

      await adminClient.from("ad_account_cache").upsert({
        account_id: ad_account_id, spend_cap: amountDollars, last_fetched_at: new Date().toISOString(),
      }, { onConflict: "account_id" });

      return jsonResponse({ success: true, spend_limit: amountDollars });
    }

    // Sync action: fetch from Facebook and update DB
    if (action === "sync") {
      const fbData = await fbGet(ad_account_id, "spend_cap,amount_spent", FB_ACCESS_TOKEN);
      if (fbData.error) return jsonResponse({ error: fbData.error.message }, 400);

      const spendCapDollars = fbData.spend_cap ?? 0;
      const amountSpentDollars = fbData.amount_spent ?? 0;

      await adminClient.from("ad_accounts").update({
        spend_limit: spendCapDollars, amount_spent: amountSpentDollars,
      }).eq("account_id", ad_account_id);

      await adminClient.from("ad_account_cache").upsert({
        account_id: ad_account_id, spend_cap: spendCapDollars, amount_spent: amountSpentDollars,
        last_fetched_at: new Date().toISOString(),
      }, { onConflict: "account_id" });

      return jsonResponse({ spend_cap: spendCapDollars, amount_spent: amountSpentDollars });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
