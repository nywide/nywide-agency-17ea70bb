import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";

const Login = lazy(() => import("./pages/Login.tsx"));
const Signup = lazy(() => import("./pages/Signup.tsx"));
const SignupCustom = lazy(() => import("./pages/SignupCustom.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/signup-custom" element={<SignupCustom />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/unsubscribe" element={<Unsubscribe />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <AppRoutes />
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
