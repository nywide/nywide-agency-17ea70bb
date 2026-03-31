import { supabase } from "@/integrations/supabase/client";

/**
 * Create a notification and optionally send Telegram alert.
 */
export async function createNotification({
  userId,
  recipientType,
  title,
  message,
  type,
}: {
  userId?: string | null;
  recipientType: "user" | "admin";
  title: string;
  message: string;
  type: string;
}) {
  // Insert notification
  const { error } = await supabase.from("notifications").insert({
    user_id: userId || null,
    title,
    message,
    type,
    recipient_type: recipientType,
  } as any);

  if (error) {
    console.error("[Notification] Insert error:", error.message);
    return;
  }

  // Check Telegram settings and send if enabled
  try {
    if (recipientType === "user" && userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("notification_settings")
        .eq("id", userId)
        .single();

      const settings = profile?.notification_settings as any;
      if (settings?.telegram && settings?.telegram_chat_id) {
        const typeKey = `notify_${type}`;
        if (settings[typeKey] !== false) {
          await supabase.functions.invoke("send-telegram-notification", {
            body: {
              chat_id: settings.telegram_chat_id,
              message: `🔔 <b>${title}</b>\n${message}`,
            },
          });
          console.log("[Notification] Telegram sent to user:", userId);
        }
      }
    } else if (recipientType === "admin") {
      const { data: adminSettings } = await supabase
        .from("admin_settings")
        .select("notification_settings")
        .limit(1)
        .single();

      const settings = adminSettings?.notification_settings as any;
      console.log("[createNotification] Admin settings fetched:", { type, settings });

      if (settings?.telegram && settings?.telegram_chat_id) {
        // Map notification type to admin settings key
        let eventKey: string | null = null;
        switch (type) {
          case "new_user": eventKey = "notify_new_user"; break;
          case "new_account_request": eventKey = "notify_new_account_request"; break;
          case "new_topup_request": eventKey = "notify_new_topup_request"; break;
          case "low_balance": eventKey = "notify_low_balance"; break;
          case "account_disabled": eventKey = "notify_account_disabled"; break;
          default: eventKey = `notify_${type}`; break;
        }

        const shouldSend = !eventKey || settings[eventKey] !== false;
        console.log("[createNotification] Admin Telegram check:", { type, eventKey, shouldSend, chatId: settings.telegram_chat_id });

        if (shouldSend) {
          const { error: tgError } = await supabase.functions.invoke("send-telegram-notification", {
            body: {
              chat_id: settings.telegram_chat_id,
              message: `🛡️ <b>[Admin] ${title}</b>\n${message}`,
            },
          });
          if (tgError) console.error("[Notification] Admin Telegram error:", tgError);
          else console.log("[Notification] Telegram sent to admin");
        }
      } else {
        console.log("[createNotification] Admin Telegram not configured:", { telegram: settings?.telegram, chatId: settings?.telegram_chat_id });
      }
    }
  } catch (err) {
    console.error("[Notification] Telegram send error:", err);
  }
}
