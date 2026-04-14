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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    let syncedCount = 0;
    let errorCount = 0;
    let totalCount = 0;
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const { data: accounts, error: accError } = await adminClient
        .from("ad_accounts")
        .select("account_id, amount_spent, user_id, spend_limit")
        .eq("platform", "facebook")
        .range(offset, offset + limit - 1);

      if (accError) {
        console.error(`[Sync] Error fetching accounts at offset ${offset}:`, accError.message);
        break;
      }

      if (!accounts || accounts.length === 0) {
        break;
      }

      totalCount += accounts.length;

      for (const acc of accounts) {
        try {
          const res = await fetch(
            `${FB_API_BASE}/act_${acc.account_id}?fields=spend_cap,amount_spent&access_token=${FB_ACCESS_TOKEN}`
          );
          const fbData = await res.json();

          if (fbData.error) {
            console.warn(`[Sync] FB error for ${acc.account_id}:`, fbData.error.message);
            errorCount++;
            continue;
          }

          const newSpendLimit = fbData.spend_cap ? Number(fbData.spend_cap) / 100 : Number(acc.spend_limit);
          const newAmountSpent = fbData.amount_spent ? Number(fbData.amount_spent) / 100 : Number(acc.amount_spent);
          const oldAmountSpent = Number(acc.amount_spent || 0);

          // Update account
          await adminClient.from("ad_accounts").update({
            spend_limit: newSpendLimit,
            amount_spent: newAmountSpent,
            current_spend: newAmountSpent,
          }).eq("account_id", acc.account_id);

          // Update cache
          await adminClient.from("ad_account_cache").upsert({
            account_id: acc.account_id,
            spend_cap: newSpendLimit,
            amount_spent: newAmountSpent,
            last_fetched_at: new Date().toISOString(),
          }, { onConflict: "account_id" });

          // Log spend change
          if (Math.abs(newAmountSpent - oldAmountSpent) > 0.01) {
            await adminClient.from("ad_account_transactions").insert({
              ad_account_id: acc.account_id,
              user_id: acc.user_id || null,
              type: "spend",
              amount: newAmountSpent - oldAmountSpent,
              old_amount_spent: oldAmountSpent,
              new_amount_spent: newAmountSpent,
              old_spend_limit: Number(acc.spend_limit),
              new_spend_limit: newSpendLimit,
            });
          }

          syncedCount++;
        } catch (err) {
          console.warn(`[Sync] Error syncing ${acc.account_id}:`, err);
          errorCount++;
        }
      }

      offset += limit;
      hasMore = accounts.length === limit;
    }

    console.log(`[Sync] Complete: ${syncedCount} synced, ${errorCount} errors out of ${totalCount} accounts`);

    return new Response(JSON.stringify({ synced: syncedCount, errors: errorCount, total: totalCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Sync] Fatal error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
