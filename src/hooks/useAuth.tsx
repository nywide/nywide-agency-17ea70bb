import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { User, Session } from "@supabase/supabase-js";

type UserRole = "user" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: { full_name: string; wallet_balance: number; email?: string } | null;
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
  const [profile, setProfile] = useState<{ full_name: string; wallet_balance: number; email?: string } | null>(null);
  const [role, setRole] = useState<UserRole>("user");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const initializedRef = useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("full_name, wallet_balance, email").eq("id", userId).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (roleRes.data && roleRes.data.length > 0) {
        const isAdmin = roleRes.data.some((r: any) => r.role === "admin");
        setRole(isAdmin ? "admin" : "user");
      } else {
        setRole("user");
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setRole("user");
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
          setRole("user");
        }
        setLoading(false);
      }
    );

    // Then get the initial session as a fallback safety net
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      // Only handle if onAuthStateChange hasn't already resolved
      if (initializedRef.current) return;
      initializedRef.current = true;
      
      if (!initSession) {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
      // If session exists, onAuthStateChange INITIAL_SESSION will handle it
    }).catch(() => {
      setLoading(false);
    });

    // Safety timeout: if loading hasn't resolved in 5 seconds, force it
    const timeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) console.warn("Auth loading timeout - forcing resolution");
        return false;
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [fetchProfile]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole("user");
    navigate("/login", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
