import type { LucideIcon } from 'lucide-react';
import { primeNavigation, getPrimeNodeHref, type PrimeNavNode } from './prime-navigation';

export interface PrimeProductSettingsItem {
  id: string;
  label: string;
  kind: PrimeNavNode['kind'];
  href: string;
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

const PRODUCT_SETTINGS_AREA_IDS = new Set(['demand', 'customer', 'ecom', 'intelligence', 'finance']);

function toSettingsItem(node: PrimeNavNode): PrimeProductSettingsItem {
  const href = getPrimeNodeHref(node);

  return {
    id: node.id,
    label: node.label,
    kind: node.kind,
    href,
    icon: node.icon,
    matchPaths: [href, ...(node.matchPaths || [])],
    children: (node.children || []).map(toSettingsItem),
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
    items: (node.children || []).map(toSettingsItem),
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

export function getPrimeProductSettingsDefaultHref() {
  return primeProductSettingsGroups[0]?.href || '/overview';
}
