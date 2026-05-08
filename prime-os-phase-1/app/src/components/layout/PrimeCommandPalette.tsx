import { useMemo, type Dispatch } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ExternalLink, LayoutDashboard, Search, Sparkles } from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useI18n } from '@/lib/i18n/I18nContext';
import { getShellDictionary, getShellNavLabel } from '@/lib/i18n/shell-dictionaries';
import { getPrimeNodeHref, primeNavigation, type PrimeNavNode } from '@/lib/prime/prime-navigation';
import type { Locale } from '@/lib/i18n/dictionaries';

type PrimeCommandPaletteProps = {
  open: boolean;
  onOpenChange: Dispatch<boolean>;
};

type CommandRoute = {
  id: string;
  label: string;
  area: string;
  href: string;
  external: boolean;
  icon?: PrimeNavNode['icon'];
};

const routeFromNode = (node: PrimeNavNode, area: string, locale: Locale): CommandRoute => ({
  id: node.id,
  label: getShellNavLabel(locale, node.id, node.label),
  area,
  href: getPrimeNodeHref(node),
  external: Boolean(node.external),
  icon: node.icon,
});

function collectRoutes(nodes: PrimeNavNode[], locale: Locale, area = 'Prime OS'): CommandRoute[] {
  return nodes.flatMap((node) => {
    const nodeLabel = getShellNavLabel(locale, node.id, node.label);
    const nextArea = node.kind === 'area' ? nodeLabel : area;
    const current = node.href || node.kind === 'overview' ? [routeFromNode(node, nextArea, locale)] : [];
    const children = node.children?.length ? collectRoutes(node.children, locale, nextArea) : [];

    return [...current, ...children];
  });
}

export function PrimeCommandPalette({ open, onOpenChange }: PrimeCommandPaletteProps) {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const shellCopy = useMemo(() => getShellDictionary(locale), [locale]);
  const routes = useMemo(() => collectRoutes(primeNavigation, locale), [locale]);

  const goTo = (route: CommandRoute) => {
    onOpenChange(false);

    if (route.external) {
      window.open(route.href, '_blank', 'noreferrer');
      return;
    }

    navigate(route.href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="border-b border-border/65 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Prime OS global search</div>
            <div className="text-xs text-muted-foreground">Navigate workspaces, towers, floors, and operator actions.</div>
          </div>
          <div className="hidden items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 font-identifier text-[10px] text-muted-foreground sm:flex"><span>⌘</span><span>K</span></div>
        </div>
      </div>
      <CommandInput placeholder={shellCopy.commandInputPlaceholder} />
      <CommandList>
        <CommandEmpty>{shellCopy.commandEmpty}</CommandEmpty>
        <CommandGroup heading={shellCopy.commandFastNavigation}>
          {routes.map((route) => {
            const Icon = route.icon || LayoutDashboard;

            return (
              <CommandItem
                key={route.id}
                value={`${route.label} ${route.area} ${route.href}`}
                onSelect={() => goTo(route)}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background/80"><Icon className="size-4 text-muted-foreground" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{route.label}</span>
                  <span className="command-route-meta block truncate text-xs text-muted-foreground">{route.href}</span>
                </span>
                <span className="command-route-chip hidden rounded-full border bg-muted/40 px-2 py-1 text-xs text-muted-foreground sm:inline">{route.area}</span>
                {route.external ? <ExternalLink className="size-4 text-muted-foreground" /> : <ArrowRight className="size-4 text-muted-foreground" />}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={shellCopy.commandOperatorActions}>
          <CommandItem value={shellCopy.commandSearchEntitiesValue}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background/80"><Search className="size-4 text-muted-foreground" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate font-medium">{shellCopy.commandSearchEntitiesLabel}</span><span className="command-route-meta block truncate text-xs text-muted-foreground">Search product, SKU, order, lead, customer</span></span>
            <CommandShortcut>{shellCopy.commandSoon}</CommandShortcut>
          </CommandItem>
          <CommandItem value={shellCopy.commandReviewLaunchValue}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background/80"><Sparkles className="size-4 text-muted-foreground" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate font-medium">{shellCopy.commandReviewLaunchLabel}</span><span className="command-route-meta block truncate text-xs text-muted-foreground">Review next launch decision package</span></span>
            <CommandShortcut>{shellCopy.commandTab}</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/65 bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        <span>↑↓ select · Enter open · Esc close</span>
        <span>Results stay inside Prime OS ownership boundaries</span>
      </div>
    </CommandDialog>
  );
}
