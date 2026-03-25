import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell({ recipientType = "user" }: { recipientType?: "user" | "admin" }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) return;
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("recipient_type", recipientType)
      .order("created_at", { ascending: false })
      .limit(20);

    if (recipientType === "user") {
      query = query.eq("user_id", user.id);
    }

    const { data } = await query;
    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount((data as Notification[]).filter((n) => !n.is_read).length);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel(`notifications-${recipientType}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => fetchNotifications()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, recipientType]);

  const markAllRead = async () => {
    if (!user || notifications.length === 0) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from("notifications")
      .update({ is_read: true } as any)
      .in("id", unreadIds);
    fetchNotifications();
  };

  const markRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true } as any)
      .eq("id", id);
    fetchNotifications();
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-border z-50"
            style={{
              background: "rgba(15, 15, 15, 0.95)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div className="flex items-center justify-between p-3 border-b border-border">
              <span className="text-sm font-bold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No notifications yet.
              </div>
            ) : (
              <div>
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { if (!n.is_read) markRead(n.id); }}
                    className={`w-full text-left p-3 border-b border-border/50 hover:bg-secondary/50 transition-colors ${
                      !n.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <div className={!n.is_read ? "" : "ml-4"}>
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        {n.message && (
                          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
