import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, MessageSquareText, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { submitFeedback, type FeedbackTopic, type SentimentRating } from '@/lib/feedback-api';
import { cn } from '@/lib/utils';

const topicOptions: Array<{ value: FeedbackTopic; label: string }> = [
  { value: 'GENERAL', label: 'General Feedback' },
  { value: 'UI_UX', label: 'UI/UX Improvement' },
  { value: 'BUG', label: 'Bug Report' },
  { value: 'FEATURE_REQUEST', label: 'Feature Request' },
  { value: 'PERFORMANCE', label: 'Performance Issue' },
];

const sentiments: Array<{ value: SentimentRating; emoji: string; label: string }> = [
  { value: 'VERY_DISSATISFIED', emoji: '😭', label: 'Very Dissatisfied' },
  { value: 'DISSATISFIED', emoji: '☹️', label: 'Dissatisfied' },
  { value: 'SATISFIED', emoji: '🙂', label: 'Satisfied' },
  { value: 'VERY_SATISFIED', emoji: '🤩', label: 'Very Satisfied' },
];

export function UserFeedbackWidget({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [topic, setTopic] = useState<FeedbackTopic>('GENERAL');
  const [content, setContent] = useState('');
  const [sentiment, setSentiment] = useState<SentimentRating>('SATISFIED');
  const [state, setState] = useState<'idle' | 'submitting' | 'success'>('idle');
  const closeTimer = useRef<number | null>(null);

  useEffect(() => () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); }, []);

  function reset() {
    setTopic('GENERAL');
    setContent('');
    setSentiment('SATISFIED');
    setState('idle');
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && state !== 'submitting') {
      onOpenChange(false);
      reset();
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedContent = content.trim();
    if (!trimmedContent || state === 'submitting') return;
    setState('submitting');
    try {
      await submitFeedback({
        topic,
        content: trimmedContent,
        sentiment_rating: sentiment,
        page_url: window.location.href,
        metadata: {
          user_agent: window.navigator.userAgent,
          screen_resolution: `${window.screen.width}x${window.screen.height}`,
          app_version: '1.0.0',
        },
      });
      setState('success');
      closeTimer.current = window.setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 2000);
    } catch (error) {
      setState('idle');
      toast({ title: 'Feedback could not be sent', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    }
  }

  return <Popover open={open} onOpenChange={handleOpenChange}>
    <PopoverAnchor asChild><span className="pointer-events-none absolute bottom-12 left-3 size-px" aria-hidden="true" /></PopoverAnchor>
    <PopoverContent side="top" align="start" sideOffset={12} className="relative w-[min(360px,calc(100vw-1rem))] rounded-xl border-slate-200 bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => handleOpenChange(false)}
        disabled={state === 'submitting'}
        aria-label="Close feedback"
        title="Close"
        className="absolute right-2 top-2 z-10 grid size-9 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <X className="size-4" />
      </button>
      {state === 'success' ? <div className="grid min-h-64 place-items-center text-center" role="status"><div><span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"><CheckCircle2 className="size-6" /></span><p className="mt-4 text-base font-semibold text-slate-900 dark:text-zinc-100">🎉 Thank you for your feedback!</p><p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Your feedback helps us improve Prime OS.</p></div></div> : <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 pr-8"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><MessageSquareText className="size-4" /></span><div><h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Share feedback</h2><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-zinc-400">Tell us what would make Prime OS work better for you.</p></div></div>
        <div className="grid gap-2"><Label htmlFor="feedback-topic">Topic</Label><select id="feedback-topic" value={topic} disabled={state === 'submitting'} onChange={event => setTopic(event.target.value as FeedbackTopic)} className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option disabled value="">Select a topic...</option>{topicOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
        <div className="grid gap-2"><div className="flex items-center justify-between"><Label htmlFor="feedback-content">Your feedback</Label><span className={cn('text-[11px] tabular-nums', content.length >= 450 ? 'text-amber-600' : 'text-slate-400')}>{content.length}/500</span></div><Textarea id="feedback-content" value={content} disabled={state === 'submitting'} onChange={event => setContent(event.target.value)} maxLength={500} placeholder="Your feedback..." className="min-h-[100px] resize-none" autoFocus /></div>
        <div><Label id="sentiment-label">How do you feel?</Label><div className="mt-2 grid grid-cols-4 gap-2" role="radiogroup" aria-labelledby="sentiment-label">{sentiments.map(option => <button key={option.value} type="button" role="radio" aria-checked={sentiment === option.value} aria-label={option.label} title={option.label} disabled={state === 'submitting'} onClick={() => setSentiment(option.value)} className={cn('grid min-h-11 place-items-center rounded-lg border text-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50', sentiment === option.value ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-slate-200 hover:bg-slate-50 dark:border-zinc-700 dark:hover:bg-zinc-800')}>{option.emoji}</button>)}</div></div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-zinc-800"><p className="text-[10px] leading-4 text-slate-400">Page and device context will be attached.</p><Button type="submit" size="sm" disabled={!content.trim() || state === 'submitting'}>{state === 'submitting' ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}{state === 'submitting' ? 'Sending...' : 'Send'}</Button></div>
      </form>}
    </PopoverContent>
  </Popover>;
}
