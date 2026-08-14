import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  conversationApi,
  type ConnectPayload,
  type Platform,
  type QuickStore,
} from '@/lib/conversation-channels-api';
import { Step1SelectSource } from './Step1SelectSource';
import { standaloneSources } from './source-catalog';
import { Step2RoutingConfig, type RoutingForm } from './Step2RoutingConfig';
import { Step3AutomationConfig, type AutomationForm } from './Step3AutomationConfig';

type StandaloneSource = (typeof standaloneSources)[number];
type ConnectionMode = 'QUICK_LINK' | 'STANDALONE_OAUTH';

const stepLabels = ['Select source', 'Routing & SLA', 'Automation & AI', 'Activation'];
const defaultRouting: RoutingForm = {
  display_name: '',
  strategy: 'ROUND_ROBIN',
  target_team_id: 'team_cs_01',
  sla_minutes: 10,
};
const defaultAutomation: AutomationForm = {
  enable_welcome_msg: true,
  welcome_template: 'Hello {{customer_name}}! How can {{store_name}} help you today?',
  enable_ai_copilot: true,
  enable_ai_order_lookup: true,
};

interface ConnectConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinked: () => Promise<void> | void;
}

export default function ConnectConversationModal({ open, onOpenChange, onLinked }: ConnectConversationModalProps) {
  const [step, setStep] = useState(1);
  const [stores, setStores] = useState<QuickStore[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [mode, setMode] = useState<ConnectionMode | null>(null);
  const [quickStore, setQuickStore] = useState<QuickStore | null>(null);
  const [standaloneSource, setStandaloneSource] = useState<StandaloneSource | null>(null);
  const [oauthReady, setOauthReady] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [routing, setRouting] = useState<RoutingForm>(defaultRouting);
  const [automation, setAutomation] = useState<AutomationForm>(defaultAutomation);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setMode(null);
    setQuickStore(null);
    setStandaloneSource(null);
    setOauthReady(false);
    setRouting(defaultRouting);
    setAutomation(defaultAutomation);
    setStoresLoading(true);
    conversationApi.quickStores()
      .then((response) => setStores(response.data))
      .catch((error: Error) => toast({ title: 'Could not load connected stores', description: error.message, variant: 'destructive' }))
      .finally(() => setStoresLoading(false));
  }, [open]);

  const selectQuickStore = (store: QuickStore) => {
    setMode('QUICK_LINK');
    setQuickStore(store);
    setStandaloneSource(null);
    setOauthReady(true);
    setRouting({ ...defaultRouting, display_name: `${store.store_name} - ${store.channel_name} Chat` });
    setStep(2);
  };

  const selectStandalone = (source: StandaloneSource) => {
    setMode('STANDALONE_OAUTH');
    setQuickStore(null);
    setStandaloneSource(source);
    setOauthReady(false);
    setRouting({ ...defaultRouting, display_name: source.name });
  };

  const authorizeStandalone = async () => {
    if (!standaloneSource) return;
    setAuthorizing(true);
    // Demo OAuth handshake. Production adapters replace this with the provider popup/callback.
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    setOauthReady(true);
    setAuthorizing(false);
    toast({ title: `${standaloneSource.name} authorized`, description: 'Required messaging scopes are ready.' });
    setStep(2);
  };

  const payload = (): ConnectPayload => {
    const platform = (quickStore?.platform || standaloneSource?.platform) as Platform;
    return {
      connection_type: mode as ConnectionMode,
      source_store_id: quickStore?.id || null,
      platform,
      display_name: routing.display_name.trim(),
      account_name: quickStore?.store_name || routing.display_name.trim(),
      auth_code: mode === 'STANDALONE_OAUTH' ? `oauth_${platform.toLowerCase()}_demo` : undefined,
      sync_scopes: standaloneSource?.scopes || ['CHATS', 'ORDER_CONTEXT'],
      routing: {
        strategy: routing.strategy,
        target_team_id: routing.target_team_id,
        sla_threshold_minutes: routing.sla_minutes,
      },
      automation: {
        enable_welcome: automation.enable_welcome_msg,
        welcome_message: automation.welcome_template,
        enable_ai_copilot: automation.enable_ai_copilot,
        enable_ai_order_lookup: automation.enable_ai_order_lookup,
      },
    };
  };

  const activate = async () => {
    setSubmitting(true);
    try {
      await conversationApi.connect(payload());
      await onLinked();
      toast({ title: 'Channel successfully linked to Prime Inbox!' });
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Channel could not be connected', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const canContinueRouting = routing.display_name.trim().length > 1 && routing.sla_minutes > 0 && Boolean(routing.target_team_id);
  const selectedName = quickStore?.channel_name || standaloneSource?.name || 'Conversation channel';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-5 pr-12">
          <DialogTitle>Connect Conversation Channel</DialogTitle>
          <DialogDescription>Link a messaging source to Prime Inbox, then define ownership, SLA, and automation.</DialogDescription>
        </DialogHeader>

        <div className="border-b border-border bg-muted/25 px-6 py-4">
          <ol className="grid grid-cols-4 gap-2" aria-label="Connection progress">
            {stepLabels.map((label, index) => {
              const number = index + 1;
              const active = number === step;
              const complete = number < step;
              return (
                <li key={label} className="flex min-w-0 items-center gap-2">
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${active ? 'bg-indigo-600 text-white' : complete ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                    {complete ? <Check className="size-4" /> : number}
                  </span>
                  <span className={`hidden truncate text-xs font-semibold sm:block ${active ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {step === 1 ? (
            <>
              <Step1SelectSource stores={stores} loading={storesLoading} onQuick={selectQuickStore} onStandalone={selectStandalone} />
              {standaloneSource ? (
                <div className="mt-5 flex items-center gap-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-800 dark:bg-indigo-950/30">
                  <ShieldCheck className="size-6 shrink-0 text-indigo-600 dark:text-indigo-300" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">Authorize {standaloneSource.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">A secure provider window requests only: {standaloneSource.scopes.join(', ')}.</p>
                  </div>
                  <Button onClick={authorizeStandalone} disabled={authorizing}>
                    {authorizing ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
                    Authorize
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
          {step === 2 ? <Step2RoutingConfig value={routing} onChange={setRouting} /> : null}
          {step === 3 ? <Step3AutomationConfig value={automation} onChange={setAutomation} /> : null}
          {step === 4 ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
                <div className="flex items-center gap-3"><ShieldCheck className="size-6 text-emerald-600" /><div><p className="font-semibold text-foreground">Ready to activate {selectedName}</p><p className="text-sm text-muted-foreground">Authentication and configuration checks passed.</p></div></div>
              </div>
              <dl className="grid gap-3 rounded-xl border border-border p-5 sm:grid-cols-2">
                <div><dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connection</dt><dd className="mt-1 text-sm font-medium">{mode === 'QUICK_LINK' ? 'Quick-Link · Existing store token' : 'Standalone OAuth'}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destination</dt><dd className="mt-1 text-sm font-medium">{routing.target_team_id.replaceAll('_', ' ')}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Routing</dt><dd className="mt-1 text-sm font-medium">{routing.strategy.replace('_', ' ')} · {routing.sla_minutes} min SLA</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI assistance</dt><dd className="mt-1 text-sm font-medium">{automation.enable_ai_copilot ? 'Copilot enabled' : 'Disabled'} · {automation.enable_ai_order_lookup ? 'Order lookup enabled' : 'No order lookup'}</dd></div>
              </dl>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4">
          {step > 1 ? <Button variant="outline" onClick={() => setStep(step - 1)} disabled={submitting}><ArrowLeft className="size-4" />Back</Button> : null}
          {step === 2 ? <Button onClick={() => setStep(3)} disabled={!canContinueRouting}>Continue<ArrowRight className="size-4" /></Button> : null}
          {step === 3 ? <Button onClick={() => setStep(4)}>Review activation<ArrowRight className="size-4" /></Button> : null}
          {step === 4 ? <Button onClick={activate} disabled={submitting}>{submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Complete & Activate Channel</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
