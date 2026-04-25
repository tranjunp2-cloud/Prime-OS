import { useMemo } from 'react';
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
import { getPrimeNodeHref, primeNavigation, type PrimeNavNode } from '@/lib/prime/prime-navigation';

type PrimeCommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type CommandRoute = {
  id: string;
  label: string;
  area: string;
  href: string;
  external: boolean;
  icon?: PrimeNavNode['icon'];
};

const routeFromNode = (node: PrimeNavNode, area: string): CommandRoute => ({
  id: node.id,
  label: node.label,
  area,
  href: getPrimeNodeHref(node),
  external: Boolean(node.external),
  icon: node.icon,
});

function collectRoutes(nodes: PrimeNavNode[], area = 'Prime OS'): CommandRoute[] {
  return nodes.flatMap((node) => {
    const nextArea = node.kind === 'area' ? node.label : area;
    const current = node.href || node.kind === 'overview' ? [routeFromNode(node, nextArea)] : [];
    const children = node.children?.length ? collectRoutes(node.children, nextArea) : [];

    return [...current, ...children];
  });
}

export function PrimeCommandPalette({ open, onOpenChange }: PrimeCommandPaletteProps) {
  const navigate = useNavigate();
  const routes = useMemo(() => collectRoutes(primeNavigation), []);

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
      <CommandInput placeholder="Jump to a workspace, customer, demand module, or COS..." />
      <CommandList>
        <CommandEmpty>No matching workspace found.</CommandEmpty>
        <CommandGroup heading="Fast navigation">
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
        <CommandGroup heading="Operator actions">
          <CommandItem value="Search entities products SKUs orders leads customers alerts">
            <Search className="size-4 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">Search products, orders, leads, customers, alerts</span>
            <CommandShortcut>soon</CommandShortcut>
          </CommandItem>
          <CommandItem value="Review launch decisions intelligence">
            <LayoutDashboard className="size-4 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">Review launch decision queue</span>
            <CommandShortcut>tab</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
