import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bot,
  Boxes,
  BrainCircuit,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardCheck,
  ClipboardList,
  CircleDollarSign,
  Gauge,
  Library,
  FileBarChart,
  FileText,
  Globe,
  HeartHandshake,
  Headphones,
  LayoutDashboard,
  Megaphone,
  MessagesSquare,
  MessageSquareText,
  Package,
  PanelsTopLeft,
  PenLine,
  RadioTower,
  ScanSearch,
  Shield,
  ShoppingCart,
  Siren,
  Store,
  Target,
  Truck,
  UserRoundCheck,
  Workflow,
  Settings2,
  WandSparkles,
} from 'lucide-react';

export type PrimeNavKind = 'overview' | 'area' | 'tower' | 'floor';

export interface PrimeNavNode {
  id: string;
  label: string;
  kind: PrimeNavKind;
  href?: string;
  external?: boolean;
  matchPaths?: string[];
  icon?: LucideIcon;
  badge?: string;
  children?: PrimeNavNode[];
}

export const primeNavigation: PrimeNavNode[] = [
  {
    id: 'overview',
    label: 'General Dashboard',
    kind: 'overview',
    href: '/overview',
    icon: LayoutDashboard,
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    kind: 'area',
    icon: BarChart3,
    children: [
      {
        id: 'product-operation-agent',
        label: 'Operation Agent',
        kind: 'tower',
        href: '/intelligence/product-operation-agent?view=command',
        matchPaths: ['/intelligence/product-operation-agent'],
        icon: Workflow,
        badge: 'new',
        children: [
          { id: 'product-operation-command', label: 'Command Center', kind: 'floor', href: '/intelligence/product-operation-agent?view=command', icon: LayoutDashboard },
          { id: 'product-operation-kanban', label: 'Operating Kanban', kind: 'floor', href: '/intelligence/product-operation-agent?view=kanban', icon: Workflow },
          { id: 'product-operation-agent-queue', label: 'Agent Queue', kind: 'floor', href: '/intelligence/product-operation-agent?view=queue', icon: Bot },
          { id: 'product-operation-audit', label: 'Audit', kind: 'floor', href: '/intelligence/product-operation-agent?view=audit', icon: FileText },
        ],
      },
      {
        id: 'branding-agent',
        label: 'Branding Agent',
        kind: 'tower',
        href: '/intelligence/branding-agent',
        matchPaths: ['/intelligence/brand-ai', '/intelligence/branding-agent'],
        icon: BrainCircuit,
        badge: 'new',
        children: [
          { id: 'branding-agent-dashboard', label: 'Dashboard', kind: 'floor', href: '/intelligence/branding-agent', matchPaths: ['/intelligence/brand-ai'], icon: BrainCircuit },
          {
            id: 'branding-agent-library',
            label: 'Brand Library',
            kind: 'floor',
            href: '/intelligence/branding-agent/library',
            matchPaths: ['/intelligence/brand-ai/library'],
            icon: Library,
          },
          {
            id: 'branding-agent-assets',
            label: 'My Assets',
            kind: 'floor',
            href: '/intelligence/branding-agent/integrations',
            matchPaths: [
              '/intelligence/branding-agent/venus-beauty',
              '/intelligence/branding-agent/atelier-coffee',
              '/intelligence/branding-agent/nordic-desk',
              '/intelligence/brand-ai/integrations',
            ],
            icon: Library,
          },
          { id: 'branding-agent-create', label: 'Create New', kind: 'floor', href: '/intelligence/branding-agent/create', matchPaths: ['/intelligence/brand-ai/create'], icon: WandSparkles },
        ],
      },
      {
        id: 'consulting-agent',
        label: 'Consulting Agent',
        kind: 'tower',
        href: '/intelligence/consulting-agent?tab=kpi',
        matchPaths: [
          '/intelligence',
          '/intelligence/consulting-agent',
          '/intelligence/decision-hub',
          '/intelligence/signals',
          '/intelligence/launch-decisions',
          '/intelligence/analytics',
          '/intelligence/ai-operator',
          '/intelligence/alerts',
          '/intelligence/creators',
          '/intelligence/trends',
          '/intelligence/customers',
          '/intelligence/attribution',
          '/intelligence/forecasting',
          '/intelligence/voc',
          '/intelligence/campaigns',
        ],
        icon: Bot,
        badge: 'new',
        children: [
          { id: 'consulting-agent-kpi', label: 'KPI Dashboard', kind: 'floor', href: '/intelligence/consulting-agent?tab=kpi', icon: BarChart3 },
          { id: 'consulting-agent-signals', label: 'Signals Board', kind: 'floor', href: '/intelligence/consulting-agent?tab=signals', icon: ScanSearch },
          { id: 'consulting-agent-launch', label: 'Launch Decisions', kind: 'floor', href: '/intelligence/consulting-agent?tab=launch', icon: PanelsTopLeft },
        ],
      },
    ],
  },
  {
    id: 'ecom',
    label: 'Ecom',
    kind: 'area',
    icon: Store,
    children: [
      {
        id: 'cos',
        label: 'COS Ops',
        kind: 'tower',
        href: '/ecom/cos/product-master',
        matchPaths: ['/ecom/cos'],
        icon: Boxes,
        children: [
          {
            id: 'product-master',
            label: 'Products',
            kind: 'floor',
            href: '/ecom/cos/product-master',
            matchPaths: ['/ecom/cos/product-master', '/ecom/cos/listings'],
            icon: Package,
          },
          {
            id: 'inventory-brain',
            label: 'Inventory Brain',
            kind: 'floor',
            href: '/ecom/cos/inventory-brain',
            matchPaths: ['/ecom/cos/inventory-brain', '/ecom/cos/warehouses'],
            icon: Boxes,
          },
          { id: 'oms', label: 'Orders', kind: 'floor', href: '/ecom/cos/oms', icon: ShoppingCart },
          {
            id: 'fulfillment',
            label: 'Fulfillment',
            kind: 'floor',
            href: '/ecom/cos/fulfillment',
            matchPaths: ['/ecom/cos/fulfillment', '/ecom/cos/returns'],
            icon: Truck,
          },
          { id: 'policy-rule', label: 'Policy & Rule', kind: 'floor', href: '/ecom/cos/policy-rule', icon: Shield },
          { id: 'event-audit', label: 'Event & Audit', kind: 'floor', href: '/ecom/cos/event-audit', icon: Workflow },
        ],
      },
    ],
  },
  {
    id: 'demand',
    label: 'Demand',
    kind: 'area',
    icon: RadioTower,
    children: [
      {
        id: 'demand-hub',
        label: 'Demand Dashboard',
        kind: 'tower',
        href: '/demand/hub',
        matchPaths: ['/demand'],
        icon: LayoutDashboard,
      },
      {
        id: 'mdec',
        label: 'MDEC',
        kind: 'tower',
        href: '/demand/mdec',
        matchPaths: ['/demand/mdec'],
        icon: MessageSquareText,
        badge: 'new',
        children: [
          {
            id: 'mdec-main',
            label: 'Main',
            kind: 'floor',
            href: '/demand/mdec?view=dashboard',
            icon: RadioTower,
            children: [
              { id: 'mdec-dashboard', label: 'Dashboard', kind: 'floor', href: '/demand/mdec?view=dashboard', icon: LayoutDashboard },
              { id: 'mdec-calendar', label: 'Calendar', kind: 'floor', href: '/demand/mdec?view=calendar', icon: CalendarDays },
              { id: 'mdec-composer', label: 'Composer', kind: 'floor', href: '/demand/mdec?view=composer', icon: PenLine },
            ],
          },
          {
            id: 'mdec-workflow',
            label: 'Workflow',
            kind: 'floor',
            href: '/demand/mdec?view=approvals',
            icon: Workflow,
            children: [
              { id: 'mdec-approvals', label: 'Approvals', kind: 'floor', href: '/demand/mdec?view=approvals', icon: ClipboardCheck, badge: '01' },
              { id: 'mdec-engagement', label: 'Engagement', kind: 'floor', href: '/demand/mdec?view=engagement', icon: MessagesSquare, badge: '06' },
              { id: 'mdec-escalations', label: 'Escalations', kind: 'floor', href: '/demand/mdec?view=escalations', icon: Siren, badge: '03' },
            ],
          },
          {
            id: 'mdec-insight',
            label: 'Insight',
            kind: 'floor',
            href: '/demand/mdec?view=analytics',
            icon: ChartNoAxesCombined,
            children: [
              { id: 'mdec-analytics', label: 'Analytics', kind: 'floor', href: '/demand/mdec?view=analytics', icon: FileBarChart },
              { id: 'mdec-listening', label: 'Listening', kind: 'floor', href: '/demand/mdec?view=listening', icon: Headphones },
              { id: 'mdec-reports', label: 'Reports', kind: 'floor', href: '/demand/mdec?view=reports', icon: FileText },
            ],
          },
        ],
      },
      {
        id: 'sources',
        label: 'Sources',
        kind: 'tower',
        href: '/demand/sources',
        matchPaths: ['/demand/acquisition'],
        icon: Globe,
        children: [
          { id: 'sources-marketplace', label: 'Marketplace Source', kind: 'floor', href: '/demand/sources?function=marketplace', icon: Store },
          { id: 'sources-social', label: 'Social Source', kind: 'floor', href: '/demand/sources?function=social', icon: MessagesSquare },
          { id: 'sources-ads', label: 'Ads Source', kind: 'floor', href: '/demand/sources?function=ads', icon: Megaphone },
          { id: 'sources-partner', label: 'Partner Source', kind: 'floor', href: '/demand/sources?function=partner', icon: HeartHandshake },
          { id: 'sources-manual', label: 'Manual Import', kind: 'floor', href: '/demand/sources?function=manual', icon: FileText },
        ],
      },
  {
    id: 'campaign-ops',
    label: 'Campaigns',
    kind: 'tower',
    href: '/demand/campaigns',
    matchPaths: ['/demand/campaign-ops', '/demand/campaign'],
    icon: Megaphone,
    children: [
      { id: 'campaigns-overview', label: 'Overview', kind: 'floor', href: '/demand/campaigns?tab=overview', icon: LayoutDashboard },
      { id: 'campaigns-pipeline', label: 'Pipeline', kind: 'floor', href: '/demand/campaigns?tab=pipeline', icon: PanelsTopLeft },
      { id: 'campaigns-planner', label: 'Planner', kind: 'floor', href: '/demand/campaigns?tab=planner', icon: PenLine },
      { id: 'campaigns-readiness', label: 'Readiness', kind: 'floor', href: '/demand/campaigns?tab=readiness', icon: Gauge },
      { id: 'campaigns-execution-queue', label: 'Execution Queue', kind: 'floor', href: '/demand/campaigns?tab=execution-queue', icon: ClipboardList },
      { id: 'campaigns-results', label: 'Results', kind: 'floor', href: '/demand/campaigns?tab=results', icon: FileBarChart },
    ],
  },
      {
        id: 'content-creator-ops',
        label: 'Content & Social',
        kind: 'tower',
        href: '/demand/content-social',
        matchPaths: ['/demand/content-creator-ops'],
        icon: MessageSquareText,
      },
      {
        id: 'lead-response-capture',
        label: 'Leads & RFQs',
        kind: 'tower',
        href: '/demand/leads-rfqs',
        matchPaths: ['/demand/lead-response-capture', '/demand/lead-capture'],
        icon: UserRoundCheck,
      },
      {
        id: 'retargeting-outreach',
        label: 'Re-engage',
        kind: 'tower',
        href: '/demand/re-engage',
        matchPaths: ['/demand/retargeting-outreach', '/demand/retargeting'],
        icon: Target,
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    kind: 'area',
    icon: CircleDollarSign,
    children: [
      {
        id: 'fin-support',
        label: 'Fin Support',
        kind: 'tower',
        href: '/finance/fin-support',
        matchPaths: [
          '/finance',
          '/finance/health',
          '/finance/capital-offers',
          '/finance/risk-trust',
          '/finance/capital-readiness',
          '/finance/settlement-repayment',
          '/finance/capital',
          '/finance/lending',
          '/finance/risk',
        ],
        icon: CircleDollarSign,
      },
    ],
  },
  {
    id: 'customer',
    label: 'Customer',
    kind: 'area',
    icon: HeartHandshake,
    children: [
      {
        id: 'crm-compact',
        label: 'Customer Profile',
        kind: 'tower',
        href: '/customer/crm-compact?floor=overview',
        matchPaths: ['/customer/crm-compact'],
        icon: HeartHandshake,
        children: [
          { id: 'customer-account', label: 'Account Profile', kind: 'floor', href: '/customer/crm-compact?floor=account', matchPaths: ['/customer/crm-compact?floor=contact', '/customer/crm-compact?floor=tags'], icon: Building2 },
          { id: 'identity-matching', label: 'Identity Matching', kind: 'floor', href: '/customer/crm-compact?floor=identity', icon: ScanSearch },
        ],
      },
      { id: 'service', label: 'Service', kind: 'tower', href: '/customer/service', icon: ClipboardList },
    ],
  },
  {
    id: 'platform-admin',
    label: 'Admin Setup',
    kind: 'area',
    href: '/account',
    icon: Settings2,
  },
];

const splitRoute = (route: string) => {
  const [pathAndSearch, hash = ''] = route.split('#');
  const [pathname, search = ''] = pathAndSearch.split('?');
  return { pathname, search, hash };
};

const routeMatches = (routeKey: string, href: string) => {
  const current = splitRoute(routeKey);
  const target = splitRoute(href);

  if (target.search) {
    if (current.pathname !== target.pathname) return false;

    const currentParams = new URLSearchParams(current.search);
    const targetParams = new URLSearchParams(target.search);
    return Array.from(targetParams.entries()).every(([key, value]) => currentParams.get(key) === value);
  }

  const samePath = current.pathname === target.pathname || current.pathname.startsWith(`${target.pathname}/`);
  const sameHash = !target.hash || current.hash === target.hash;

  return samePath && sameHash;
};

const nodeMatchCandidates = (node: PrimeNavNode) => (
  [node.href, ...(node.matchPaths || [])].filter(Boolean) as string[]
);

const nodeMatches = (pathname: string, node: PrimeNavNode) => {
  const candidates = nodeMatchCandidates(node);
  return candidates.some((candidate) => routeMatches(pathname, candidate));
};

const nodeMatchScore = (pathname: string, node: PrimeNavNode) => {
  const matchedCandidates = nodeMatchCandidates(node).filter((candidate) => routeMatches(pathname, candidate));
  return Math.max(...matchedCandidates.map((candidate) => candidate.length), 0);
};

export function getPrimeNavPath(pathname: string, nodes = primeNavigation) {
  const matches: PrimeNavNode[][] = [];

  const walk = (items: PrimeNavNode[], parents: PrimeNavNode[]) => {
    items.forEach((node) => {
      const path = [...parents, node];

      if (nodeMatches(pathname, node)) {
        matches.push(path);
      }

      if (node.children?.length) {
        walk(node.children, path);
      }
    });
  };

  walk(nodes, []);

  return matches.sort((a, b) => {
    const scoreDelta = nodeMatchScore(pathname, b[b.length - 1]) - nodeMatchScore(pathname, a[a.length - 1]);

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return b.length - a.length;
  })[0] || [];
}

export function getPrimeNodeHref(node: PrimeNavNode): string {
  if (node.href) {
    return node.href;
  }

  const firstChild = node.children?.[0];

  return firstChild ? getPrimeNodeHref(firstChild) : '/overview';
}
