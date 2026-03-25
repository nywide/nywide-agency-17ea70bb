import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "user";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, role, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (profile?.is_disabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Account Disabled</h1>
          <p className="text-muted-foreground">
            Your account has been disabled. Please contact support for more information.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/"><Button variant="outline" className="rounded-full">Back to Home</Button></Link>
            <Button variant="destructive" className="rounded-full" onClick={signOut}>Sign Out</Button>
          </div>
        </div>
      </div>
    );
  }

  if (requiredRole === "admin" && role !== "admin") return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
