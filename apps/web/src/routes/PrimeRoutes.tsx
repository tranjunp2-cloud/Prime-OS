import { Navigate, Route, useLocation } from "react-router-dom";
import Account from "@/pages/Account";
import Service from "@/pages/Service";
import { PrimeFinSupportPage } from "@/pages/prime/PrimeFinSupportPage";
import { PrimeMdecPage } from "@/pages/prime/PrimeMdecPage";
import { PrimeConsultingAgentPage } from "@/pages/prime/PrimeConsultingAgentPage";
import { PrimeProductOperationAgentPage } from "@/pages/prime/PrimeProductOperationAgentPage";
import { PrimeBrandAiPage } from "@/pages/prime/PrimeBrandAiPage";
import { PrimeCrmSourcesPage, PrimeTowerPage } from "@/pages/prime/PrimeTowerPage";
import { CommerceSurfacePage } from "@/pages/prime/CommerceSurfacePage";
import { PrimeGrowthOSPage } from "@/pages/prime/PrimeGrowthOSPage";
import { PrimeClientReportsPage } from "@/pages/prime/PrimeClientReportsPage";
import PrimeCrmOperatorDashboard from "@/pages/PrimeCrmOperatorDashboard";

const cosOverviewHref = "/overview?module=cos";
const cosCatalogHref = `${cosOverviewHref}&view=pim`;
const cosInventoryHref = `${cosOverviewHref}&view=pim`;
const cosOrdersHref = `${cosOverviewHref}&view=oms`;
const cosFulfillmentHref = `${cosOverviewHref}&view=ship`;
const cosChannelHref = `${cosOverviewHref}&view=pim`;

function LegacyCrmRedirect({ to, defaultSearch = "" }: { to: string; defaultSearch?: string }) {
  const { search } = useLocation();
  const params = new URLSearchParams(defaultSearch);
  const incomingParams = new URLSearchParams(search);

  incomingParams.forEach((value, key) => {
    params.set(key, value);
  });

  const nextSearch = params.toString();

  return <Navigate to={`${to}${nextSearch ? `?${nextSearch}` : ""}`} replace />;
}

