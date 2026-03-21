import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FB_API_BASE = "https://graph.facebook.com/v22.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const FB_ACCESS_TOKEN = Deno.env.get("FB_ACCESS_TOKEN");
  if (!FB_ACCESS_TOKEN) {
    return new Response(JSON.stringify({ error: "FB_ACCESS_TOKEN not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { action, ad_account_id, amount, user_id } = body;

    if (action === "get_spend_limit") {
      // Fetch current spend limit from Facebook
      const fbRes = await fetch(
        `${FB_API_BASE}/act_${ad_account_id}?fields=spend_cap,amount_spent&access_token=${FB_ACCESS_TOKEN}`
      );
      const fbData = await fbRes.json();
      if (fbData.error) {
        return new Response(JSON.stringify({ error: fbData.error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({
        spend_cap: fbData.spend_cap ? Number(fbData.spend_cap) / 100 : null,
        amount_spent: fbData.amount_spent ? Number(fbData.amount_spent) / 100 : 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "wallet_to_account") {
      // Transfer from wallet to ad account
      const targetUserId = user_id || user.id;

      // Get user's commission rate
      const { data: overrideData } = await adminClient
        .from("user_commission_overrides").select("rate").eq("user_id", targetUserId).maybeSingle();
      let commissionRate = 6;
      if (overrideData) {
        commissionRate = overrideData.rate;
      } else {
        const { data: settingsData } = await adminClient
          .from("commission_settings").select("rate").limit(1).single();
        if (settingsData) commissionRate = settingsData.rate;
      }

      // Get user's wallet balance
      const { data: profile } = await adminClient
        .from("profiles").select("wallet_balance").eq("id", targetUserId).single();
      if (!profile || Number(profile.wallet_balance) < amount) {
        return new Response(JSON.stringify({ error: "Insufficient wallet balance" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const commission = amount * (commissionRate / 100);
      const amountToFb = amount - commission;

      // Get current FB spend cap
      const fbGetRes = await fetch(
        `${FB_API_BASE}/act_${ad_account_id}?fields=spend_cap&access_token=${FB_ACCESS_TOKEN}`
      );
      const fbGetData = await fbGetRes.json();
      if (fbGetData.error) {
        return new Response(JSON.stringify({ error: `Facebook API: ${fbGetData.error.message}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const currentCap = fbGetData.spend_cap ? Number(fbGetData.spend_cap) : 0;
      // FB uses cents
      const newCap = currentCap + Math.round(amountToFb * 100);

      // Update FB spend limit
      const fbUpdateRes = await fetch(
        `${FB_API_BASE}/act_${ad_account_id}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `spend_cap=${newCap}&access_token=${FB_ACCESS_TOKEN}`,
        }
      );
      const fbUpdateData = await fbUpdateRes.json();
      if (fbUpdateData.error) {
        return new Response(JSON.stringify({ error: `Facebook API: ${fbUpdateData.error.message}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Deduct from wallet
      await adminClient.from("profiles").update({
        wallet_balance: Number(profile.wallet_balance) - amount,
      }).eq("id", targetUserId);

      // Update local ad_accounts spend_limit
      await adminClient.from("ad_accounts").update({
        spend_limit: newCap / 100,
      }).eq("account_id", ad_account_id);

      // Create transaction
      await adminClient.from("transactions").insert({
        user_id: targetUserId,
        type: "wallet_to_account",
        amount,
        commission,
        ad_account_id,
        status: "completed",
        payment_method: "platform",
      });

      return new Response(JSON.stringify({
        success: true, commission, amount_sent: amountToFb,
        new_wallet_balance: Number(profile.wallet_balance) - amount,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "account_to_wallet") {
      // Withdraw from ad account to wallet
      const targetUserId = user_id || user.id;

      // Get commission rate
      const { data: overrideData } = await adminClient
        .from("user_commission_overrides").select("rate").eq("user_id", targetUserId).maybeSingle();
      let commissionRate = 6;
      if (overrideData) {
        commissionRate = overrideData.rate;
      } else {
        const { data: settingsData } = await adminClient
          .from("commission_settings").select("rate").limit(1).single();
        if (settingsData) commissionRate = settingsData.rate;
      }

      // Get current FB spend cap
      const fbGetRes = await fetch(
        `${FB_API_BASE}/act_${ad_account_id}?fields=spend_cap,amount_spent&access_token=${FB_ACCESS_TOKEN}`
      );
      const fbGetData = await fbGetRes.json();
      if (fbGetData.error) {
        return new Response(JSON.stringify({ error: `Facebook API: ${fbGetData.error.message}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const currentCap = fbGetData.spend_cap ? Number(fbGetData.spend_cap) : 0;
      const amountSpent = fbGetData.amount_spent ? Number(fbGetData.amount_spent) : 0;
      const availableBalance = (currentCap - amountSpent) / 100;

      if (amount > availableBalance) {
        return new Response(JSON.stringify({ error: `Insufficient account balance. Available: $${availableBalance.toFixed(2)}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate refund (reverse commission)
      const refund = amount / (1 - commissionRate / 100);
      const newCap = currentCap - Math.round(amount * 100);

      // Update FB spend limit
      const fbUpdateRes = await fetch(
        `${FB_API_BASE}/act_${ad_account_id}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `spend_cap=${newCap}&access_token=${FB_ACCESS_TOKEN}`,
        }
      );
      const fbUpdateData = await fbUpdateRes.json();
      if (fbUpdateData.error) {
        return new Response(JSON.stringify({ error: `Facebook API: ${fbUpdateData.error.message}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add refund to wallet
      const { data: profile } = await adminClient
        .from("profiles").select("wallet_balance").eq("id", targetUserId).single();
      await adminClient.from("profiles").update({
        wallet_balance: Number(profile!.wallet_balance) + refund,
      }).eq("id", targetUserId);

      // Update local ad_accounts
      await adminClient.from("ad_accounts").update({
        spend_limit: newCap / 100,
      }).eq("account_id", ad_account_id);

      // Create transaction
      await adminClient.from("transactions").insert({
        user_id: targetUserId,
        type: "account_to_wallet",
        amount: refund,
        commission: refund - amount,
        ad_account_id,
        status: "completed",
        payment_method: "platform",
      });

      return new Response(JSON.stringify({
        success: true, refund, amount_withdrawn: amount,
        new_wallet_balance: Number(profile!.wallet_balance) + refund,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
