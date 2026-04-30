import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n/I18nContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import ProductCreatePage from "./pages/ProductCreatePage";
import Listings from "./pages/Listings";
import Inventory from "./pages/Inventory";
import Warehouses from "./pages/Warehouses";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Fulfillment from "./pages/Fulfillment";
import FulfillmentJobDetail from "./pages/FulfillmentJobDetail";
import Returns from "./pages/Returns";
import ReturnDetail from "./pages/ReturnDetail";
import SlaPolicies from "./pages/SlaPolicies";
import RoutingPlans from "./pages/RoutingPlans";
import UIRegressionReview from "./pages/UIRegressionReview";
import { AppLayout } from "./components/layout/AppLayout";
import { LegacyEntityRedirect, LegacyPathRedirect } from "./components/routing/LegacyEntityRedirect";
import { PrimeOverview } from "./pages/prime/PrimeOverview";
import { PrimeDemandHubPage, PrimeDemandSourcesPage, PrimeTowerPage } from "./pages/prime/PrimeTowerPage";
import { CommerceSurfacePage } from "./pages/prime/CommerceSurfacePage";
import { CosPolicyRulePage } from "./pages/prime/CosPolicyRulePage";
import { CosEventAuditPage } from "./pages/prime/CosEventAuditPage";

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
              <Sonner />
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
                    <Route path="/overview" element={<PrimeOverview />} />

                    <Route path="/demand" element={<PrimeDemandHubPage />} />
                    <Route path="/demand/hub" element={<PrimeDemandHubPage />} />
                    <Route path="/demand/sources" element={<PrimeDemandSourcesPage />} />
                    <Route path="/demand/campaigns" element={<PrimeTowerPage towerId="campaign-ops" />} />
                    <Route path="/demand/content-social" element={<PrimeTowerPage towerId="content-creator-ops" />} />
                    <Route path="/demand/leads-rfqs" element={<PrimeTowerPage towerId="lead-response-capture" />} />
                    <Route path="/demand/re-engage" element={<PrimeTowerPage towerId="retargeting-outreach" />} />
                    <Route path="/demand/campaign-ops" element={<Navigate to="/demand/campaigns" replace />} />
                    <Route path="/demand/content-creator-ops" element={<Navigate to="/demand/content-social?view=creator-proof" replace />} />
                    <Route path="/demand/lead-response-capture" element={<Navigate to="/demand/leads-rfqs" replace />} />
                    <Route path="/demand/retargeting-outreach" element={<Navigate to="/demand/re-engage" replace />} />
                    <Route path="/demand/acquisition" element={<Navigate to="/demand/sources" replace />} />
                    <Route path="/demand/campaign" element={<Navigate to="/demand/campaigns" replace />} />
                    <Route path="/demand/lead-capture" element={<Navigate to="/demand/leads-rfqs" replace />} />
                    <Route path="/demand/retargeting" element={<Navigate to="/demand/re-engage" replace />} />

                    <Route path="/customer/crm-compact" element={<PrimeTowerPage towerId="crm-compact" />} />
                    <Route path="/customer/service" element={<PrimeTowerPage towerId="service" />} />

                    <Route path="/finance/health" element={<PrimeTowerPage towerId="settlement" />} />
                    <Route path="/finance/capital-offers" element={<PrimeTowerPage towerId="offers" />} />
                    <Route path="/finance/risk-trust" element={<PrimeTowerPage towerId="risk" />} />
                    <Route path="/finance/capital-readiness" element={<Navigate to="/finance/capital-offers" replace />} />
                    <Route path="/finance/settlement-repayment" element={<Navigate to="/finance/health" replace />} />
                    <Route path="/finance/capital" element={<Navigate to="/finance/capital-offers" replace />} />
                    <Route path="/finance/lending" element={<Navigate to="/finance/capital-offers" replace />} />
                    <Route path="/finance/risk" element={<Navigate to="/finance/risk-trust" replace />} />

                    <Route path="/ecom/commerce-surface" element={<CommerceSurfacePage />} />
                    <Route path="/ecom/cos/product-master" element={<Products />} />
                    <Route path="/ecom/cos/product-master/new" element={<ProductCreatePage />} />
                    <Route path="/ecom/cos/product-master/:id/edit" element={<ProductCreatePage />} />
                    <Route path="/ecom/cos/product-master/:id" element={<ProductDetail />} />
                    <Route path="/ecom/cos/listings" element={<Listings />} />
                    <Route path="/ecom/cos/inventory-brain" element={<Inventory />} />
                    <Route path="/ecom/cos/warehouses" element={<Warehouses />} />
                    <Route path="/ecom/cos/oms" element={<Orders />} />
                    <Route path="/ecom/cos/oms/:id" element={<OrderDetail />} />
                    <Route path="/ecom/cos/fulfillment" element={<Fulfillment />} />
                    <Route path="/ecom/cos/fulfillment/jobs/:id" element={<FulfillmentJobDetail />} />
                    <Route path="/ecom/cos/returns" element={<Returns />} />
                    <Route path="/ecom/cos/returns/:id" element={<ReturnDetail />} />
                    <Route path="/ecom/cos/policy-rule" element={<CosPolicyRulePage />} />
                    <Route path="/ecom/cos/policy-rule/sla" element={<SlaPolicies />} />
                    <Route path="/ecom/cos/policy-rule/routing" element={<RoutingPlans />} />
                    <Route path="/ecom/cos/event-audit" element={<CosEventAuditPage />} />

                    <Route path="/intelligence" element={<PrimeTowerPage towerId="decision-hub" />} />
                    <Route path="/intelligence/decision-hub" element={<PrimeTowerPage towerId="decision-hub" />} />
                    <Route path="/intelligence/signals" element={<PrimeTowerPage towerId="signals" />} />
                    <Route path="/intelligence/analytics" element={<Navigate to="/intelligence/decision-hub?capability=analytics" replace />} />
                    <Route path="/intelligence/ai-operator" element={<Navigate to="/intelligence/decision-hub?view=operator" replace />} />
                    <Route path="/intelligence/alerts" element={<Navigate to="/intelligence/decision-hub?view=alerts" replace />} />
                    <Route path="/intelligence/attribution" element={<Navigate to="/intelligence/signals?capability=attribution" replace />} />
                    <Route path="/intelligence/forecasting" element={<Navigate to="/intelligence/signals?capability=forecasting" replace />} />
                    <Route path="/intelligence/voc" element={<Navigate to="/intelligence/signals?capability=voc" replace />} />
                    <Route path="/intelligence/creators" element={<Navigate to="/intelligence/signals?view=creators" replace />} />
                    <Route path="/intelligence/trends" element={<Navigate to="/intelligence/signals?view=customer-trends" replace />} />
                    <Route path="/intelligence/customers" element={<Navigate to="/intelligence/signals?view=customer-trends" replace />} />
                    <Route path="/intelligence/launch-decisions" element={<PrimeTowerPage towerId="campaigns" />} />
                    <Route path="/intelligence/campaigns" element={<Navigate to="/intelligence/launch-decisions" replace />} />

                    <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
                    <Route path="/products" element={<Navigate to="/ecom/cos/product-master" replace />} />
                    <Route path="/products/new" element={<LegacyPathRedirect to="/ecom/cos/product-master/new" />} />
                    <Route path="/products/:id/edit" element={<LegacyPathRedirect to="/ecom/cos/product-master/:id/edit" />} />
                    <Route path="/products/:id/variants/:sku" element={<LegacyPathRedirect to="/ecom/cos/product-master/:id?variant=:sku" />} />
                    <Route path="/products/:id" element={<LegacyEntityRedirect basePath="/ecom/cos/product-master" />} />
                    <Route path="/inventory" element={<Navigate to="/ecom/cos/inventory-brain" replace />} />
                    <Route path="/orders" element={<Navigate to="/ecom/cos/oms" replace />} />
                    <Route path="/orders/:id" element={<LegacyEntityRedirect basePath="/ecom/cos/oms" />} />
                    <Route path="/fulfillment" element={<Navigate to="/ecom/cos/fulfillment" replace />} />
                    <Route path="/fulfillment/jobs/:id" element={<LegacyEntityRedirect basePath="/ecom/cos/fulfillment/jobs" />} />
                    <Route path="/returns" element={<Navigate to="/ecom/cos/returns" replace />} />
                    <Route path="/returns/:id" element={<LegacyEntityRedirect basePath="/ecom/cos/returns" />} />
                    <Route path="/sla-policies" element={<Navigate to="/ecom/cos/policy-rule/sla" replace />} />
                    <Route path="/routing-plans" element={<Navigate to="/ecom/cos/policy-rule/routing" replace />} />
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