export function PrimeRoutes() {
  return (
    <>
    <Route path="/overview" element={<PrimeGrowthOSPage />} />
    <Route path="/client-reports" element={<PrimeClientReportsPage />} />
    <Route path="/reports" element={<Navigate to="/client-reports" replace />} />
    <Route path="/account" element={<Account />} />
    
    <Route path="/crm" element={<Navigate to="/customer/service" replace />} />
    <Route path="/crm/hub" element={<Navigate to="/customer/service" replace />} />
    <Route path="/crm/chat" element={<Navigate to="/customer/service" replace />} />
    <Route path="/crm/operator" element={<PrimeCrmOperatorDashboard />} />
    <Route path="/crm/mdec" element={<PrimeMdecPage />} />
    <Route path="/crm/sources" element={<PrimeCrmSourcesPage />} />
    <Route path="/crm/campaigns" element={<PrimeTowerPage towerId="campaign-ops" />} />
    <Route path="/crm/content-social" element={<PrimeTowerPage towerId="content-creator-ops" />} />
    <Route path="/crm/leads-rfqs" element={<PrimeTowerPage towerId="lead-response-capture" />} />
    <Route path="/crm/re-engage" element={<PrimeTowerPage towerId="retargeting-outreach" />} />
    <Route path="/crm/campaign-ops" element={<LegacyCrmRedirect to="/crm/campaigns" />} />
    <Route path="/crm/content-creator-ops" element={<LegacyCrmRedirect to="/crm/content-social" defaultSearch="view=creator-proof" />} />
    <Route path="/crm/lead-response-capture" element={<LegacyCrmRedirect to="/crm/leads-rfqs" />} />
    <Route path="/crm/retargeting-outreach" element={<LegacyCrmRedirect to="/crm/re-engage" />} />
    <Route path="/crm/acquisition" element={<LegacyCrmRedirect to="/crm/sources" />} />
    <Route path="/crm/campaign" element={<LegacyCrmRedirect to="/crm/campaigns" />} />
    <Route path="/crm/lead-capture" element={<LegacyCrmRedirect to="/crm/leads-rfqs" />} />
    <Route path="/crm/retargeting" element={<LegacyCrmRedirect to="/crm/re-engage" />} />
    
    <Route path="/customer/crm-compact" element={<PrimeTowerPage towerId="crm-compact" />} />
    <Route path="/customer/service" element={<Service />} />
    
    <Route path="/finance" element={<Navigate to="/finance/fin-support" replace />} />
    <Route path="/finance/fin-support" element={<PrimeFinSupportPage />} />
    <Route path="/finance/health" element={<Navigate to="/finance/fin-support#status" replace />} />
    <Route path="/finance/capital-offers" element={<Navigate to="/finance/fin-support#lenders" replace />} />
    <Route path="/finance/risk-trust" element={<Navigate to="/finance/fin-support#blockers" replace />} />
    <Route path="/finance/capital-readiness" element={<Navigate to="/finance/fin-support#funding-application-flow" replace />} />
    <Route path="/finance/settlement-repayment" element={<Navigate to="/finance/fin-support#status" replace />} />
    <Route path="/finance/capital" element={<Navigate to="/finance/fin-support#lenders" replace />} />
    <Route path="/finance/lending" element={<Navigate to="/finance/fin-support#lenders" replace />} />
    <Route path="/finance/risk" element={<Navigate to="/finance/fin-support#blockers" replace />} />
    
    <Route path="/ecom/commerce-surface" element={<CommerceSurfacePage />} />
    <Route path="/ecom/cos/product-master/*" element={<Navigate to={cosCatalogHref} replace />} />
    <Route path="/ecom/cos/listings" element={<Navigate to={cosChannelHref} replace />} />
    <Route path="/ecom/cos/inventory-brain/*" element={<Navigate to={cosInventoryHref} replace />} />
    <Route path="/ecom/cos/warehouses/*" element={<Navigate to={cosInventoryHref} replace />} />
    <Route path="/ecom/cos/oms/*" element={<Navigate to={cosOrdersHref} replace />} />
    <Route path="/ecom/cos/fulfillment/*" element={<Navigate to={cosFulfillmentHref} replace />} />
    <Route path="/ecom/cos/returns/*" element={<Navigate to={cosFulfillmentHref} replace />} />
    <Route path="/ecom/cos/policy-rule/*" element={<Navigate to={cosFulfillmentHref} replace />} />
    <Route path="/ecom/cos/event-audit" element={<Navigate to={cosFulfillmentHref} replace />} />
    <Route path="/ecom/cos/*" element={<Navigate to={cosOverviewHref} replace />} />
    
    <Route path="/intelligence" element={<Navigate to="/intelligence/consulting-agent?tab=kpi" replace />} />
    <Route path="/intelligence/consulting-agent" element={<PrimeConsultingAgentPage />} />
    <Route path="/intelligence/product-operation-agent" element={<PrimeProductOperationAgentPage />} />
    <Route path="/intelligence/branding-agent" element={<PrimeBrandAiPage />} />
    <Route path="/intelligence/branding-agent/create" element={<PrimeBrandAiPage />} />
    <Route path="/intelligence/branding-agent/library" element={<PrimeBrandAiPage />} />
    <Route path="/intelligence/branding-agent/integrations" element={<PrimeBrandAiPage />} />
    <Route path="/intelligence/branding-agent/:brandId" element={<PrimeBrandAiPage />} />
    <Route path="/intelligence/branding-agent/:brandId/generating" element={<PrimeBrandAiPage />} />
    <Route path="/intelligence/branding-agent/:brandId/review" element={<PrimeBrandAiPage />} />
    <Route path="/intelligence/branding-agent/:brandId/share" element={<PrimeBrandAiPage />} />
    <Route path="/intelligence/brand-ai" element={<Navigate to="/intelligence/branding-agent" replace />} />
    <Route path="/intelligence/brand-ai/create" element={<Navigate to="/intelligence/branding-agent/create" replace />} />
    <Route path="/intelligence/brand-ai/library" element={<Navigate to="/intelligence/branding-agent/library" replace />} />
    <Route path="/intelligence/brand-ai/integrations" element={<Navigate to="/intelligence/branding-agent/integrations" replace />} />
    <Route path="/intelligence/brand-ai/:brandId" element={<PrimeBrandAiPage />} />
    <Route path="/intelligence/brand-ai/:brandId/generating" element={<PrimeBrandAiPage />} />
    <Route path="/intelligence/brand-ai/:brandId/review" element={<PrimeBrandAiPage />} />
    <Route path="/intelligence/brand-ai/:brandId/share" element={<PrimeBrandAiPage />} />
    <Route path="/intelligence/decision-hub" element={<Navigate to="/intelligence/consulting-agent?tab=kpi" replace />} />
    <Route path="/intelligence/signals" element={<Navigate to="/intelligence/consulting-agent?tab=signals" replace />} />
    <Route path="/intelligence/analytics" element={<Navigate to="/intelligence/consulting-agent?tab=kpi&capability=analytics" replace />} />
    <Route path="/intelligence/ai-operator" element={<Navigate to="/intelligence/consulting-agent?tab=kpi&view=operator" replace />} />
    <Route path="/intelligence/alerts" element={<Navigate to="/intelligence/consulting-agent?tab=signals&view=alerts" replace />} />
    <Route path="/intelligence/attribution" element={<Navigate to="/intelligence/consulting-agent?tab=signals&capability=attribution" replace />} />
    <Route path="/intelligence/forecasting" element={<Navigate to="/intelligence/consulting-agent?tab=signals&capability=forecasting" replace />} />
    <Route path="/intelligence/voc" element={<Navigate to="/intelligence/consulting-agent?tab=signals&capability=voc" replace />} />
    <Route path="/intelligence/creators" element={<Navigate to="/intelligence/consulting-agent?tab=signals&view=creators" replace />} />
    <Route path="/intelligence/trends" element={<Navigate to="/intelligence/consulting-agent?tab=signals&view=customer-trends" replace />} />
    <Route path="/intelligence/customers" element={<Navigate to="/intelligence/consulting-agent?tab=signals&view=customer-trends" replace />} />
    <Route path="/intelligence/launch-decisions" element={<Navigate to="/intelligence/consulting-agent?tab=launch" replace />} />
    <Route path="/intelligence/campaigns" element={<Navigate to="/intelligence/consulting-agent?tab=launch" replace />} />
    
    <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
    <Route path="/products/*" element={<Navigate to={cosCatalogHref} replace />} />
    <Route path="/inventory/*" element={<Navigate to={cosInventoryHref} replace />} />
    <Route path="/orders/*" element={<Navigate to={cosOrdersHref} replace />} />
    <Route path="/fulfillment/*" element={<Navigate to={cosFulfillmentHref} replace />} />
    <Route path="/returns/*" element={<Navigate to={cosFulfillmentHref} replace />} />
    <Route path="/sla-policies" element={<Navigate to={cosFulfillmentHref} replace />} />
    <Route path="/routing-plans" element={<Navigate to={cosFulfillmentHref} replace />} />
    </>
  );
}
