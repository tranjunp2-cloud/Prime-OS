import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Globe2,
  HeartHandshake,
  Megaphone,
  MessageSquareText,
  RefreshCcw,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getPrimeSnapshot } from '@/lib/prime/prime-data';

interface JourneyStep {
  id: string;
  index: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  stage: string;
  outcome: string;
  icon: LucideIcon;
}

const journeySteps: JourneyStep[] = [
  { id: 'sources', index: '01', stage: 'Acquire', title: 'Sources', description: 'Capture demand from marketplaces, social, ads, partners, and imports.', outcome: 'Connect and review channels', href: '/crm/sources', cta: 'Open sources', icon: Globe2 },
  { id: 'campaigns', index: '02', stage: 'Activate', title: 'Campaigns', description: 'Plan campaigns that turn source signals into qualified demand.', outcome: 'Plan and launch campaigns', href: '/crm/campaigns', cta: 'Open campaigns', icon: Megaphone },
  { id: 'leads', index: '03', stage: 'Convert', title: 'Leads & RFQs', description: 'Qualify intent, manage requests for quote, and assign the next action.', outcome: 'Prioritize sales follow-up', href: '/crm/leads-rfqs', cta: 'Open leads', icon: UserRoundCheck },
  { id: 'customers', index: '04', stage: 'Serve', title: 'Customers', description: 'Use identity, activity, and transaction context in one profile.', outcome: 'Understand each customer', href: '/crm/customers', cta: 'Open customers', icon: HeartHandshake },
  { id: 're-engagement', index: '05', stage: 'Retain', title: 'Re-engagement', description: 'Bring inactive customers back with relevant audiences and outreach.', outcome: 'Recover customer value', href: '/crm/re-engage', cta: 'Open re-engagement', icon: RefreshCcw },
];

export function PrimeCrmOverviewPage() {
  return (
    <div className="prime-stage min-h-full text-foreground">
      <div className="flex min-h-full w-full flex-col gap-6 px-4 pb-20 pt-5 sm:px-6 lg:px-8">
        <CrmJourneyOverviewContent />
      </div>
    </div>
  );
}

export function CrmJourneyOverviewContent({ onNavigate, onboarding = false }: { onNavigate?: () => void; onboarding?: boolean }) {
  const snapshot = getPrimeSnapshot();
  const liveMetrics: Record<string, { primary: string; secondary: string; attention: string }> = {
    sources: { primary: `${new Set(snapshot.campaigns.map((item) => item.channel)).size} active`, secondary: `${snapshot.campaigns.reduce((sum, item) => sum + item.leads, 0)} leads`, attention: '2 need attention' },
    campaigns: { primary: `${snapshot.campaigns.filter((item) => item.status === 'active').length} active`, secondary: `${snapshot.campaigns.filter((item) => item.status === 'testing').length} awaiting review`, attention: `${snapshot.campaigns.filter((item) => item.status === 'paused').length} paused` },
    leads: { primary: `${snapshot.leads.filter((item) => item.status !== 'converted').length} open leads`, secondary: `${snapshot.rfqs.filter((item) => item.status !== 'converted').length} pending RFQs`, attention: `${snapshot.leads.filter((item) => item.status === 'new').length} unassigned` },
    customers: { primary: `${snapshot.customers.length} profiles`, secondary: `${snapshot.customers.filter((item) => ['active', 'retention'].includes(item.lifecycle)).length} active`, attention: `${snapshot.customers.filter((item) => item.lifecycle === 'at-risk').length} at risk` },
    're-engagement': { primary: `${snapshot.customers.filter((item) => item.lifecycle === 'at-risk').length} eligible`, secondary: '1 plan ready', attention: '1 needs approval' },
  };
  return (
    <>
        <section aria-labelledby={onboarding ? 'onboarding-journey-heading' : 'journey-heading'} className="grid gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace flow</div>
            <h2 id={onboarding ? 'onboarding-journey-heading' : 'journey-heading'} className="mt-1 text-lg font-semibold">Customer conversion journey</h2>
            <p className="mt-1 text-sm text-muted-foreground">{onboarding ? 'See how demand moves from connected sources into campaigns, sales opportunities, customer relationships, and retention.' : 'Use live workload signals to open the stage that needs attention. Daily navigation opens Sources directly; this overview remains available for managers.'}</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            {journeySteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="relative flex min-w-0">
                  <Link to={step.href} onClick={onNavigate} className="group flex w-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" aria-label={`${step.cta}: ${step.description}`}>
                  <article className="flex w-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
                    <div className="flex items-center justify-between gap-3">
                      <span className="grid size-9 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary"><Icon className="size-4" /></span>
                      <span className="font-identifier text-xs font-semibold text-muted-foreground">{step.index}</span>
                    </div>
                    <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{step.stage}</div>
                    <h3 className="mt-1 text-base font-semibold">{step.title}</h3>
                    <p className="mt-2 min-h-[60px] text-sm leading-5 text-muted-foreground">{step.description}</p>
                    <div className="mt-3 rounded-lg bg-muted/50 p-3">
                      <div className="text-lg font-semibold tracking-tight">{liveMetrics[step.id].primary}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{liveMetrics[step.id].secondary}</div>
                      <Badge variant="warning" className="mt-2">{liveMetrics[step.id].attention}</Badge>
                    </div>
                    <div className="mt-4 border-t border-border pt-3">
                      <div className="text-xs font-medium text-muted-foreground">{step.outcome}</div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary">{step.cta}<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></div>
                    </div>
                  </article>
                  </Link>
                  {index < journeySteps.length - 1 ? <span className="absolute -right-2 top-1/2 z-10 hidden size-5 -translate-y-1/2 place-items-center rounded-full border bg-background text-muted-foreground lg:grid"><ArrowRight className="size-3" /></span> : null}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <MessageSquareText className="mt-0.5 size-4 shrink-0 text-primary" />
          <div><span className="font-semibold text-foreground">Handling an active conversation?</span><span className="text-muted-foreground"> Use Inbox & Support. This workspace is for managing the broader acquisition-to-retention journey.</span></div>
        </aside>
    </>
  );
}
