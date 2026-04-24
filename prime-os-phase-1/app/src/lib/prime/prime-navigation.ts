import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BellRing,
  Bot,
  Boxes,
  ClipboardList,
  CircleDollarSign,
  Gauge,
  HeartHandshake,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  Package,
  PanelsTopLeft,
  RadioTower,
  Shield,
  ShoppingCart,
  Store,
  Target,
  Truck,
  UserRoundCheck,
  Workflow,
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
        id: 'creators',
        label: 'Creators',
        kind: 'tower',
        href: '/intelligence/creators',
        matchPaths: ['/intelligence/analytics', '/intelligence/attribution', '/intelligence/voc'],
        icon: BarChart3,
      },
      {
        id: 'customers',
        label: 'Trends',
        kind: 'tower',
        href: '/intelligence/trends',
        matchPaths: ['/intelligence/customers', '/intelligence/forecasting', '/intelligence/ai-operator'],
        icon: HeartHandshake,
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
        id: 'commerce-surface',
        label: 'COS',
        kind: 'tower',
        href: 'https://client-portal.bdskhudong.com/auth',
        external: true,
        icon: Store,
      },
      {
        id: 'cos',
        label: 'COS Analysis',
        kind: 'tower',
        href: '/ecom/cos/product-master',
        matchPaths: ['/ecom/cos'],
        icon: Boxes,
        badge: 'core',
        children: [
          {
            id: 'product-master',
            label: 'Product Master',
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
          { id: 'oms', label: 'OMS', kind: 'floor', href: '/ecom/cos/oms', icon: ShoppingCart },
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
        id: 'campaign-ops',
        label: 'Campaign Ops',
        kind: 'tower',
        href: '/demand/campaign-ops',
        matchPaths: ['/demand/acquisition', '/demand/campaign'],
        icon: Megaphone,
      },
      {
        id: 'content-creator-ops',
        label: 'Content & Creator Ops',
        kind: 'tower',
        href: '/demand/content-creator-ops',
        matchPaths: ['/demand/content-social'],
        icon: MessageSquareText,
      },
      {
        id: 'lead-response-capture',
        label: 'Lead & Response Capture',
        kind: 'tower',
        href: '/demand/lead-response-capture',
        matchPaths: ['/demand/lead-capture'],
        icon: UserRoundCheck,
      },
      {
        id: 'retargeting-outreach',
        label: 'Retargeting & Outreach',
        kind: 'tower',
        href: '/demand/retargeting-outreach',
        matchPaths: ['/demand/retargeting'],
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
        id: 'capital',
        label: 'Capital Readiness',
        kind: 'tower',
        href: '/finance/capital-readiness',
        icon: CircleDollarSign,
      },
      {
        id: 'offers',
        label: 'Capital Offers',
        kind: 'tower',
        href: '/finance/capital-offers',
        icon: ClipboardList,
      },
      {
        id: 'risk',
        label: 'Risk & Trust',
        kind: 'tower',
        href: '/finance/risk-trust',
        icon: Gauge,
      },
      {
        id: 'settlement',
        label: 'Settlement & Repayment',
        kind: 'tower',
        href: '/finance/settlement-repayment',
        icon: Workflow,
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
];

const routeMatches = (pathname: string, href: string) => (
  pathname === href || pathname.startsWith(`${href}/`)
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
