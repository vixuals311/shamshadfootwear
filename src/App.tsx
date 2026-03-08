import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SupabaseAuthProvider, useSupabaseAuthContext } from "@/context/SupabaseAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AuditProvider } from "@/context/AuditContext";
import { OfflineSyncProvider } from "@/context/OfflineSyncContext";
import { AppLayout } from "@/components/layout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Clients from "./pages/Clients";
import Invoices from "./pages/Invoices";
import NewInvoice from "./pages/NewInvoice";
import Payments from "./pages/Payments";
import Recovery from "./pages/Recovery";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import AuditLogs from "./pages/AuditLogs";
import Returns from "./pages/Returns";
import ClientPortal from "./pages/ClientPortal";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { DeviceLimitDialog } from "@/components/auth/DeviceLimitDialog";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { 
    user, loading, sessionChecked, 
    deviceLimitReached, activeSessions, maxDevices,
    terminateSessionAndContinue, cancelDeviceLimit 
  } = useSupabaseAuthContext();

  if (loading || (user && !sessionChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (deviceLimitReached) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <DeviceLimitDialog
          open={true}
          sessions={activeSessions}
          maxDevices={maxDevices}
          onTerminateAndContinue={terminateSessionAndContinue}
          onCancel={cancelDeviceLimit}
        />
      </div>
    );
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useSupabaseAuthContext();
  const [landingPage, setLandingPage] = useState<string | null>(null);

  useEffect(() => {
    if (user && role) {
      supabase
        .from("application_settings")
        .select("setting_value")
        .eq("setting_key", "default_landing_pages")
        .maybeSingle()
        .then(({ data }) => {
          if (data?.setting_value) {
            const pages = data.setting_value as Record<string, string>;
            setLandingPage(pages[role] || "/");
          } else {
            setLandingPage("/");
          }
        });
    }
  }, [user, role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={landingPage || "/"} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route
        path="/login"
        element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        }
      />

      {/* Reset Password - public route */}
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Client Portal - separate from main app */}
      <Route path="/portal" element={<ClientPortal />} />

      {/* Protected Routes with Layout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/new" element={<NewInvoice />} />
        <Route path="/invoices/edit/:invoiceId" element={<NewInvoice />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/recovery" element={<Recovery />} />
        <Route path="/returns" element={<Returns />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SupabaseAuthProvider>
      <AuditProvider>
        <OfflineSyncProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </OfflineSyncProvider>
      </AuditProvider>
    </SupabaseAuthProvider>
  </QueryClientProvider>
);

export default App;
