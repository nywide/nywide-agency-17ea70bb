import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { User, Session } from "@supabase/supabase-js";

type UserRole = "user" | "admin";

type UserProfile = {
  full_name: string | null;
  wallet_balance: number;
  email?: string | null;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  role: "user",
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>(() => (localStorage.getItem("nywide_role") as UserRole) || "user");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  const clearAuthState = useCallback(() => {
    if (!mountedRef.current) return;
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole("user");
    localStorage.removeItem("nywide_role");
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    console.log("[Auth] Fetching profile and role for:", userId);

    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("full_name, wallet_balance, email").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    if (profileRes.error) {
      throw profileRes.error;
    }

    if (roleRes.error) {
      throw roleRes.error;
    }

    if (!mountedRef.current) return;

    setProfile((profileRes.data as UserProfile | null) ?? null);

    const isAdmin = roleRes.data?.some((entry) => entry.role === "admin") ?? false;
    const nextRole: UserRole = isAdmin ? "admin" : "user";

    setRole(nextRole);
    localStorage.setItem("nywide_role", nextRole);
  }, []);

  const applySession = useCallback(async (nextSession: Session | null, source: string) => {
    console.log(`[Auth] Applying session from ${source}:`, Boolean(nextSession));

    if (!mountedRef.current) return;

    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      setProfile(null);
      setRole("user");
      localStorage.removeItem("nywide_role");
      return;
    }

    await fetchProfile(nextSession.user.id);
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;

    try {
      await fetchProfile(user.id);
    } catch (err) {
      console.error("[Auth] Failed to refresh profile:", err);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    mountedRef.current = true;
    let resolved = false;

    const finishLoading = () => {
      if (!mountedRef.current) return;
      resolved = true;
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      console.log("[Auth] onAuthStateChange event:", event);

      setTimeout(() => {
        void (async () => {
          try {
            await applySession(nextSession, `auth:${event}`);
          } catch (err) {
            console.error("[Auth] Auth state change handling failed:", err);
            clearAuthState();
          } finally {
            finishLoading();
          }
        })();
      }, 0);
    });

    void (async () => {
      try {
        console.log("[Auth] Restoring session on app load...");
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        await applySession(data.session, "getSession");
      } catch (err) {
        console.error("[Auth] Session restore failed:", err);
        clearAuthState();
      } finally {
        finishLoading();
      }
    })();

    const timeout = setTimeout(() => {
      if (!resolved && mountedRef.current) {
        console.warn("[Auth] Session restore timed out, stopping loader.");
        setLoading(false);
      }
    }, 5000);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [applySession, clearAuthState]);

  const signOut = useCallback(async () => {
    console.log("[Auth] Signing out...");

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (err) {
      console.error("[Auth] Sign out error:", err);
    } finally {
      clearAuthState();
      setLoading(false);
      navigate("/login", { replace: true });
    }
  }, [clearAuthState, navigate]);

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
