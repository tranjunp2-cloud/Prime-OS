import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n/I18nContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import UIRegressionReview from "./pages/UIRegressionReview";
import Auth from "./pages/Auth";
import { AppLayout } from "./components/layout/AppLayout";
import { PrimeRoutes } from "./routes/PrimeRoutes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm font-medium text-muted-foreground">
        Loading PrimeOS...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="prime-os-genesis-theme">
        <I18nProvider>
          <AuthProvider>
            <TooltipProvider>
              <Sonner position="bottom-right" offset={{ right: 16, bottom: 16 }} mobileOffset={{ right: 12, bottom: 96 }} />
              <BrowserRouter>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<Navigate to="/overview" replace />} />
                  <Route path="/__ui-regression" element={<UIRegressionReview />} />
                  <Route
                    element={
                      <RequireAuth>
                        <AppLayout />
                      </RequireAuth>
                    }
                  >
                    {PrimeRoutes()}
                  </Route>
                  <Route path="*" element={<Navigate to="/overview" replace />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
