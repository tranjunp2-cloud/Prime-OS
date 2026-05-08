import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BellRing,
  Bot,
  Boxes,
  ClipboardList,
  CircleDollarSign,
  Globe,
  HeartHandshake,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  Package,
  PanelsTopLeft,
  RadioTower,
  ScanSearch,
  Shield,
  ShoppingCart,
  Store,
  Target,
  Truck,
  UserRound,
  UserRoundCheck,
  Workflow,
  Settings2,
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
    label: 'Overview',
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
        id: 'decision-hub',
        label: 'Decision Hub',
        kind: 'tower',
        href: '/intelligence/decision-hub',
        matchPaths: ['/intelligence', '/intelligence/analytics', '/intelligence/ai-operator', '/intelligence/alerts'],
        icon: Bot,
      },
      {
        id: 'signals',
        label: 'Signals',
        kind: 'tower',
        href: '/intelligence/signals',
        matchPaths: ['/intelligence/creators', '/intelligence/trends', '/intelligence/customers', '/intelligence/attribution', '/intelligence/forecasting', '/intelligence/voc'],
        icon: ScanSearch,
      },
      {
        id: 'campaigns',
        label: 'Launch Decisions',
        kind: 'tower',
        href: '/intelligence/launch-decisions',
        matchPaths: ['/intelligence/campaigns', '/intelligence/alerts'],
        icon: PanelsTopLeft,
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
        label: 'Demand Hub',
        kind: 'tower',
        href: '/demand/hub',
        matchPaths: ['/demand'],
        icon: RadioTower,
      },
      {
        id: 'sources',
        label: 'Sources',
        kind: 'tower',
        href: '/demand/sources',
        matchPaths: ['/demand/acquisition'],
        icon: Globe,
      },
      {
        id: 'campaign-ops',
        label: 'Campaigns',
        kind: 'tower',
        href: '/demand/campaigns',
        matchPaths: ['/demand/campaign-ops', '/demand/campaign'],
        icon: Megaphone,
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
      { id: 'crm-compact', label: 'CRM Compact', kind: 'tower', href: '/customer/crm-compact', icon: HeartHandshake },
      { id: 'service', label: 'Service', kind: 'tower', href: '/customer/service', icon: ClipboardList },
    ],
  },
  {
    id: 'platform-admin',
    label: 'Platform Admin',
    kind: 'area',
    href: '/account',
    icon: Settings2,
  },
];

const routeMatches = (pathname: string, href: string) => (
  pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith(`${href}#`)
);

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
