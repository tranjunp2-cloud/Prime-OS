import { ArrowRight, BriefcaseBusiness, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PRIME_ROLE_LABELS, type PartnerWorkspaceSummary } from '@/lib/prime/partner-workspace';

export function PartnerWorkspacePanel({ summary }: { summary: PartnerWorkspaceSummary }) {
  return (
    <section data-testid={`partner-workspace-${summary.role}`} className="rounded-xl border bg-card shadow-sm">
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full">Role workspace</Badge>
            <Badge variant="secondary" className="rounded-full">{PRIME_ROLE_LABELS[summary.role]}</Badge>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">{summary.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{summary.job}</p>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center gap-2 font-medium"><BriefcaseBusiness className="size-4" /> Evidence</div>
              <p className="mt-2 text-muted-foreground">{summary.evidence}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center gap-2 font-medium"><ShieldCheck className="size-4" /> Boundary</div>
              <p className="mt-2 text-muted-foreground">{summary.boundary}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <Card className="rounded-lg border bg-background/70 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">View / action boundary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.capabilities.map((capability) => (
                <div key={`${summary.role}-${capability.label}`} className="rounded-lg border bg-muted/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{capability.label}</span>
                    <Badge variant="outline">{capability.boundary}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{capability.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-background/70 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Partner handoffs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.handoffs.map((handoff) => (
                <Link key={`${summary.role}-${handoff.label}`} to={handoff.href} className="block rounded-lg border bg-muted/10 p-3 transition-colors hover:border-primary/40 hover:bg-muted/30">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{handoff.label}</span>
                    <Badge variant="outline">{handoff.owner}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{handoff.evidence}</p>
                  <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    {handoff.nextAction}<ArrowRight className="size-3" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
