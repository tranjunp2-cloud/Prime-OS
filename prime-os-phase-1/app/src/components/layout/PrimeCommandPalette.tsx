import { useMemo, type Dispatch } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ExternalLink, LayoutDashboard, Search } from 'lucide-react';

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
                <Icon className="size-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{route.label}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{route.area}</span>
                {route.external ? <ExternalLink className="size-3.5 text-muted-foreground" /> : <ArrowRight className="size-3.5 text-muted-foreground" />}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={shellCopy.commandOperatorActions}>
          <CommandItem value={shellCopy.commandSearchEntitiesValue}>
            <Search className="size-4 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{shellCopy.commandSearchEntitiesLabel}</span>
            <CommandShortcut>{shellCopy.commandSoon}</CommandShortcut>
          </CommandItem>
          <CommandItem value={shellCopy.commandReviewLaunchValue}>
            <LayoutDashboard className="size-4 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{shellCopy.commandReviewLaunchLabel}</span>
            <CommandShortcut>{shellCopy.commandTab}</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
