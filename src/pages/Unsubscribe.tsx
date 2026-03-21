import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "valid" | "already_unsubscribed" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: anonKey } }
        );
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
        } else if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already_unsubscribed");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("error");
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) {
        setStatus("error");
      } else if (data?.success) {
        setStatus("success");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already_unsubscribed");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
        <h1 className="text-2xl font-bold text-primary mb-2">NYWIDE</h1>

        {status === "loading" && (
          <p className="text-muted-foreground mt-6">Validating your request…</p>
        )}

        {status === "valid" && (
          <div className="mt-6 space-y-4">
            <p className="text-foreground">
              Are you sure you want to unsubscribe from our emails?
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {submitting ? "Processing…" : "Confirm Unsubscribe"}
            </button>
          </div>
        )}

        {status === "success" && (
          <div className="mt-6">
            <p className="text-green-500 font-semibold text-lg">You've been unsubscribed.</p>
            <p className="text-muted-foreground mt-2 text-sm">
              You will no longer receive emails from us.
            </p>
          </div>
        )}

        {status === "already_unsubscribed" && (
          <div className="mt-6">
            <p className="text-muted-foreground">You're already unsubscribed.</p>
          </div>
        )}

        {status === "invalid" && (
          <div className="mt-6">
            <p className="text-destructive">Invalid or expired unsubscribe link.</p>
          </div>
        )}

        {status === "error" && (
          <div className="mt-6">
            <p className="text-destructive">Something went wrong. Please try again later.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
