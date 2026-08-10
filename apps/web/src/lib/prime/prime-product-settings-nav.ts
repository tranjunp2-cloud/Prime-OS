import type { LucideIcon } from 'lucide-react';
import { primeNavigation, getPrimeNodeHref, type PrimeNavNode } from './prime-navigation';

export interface PrimeProductSettingsItem {
  id: string;
  label: string;
  kind: PrimeNavNode['kind'];
  href: string;
  rootProductId: string;
  rootProductLabel: string;
  icon?: LucideIcon;
  matchPaths: string[];
  children: PrimeProductSettingsItem[];
}

export interface PrimeProductSettingsGroup {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  badgeCount: number;
  items: PrimeProductSettingsItem[];
}

const PRODUCT_SETTINGS_AREA_IDS = new Set(['crm', 'customer', 'ecom', 'intelligence', 'finance']);

function toSettingsItem(node: PrimeNavNode, rootNode = node): PrimeProductSettingsItem {
  const href = getPrimeNodeHref(node);

  return {
    id: node.id,
    label: node.label,
    kind: node.kind,
    href,
    rootProductId: rootNode.id,
    rootProductLabel: rootNode.label,
    icon: node.icon,
    matchPaths: [href, ...(node.matchPaths || [])],
    children: (node.children || []).map((child) => toSettingsItem(child, rootNode)),
  };
}

export const primeProductSettingsGroups: PrimeProductSettingsGroup[] = primeNavigation
  .filter((node) => PRODUCT_SETTINGS_AREA_IDS.has(node.id))
  .map((node) => ({
    id: node.id,
    label: node.label,
    href: getPrimeNodeHref(node),
    icon: node.icon,
    badgeCount: node.children?.length || 0,
    items: (node.children || []).map((child) => toSettingsItem(child)),
  }));

export function flattenPrimeProductSettingsItems(groups = primeProductSettingsGroups) {
  const items: PrimeProductSettingsItem[] = [];

  const walk = (item: PrimeProductSettingsItem) => {
    items.push(item);
    item.children.forEach(walk);
  };

  groups.forEach((group) => group.items.forEach(walk));

  return items;
}



export function getPrimeProductSettingsRootMatchPaths(rootProductId: string, groups = primeProductSettingsGroups) {
  return flattenPrimeProductSettingsItems(groups)
    .filter((item) => item.rootProductId === rootProductId)
    .flatMap((item) => [item.href, ...item.matchPaths]);
}

export function findPrimeProductSettingsItemByHref(href: string, groups = primeProductSettingsGroups) {
  const normalizedHref = href.split('#')[0];
  const items = flattenPrimeProductSettingsItems(groups);

  return items.find((item) => item.href === normalizedHref)
    || items.find((item) => item.matchPaths.some((path) => path === normalizedHref));
}

export function getPrimeProductSettingsDefaultHref() {
  return primeProductSettingsGroups[0]?.href || '/overview';
}
