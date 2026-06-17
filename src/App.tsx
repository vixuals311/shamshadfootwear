import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SupabaseAuthProvider, useSupabaseAuthContext } from "@/context/SupabaseAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AuditProvider } from "@/context/AuditContext";
import { OfflineSyncProvider } from "@/context/OfflineSyncContext";
import { AutoPrintModalProvider } from "@/context/AutoPrintModalContext";
import { AppLayout } from "@/components/layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { DeviceLimitDialog } from "@/components/auth/DeviceLimitDialog";
import { PwaUpdatePrompt } from "@/components/layout/PwaUpdatePrompt";
import { InstallPrompt } from "@/components/layout/InstallPrompt";

// Lazy-loaded routes
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Clients = lazy(() => import("./pages/Clients"));
const Invoices = lazy(() => import("./pages/Invoices"));
const NewInvoice = lazy(() => import("./pages/NewInvoice"));
const Payments = lazy(() => import("./pages/Payments"));
const Recovery = lazy(() => import("./pages/Recovery"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const Returns = lazy(() => import("./pages/Returns"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const PriceCheck = lazy(() => import("./pages/PriceCheck"));
const Cheques = lazy(() => import("./pages/Cheques"));
const CityRecovery = lazy(() => import("./pages/CityRecovery"));
const BulkClients = lazy(() => import("./pages/BulkClients"));
const AddProduct = lazy(() => import("./pages/AddProduct"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

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
      <Route path="/portal" element={
        <Suspense fallback={<PageLoader />}>
          <ClientPortal />
        </Suspense>
      } />

      {/* Protected Routes with Layout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
        <Route path="/inventory" element={<Suspense fallback={<PageLoader />}><Inventory /></Suspense>} />
        <Route path="/add-product" element={<Suspense fallback={<PageLoader />}><AddProduct /></Suspense>} />
        <Route path="/clients" element={<Suspense fallback={<PageLoader />}><Clients /></Suspense>} />
        <Route path="/invoices" element={<Suspense fallback={<PageLoader />}><Invoices /></Suspense>} />
        <Route path="/invoices/new" element={<Suspense fallback={<PageLoader />}><NewInvoice /></Suspense>} />
        <Route path="/invoices/edit/:invoiceId" element={<Suspense fallback={<PageLoader />}><NewInvoice /></Suspense>} />
        <Route path="/payments" element={<Suspense fallback={<PageLoader />}><Payments /></Suspense>} />
        <Route path="/recovery" element={<Suspense fallback={<PageLoader />}><Recovery /></Suspense>} />
        <Route path="/city-recovery" element={<Suspense fallback={<PageLoader />}><CityRecovery /></Suspense>} />
        <Route path="/bulk-clients" element={<Suspense fallback={<PageLoader />}><BulkClients /></Suspense>} />
        <Route path="/returns" element={<Suspense fallback={<PageLoader />}><Returns /></Suspense>} />
        <Route path="/reports" element={<Suspense fallback={<PageLoader />}><Reports /></Suspense>} />
        <Route path="/price-check" element={<Suspense fallback={<PageLoader />}><PriceCheck /></Suspense>} />
        <Route path="/cheques" element={<Suspense fallback={<PageLoader />}><Cheques /></Suspense>} />
        <Route path="/settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
        <Route path="/users" element={<Suspense fallback={<PageLoader />}><UserManagement /></Suspense>} />
        <Route path="/audit-logs" element={<Suspense fallback={<PageLoader />}><AuditLogs /></Suspense>} />
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
            <ErrorBoundary>
              <Toaster />
              <Sonner />
              <PwaUpdatePrompt />
              <InstallPrompt />
              <BrowserRouter>
                <AutoPrintModalProvider>
                  <AppRoutes />
                </AutoPrintModalProvider>
              </BrowserRouter>
            </ErrorBoundary>
          </TooltipProvider>
        </OfflineSyncProvider>
      </AuditProvider>
    </SupabaseAuthProvider>
  </QueryClientProvider>
);

export default App;
