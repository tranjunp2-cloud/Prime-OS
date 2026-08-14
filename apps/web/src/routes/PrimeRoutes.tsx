import { Navigate, Route, useLocation } from "react-router-dom";
import Account from "@/pages/Account";
import Service from "@/pages/Service";
import { PrimeFinSupportPage } from "@/pages/prime/PrimeFinSupportPage";
import { PrimeMdecPage } from "@/pages/prime/PrimeMdecPage";
import { PrimeCrmSourcesPage, PrimeTowerPage } from "@/pages/prime/PrimeTowerPage";
import { CommerceSurfacePage } from "@/pages/prime/CommerceSurfacePage";
import { PrimeGrowthOSPage } from "@/pages/prime/PrimeGrowthOSPage";
import { PrimeClientReportsPage } from "@/pages/prime/PrimeClientReportsPage";
import PrimeCrmOperatorDashboard from "@/pages/PrimeCrmOperatorDashboard";
import { PrimeCrmOverviewPage } from "@/pages/prime/PrimeCrmOverviewPage";
import Orders from "@/pages/Orders";
import Products from "@/pages/Products";
import ProductCreatePage from "@/pages/ProductCreatePage";
import ProductDetail from "@/pages/ProductDetail";
import ProductCategories from "@/pages/ProductCategories";
import Warehouses from "@/pages/Warehouses";
import PrimeInboxWorkspace from "@/pages/PrimeInboxWorkspace";
import FaqHub from "@/pages/FaqHub";
import FaqArticle from "@/pages/FaqArticle";
import { CsAnalyticsPage, QuickRepliesPage } from "@/pages/CrmManagementTools";
import ConversationChannelsPage from "@/pages/ConversationChannels";
import { ConnectedChannelsPage } from "@/pages/SalesChannels";
import LiveCommercePage from "@/pages/LiveCommerce";
import { ChannelAuthCallback } from "@/pages/ChannelAuthCallback";
import BusinessSettings from "@/pages/BusinessSettings";
import InvoiceManagement from "@/pages/InvoiceManagement";
import PromotionsManagement from "@/pages/PromotionsManagement";
import { TouchpointWorkspace } from "@/pages/TouchpointWorkspace";
import ScheduledTasksPage from "@/pages/ScheduledTasks";
import FinanceOps from "@/pages/FinanceOps";
import Docs from "@/pages/Docs";
import {
  PrimeCrmCampaignsSimplePage,
  PrimeCrmCustomersSimplePage,
  PrimeCrmLeadsSimplePage,
  PrimeCrmReengagementSimplePage,
  PrimeCrmSourcesSimplePage,
} from "@/pages/prime/PrimeCrmJourneyPages";

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
    <Route path="/home" element={<PrimeGrowthOSPage />} />
    <Route path="/admin/dashboard" element={<PrimeGrowthOSPage />} />
    <Route path="/builder" element={<Navigate to="/builder/theme" replace />} />
    <Route path="/builder/*" element={<TouchpointWorkspace kind="primeweb" />} />
    <Route path="/pos" element={<Navigate to="/pos/register" replace />} />
    <Route path="/pos/*" element={<TouchpointWorkspace kind="pos" />} />
    <Route path="/workspaces/primeweb" element={<Navigate to="/builder/theme" replace />} />
    <Route path="/workspaces/pos" element={<Navigate to="/pos/register" replace />} />
    <Route path="/client-reports" element={<PrimeClientReportsPage />} />
    <Route path="/reports" element={<Navigate to="/client-reports" replace />} />
    <Route path="/account" element={<Account />} />
    <Route path="/system/invoices" element={<InvoiceManagement />} />
    <Route path="/finance/invoices" element={<InvoiceManagement />} />
    <Route path="/finance/ops" element={<FinanceOps />} />
    <Route path="/automation/scheduled-tasks" element={<ScheduledTasksPage />} />
    <Route path="/automation/scheduled-tasks/:id" element={<ScheduledTasksPage />} />
    <Route path="/promotions" element={<Navigate to="/promotions/discount-codes" replace />} />
    <Route path="/promotions/*" element={<PromotionsManagement />} />
    <Route path="/settings" element={<Navigate to="/settings/general" replace />} />
    <Route path="/settings/stores" element={<Navigate to="/warehouses" replace />} />
    <Route path="/settings/channels" element={<Navigate to="/sales-channels/connected-channels" replace />} />
    <Route path="/settings/payments-pos" element={<Navigate to="/settings/payments" replace />} />
    <Route path="/settings/shipping" element={<Navigate to="/settings/shipping-delivery" replace />} />
    <Route path="/settings/team" element={<Navigate to="/settings/team-access" replace />} />
    <Route path="/settings/team-permissions" element={<Navigate to="/settings/team-access" replace />} />
    <Route path="/settings/crm-communications" element={<Navigate to="/settings/customer-data" replace />} />
    <Route path="/settings/templates-hardware" element={<Navigate to="/settings/templates-notifications" replace />} />
    <Route path="/settings/*" element={<BusinessSettings />} />
    
    <Route path="/crm" element={<Navigate to="/customer/service" replace />} />
    <Route path="/crm/overview" element={<PrimeCrmOverviewPage />} />
    <Route path="/crm/hub" element={<Navigate to="/customer/service" replace />} />
    <Route path="/crm/chat" element={<Navigate to="/customer/service" replace />} />
    <Route path="/crm/operator" element={<PrimeCrmOperatorDashboard />} />
    <Route path="/crm/mdec" element={<PrimeMdecPage />} />
    <Route path="/crm/sources" element={<PrimeCrmSourcesSimplePage />} />
    <Route path="/crm/campaigns" element={<PrimeCrmCampaignsSimplePage />} />
    <Route path="/crm/content-social" element={<PrimeTowerPage towerId="content-creator-ops" />} />
    <Route path="/crm/leads-rfqs" element={<PrimeCrmLeadsSimplePage />} />
    <Route path="/crm/contact-leads" element={<PrimeCrmLeadsSimplePage />} />
    <Route path="/crm/customers" element={<PrimeCrmCustomersSimplePage />} />
    <Route path="/crm/segments" element={<PrimeCrmCustomersSimplePage mode="segments" />} />
    <Route path="/crm/quick-replies" element={<QuickRepliesPage />} />
    <Route path="/crm/cs-analytics" element={<CsAnalyticsPage />} />
    <Route path="/sales-channels" element={<Navigate to="/sales-channels/connected-channels" replace />} />
    <Route path="/sales-channels/connected-channels" element={<ConnectedChannelsPage />} />
    <Route path="/channels" element={<ConnectedChannelsPage />} />
    <Route path="/channels/callback" element={<ChannelAuthCallback />} />
    <Route path="/sales-channels/live-commerce" element={<LiveCommercePage />} />
    <Route path="/sales-channels/conversation-channels" element={<ConversationChannelsPage />} />
    <Route path="/settings/conversation-channels" element={<Navigate to="/sales-channels/conversation-channels" replace />} />
    <Route path="/channels/:channel/connect" element={<ConnectedChannelsPage />} />
    <Route path="/channels/social-integrations" element={<Navigate to="/sales-channels/conversation-channels" replace />} />
    <Route path="/inbox/conversation" element={<PrimeInboxWorkspace />} />
    <Route path="/faq" element={<FaqHub />} />
    <Route path="/faq/:slug" element={<FaqArticle />} />
    <Route path="/crm/re-engage" element={<PrimeCrmReengagementSimplePage />} />
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
    
    <Route path="/intelligence/*" element={<Navigate to="/overview" replace />} />
    
    <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
    <Route path="/products" element={<Navigate to="/products/master-catalog" replace />} />
    <Route path="/products/master-catalog" element={<Products />} />
    <Route path="/products/categories" element={<ProductCategories />} />
    <Route path="/products/inventory" element={<Navigate to="/warehouse/stock" replace />} />
    <Route path="/products/new" element={<ProductCreatePage />} />
    <Route path="/products/:id/edit" element={<ProductCreatePage />} />
    <Route path="/products/:id" element={<ProductDetail />} />
    <Route path="/warehouses" element={<Navigate to="/warehouse/mapping" replace />} />
    <Route path="/docs" element={<Docs />} />
    <Route path="/warehouse/mapping" element={<Warehouses />} />
    <Route path="/warehouse/stock" element={<Warehouses />} />
    <Route path="/warehouse/transfers" element={<Warehouses />} />
    <Route path="/warehouse/adjustments" element={<Warehouses />} />
    <Route path="/inventory/*" element={<Navigate to={cosInventoryHref} replace />} />
    <Route path="/orders" element={<Orders />} />
    <Route path="/orders/fulfillment" element={<Navigate to="/orders?view=fulfillment" replace />} />
    <Route path="/orders/returns" element={<Navigate to="/orders?view=returns" replace />} />
    <Route path="/fulfillment/*" element={<Navigate to={cosFulfillmentHref} replace />} />
    <Route path="/returns/*" element={<Navigate to={cosFulfillmentHref} replace />} />
    <Route path="/sla-policies" element={<Navigate to={cosFulfillmentHref} replace />} />
    <Route path="/routing-plans" element={<Navigate to={cosFulfillmentHref} replace />} />
    </>
  );
}
