import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n/I18nContext";
import { AuthProvider } from "@/contexts/AuthContext";
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
import { PrimeOverview } from "./pages/prime/PrimeOverview";
import { PrimeTowerPage } from "./pages/prime/PrimeTowerPage";
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

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="sme-ech-theme">
        <I18nProvider>
          <AuthProvider>
            <TooltipProvider>
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Navigate to="/overview" replace />} />
                  <Route path="/__ui-regression" element={<UIRegressionReview />} />
                  <Route element={<AppLayout />}>
                    <Route path="/overview" element={<PrimeOverview />} />

                    <Route path="/demand/campaign-ops" element={<PrimeTowerPage towerId="campaign-ops" />} />
                    <Route path="/demand/content-creator-ops" element={<PrimeTowerPage towerId="content-creator-ops" />} />
                    <Route path="/demand/lead-response-capture" element={<PrimeTowerPage towerId="lead-response-capture" />} />
                    <Route path="/demand/retargeting-outreach" element={<PrimeTowerPage towerId="retargeting-outreach" />} />
                    <Route path="/demand/acquisition" element={<Navigate to="/demand/campaign-ops" replace />} />
                    <Route path="/demand/campaign" element={<Navigate to="/demand/campaign-ops" replace />} />
                    <Route path="/demand/content-social" element={<Navigate to="/demand/content-creator-ops" replace />} />
                    <Route path="/demand/lead-capture" element={<Navigate to="/demand/lead-response-capture" replace />} />
                    <Route path="/demand/retargeting" element={<Navigate to="/demand/retargeting-outreach" replace />} />

                    <Route path="/customer/crm-compact" element={<PrimeTowerPage towerId="crm-compact" />} />
                    <Route path="/customer/service" element={<PrimeTowerPage towerId="service" />} />

                    <Route path="/finance/capital-readiness" element={<PrimeTowerPage towerId="capital" />} />
                    <Route path="/finance/capital-offers" element={<PrimeTowerPage towerId="offers" />} />
                    <Route path="/finance/risk-trust" element={<PrimeTowerPage towerId="risk" />} />
                    <Route path="/finance/settlement-repayment" element={<PrimeTowerPage towerId="settlement" />} />
                    <Route path="/finance/capital" element={<Navigate to="/finance/capital-readiness" replace />} />
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

                    <Route path="/intelligence/analytics" element={<PrimeTowerPage towerId="analytics" />} />
                    <Route path="/intelligence/attribution" element={<PrimeTowerPage towerId="attribution" />} />
                    <Route path="/intelligence/forecasting" element={<PrimeTowerPage towerId="forecasting" />} />
                    <Route path="/intelligence/ai-operator" element={<PrimeTowerPage towerId="ai-operator" />} />
                    <Route path="/intelligence/voc" element={<PrimeTowerPage towerId="voc" />} />
                    <Route path="/intelligence/alerts" element={<PrimeTowerPage towerId="alerts" />} />
                    <Route path="/intelligence/creators" element={<PrimeTowerPage towerId="creators" />} />
                    <Route path="/intelligence/trends" element={<PrimeTowerPage towerId="customers" />} />
                    <Route path="/intelligence/customers" element={<Navigate to="/intelligence/trends" replace />} />
                    <Route path="/intelligence/launch-decisions" element={<PrimeTowerPage towerId="campaigns" />} />
                    <Route path="/intelligence/campaigns" element={<Navigate to="/intelligence/launch-decisions" replace />} />

                    <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
                    <Route path="/products" element={<Navigate to="/ecom/cos/product-master" replace />} />
                    <Route path="/inventory" element={<Navigate to="/ecom/cos/inventory-brain" replace />} />
                    <Route path="/orders" element={<Navigate to="/ecom/cos/oms" replace />} />
                    <Route path="/fulfillment" element={<Navigate to="/ecom/cos/fulfillment" replace />} />
                    <Route path="/returns" element={<Navigate to="/ecom/cos/returns" replace />} />
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
