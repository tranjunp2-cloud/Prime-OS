import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  MessageCircle,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  faqArticles,
  faqCategories,
  faqWorkspaceLabels,
  getFaqArticle,
  getFaqCategory,
  type FaqWorkspace,
} from '@/lib/faq-data';

function isWorkspace(value: string | null): value is FaqWorkspace {
  return value === 'main' || value === 'pos' || value === 'primeweb' || value === 'inbox';
}

function toAnchor(value: string) {
  return value
    .toLowerCase()
    .replace(/\*\*/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function FaqArticle() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null);
  const article = getFaqArticle(slug);
  const contextWorkspace = searchParams.get('from_workspace');
  const validContext = isWorkspace(contextWorkspace) ? contextWorkspace : null;
  const contextSuffix = validContext ? `?from_workspace=${validContext}` : '';

  const tableOfContents = useMemo(() => article?.content
    .split('\n')
    .map((line) => {
      const match = /^(##|###)\s+(.+)$/.exec(line.trim());
      return match ? { level: match[1].length, label: match[2].replace(/\*\*/g, ''), id: toAnchor(match[2]) } : null;
    })
    .filter((item): item is { level: number; label: string; id: string } => Boolean(item)) ?? [], [article]);

  if (!article) {
    return (
      <div className="grid min-h-full place-items-center bg-background px-4 py-16">
        <div className="max-w-md text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl border border-border bg-card text-muted-foreground"><FileText className="size-5" /></span>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Article not found</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">This help article may have moved or is no longer available.</p>
          <Button asChild className="mt-5"><Link to={`/faq${contextSuffix}`}><ArrowLeft className="size-4" />Back to Help Center</Link></Button>
        </div>
      </div>
    );
  }

  const category = getFaqCategory(article.category);
  const articleHref = (articleSlug: string) => `/faq/${articleSlug}${contextSuffix}`;

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto flex min-h-14 max-w-[1600px] items-center justify-between gap-4 px-4 md:px-8">
          <Link to={`/faq${contextSuffix}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-4" aria-hidden="true" /> Help Center
          </Link>
          {validContext ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{faqWorkspaceLabels[validContext]} context</span>
          ) : null}
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] xl:grid-cols-[260px_minmax(0,1fr)_270px]">
        <aside className="hidden border-r border-border bg-muted/20 xl:block" aria-label="Help categories">
          <div className="sticky top-0 max-h-screen overflow-y-auto px-4 py-7">
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Browse help</p>
            <nav className="mt-3 space-y-4">
              {faqCategories.map((item) => {
                const categoryArticles = faqArticles.filter((candidate) => candidate.category === item.id && (!validContext || candidate.workspaces.includes(validContext)));
                if (!categoryArticles.length) return null;
                const activeCategory = item.id === article.category;
                return (
                  <div key={item.id}>
                    <p className={cn('px-2 py-1 text-xs font-semibold', activeCategory ? 'text-primary' : 'text-foreground/80')}>{item.name}</p>
                    <div className="mt-1 space-y-0.5 border-l border-border pl-2">
                      {categoryArticles.map((candidate) => {
                        const active = candidate.slug === article.slug;
                        return (
                          <Link key={candidate.slug} to={articleHref(candidate.slug)} className={cn('block rounded-md px-2 py-2 text-xs leading-5 transition-colors', active ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:bg-card hover:text-foreground')} aria-current={active ? 'page' : undefined}>
                            {candidate.title}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-8 md:px-10 md:py-10 xl:px-12">
          <div className="mx-auto max-w-3xl">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Link to={`/faq${contextSuffix}`} className="hover:text-primary">Help Center</Link>
              <ChevronRight className="size-3" aria-hidden="true" />
              <span>{category?.name}</span>
            </nav>

            <header className="border-b border-border pb-7 pt-5">
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{article.title}</h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground">{article.summary}</p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {article.tags.map((tag) => <span key={tag} className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-medium text-muted-foreground">{tag}</span>)}
                <span className="ml-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-3.5" />{article.read_time} min read · Updated {article.updated_at}</span>
              </div>
            </header>

            <article className="py-8 text-[15px] leading-7 text-foreground/85">
              <ReactMarkdown
                components={{
                  h2: ({ children }) => <h2 id={toAnchor(String(children))} className="scroll-mt-6 border-t border-border pt-8 first:border-t-0 first:pt-0 text-xl font-bold tracking-tight text-foreground">{children}</h2>,
                  h3: ({ children }) => <h3 id={toAnchor(String(children))} className="scroll-mt-6 pt-3 text-base font-bold text-foreground">{children}</h3>,
                  p: ({ children }) => <p className="mb-6 mt-3">{children}</p>,
                  ol: ({ children }) => <ol className="mb-7 mt-3 list-decimal space-y-2 pl-5 marker:font-semibold marker:text-muted-foreground">{children}</ol>,
                  ul: ({ children }) => <ul className="mb-7 mt-3 list-disc space-y-2 pl-5 marker:text-muted-foreground">{children}</ul>,
                  li: ({ children }) => <li className="pl-1">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  a: ({ href, children }) => href?.startsWith('/')
                    ? <Link to={href} className="font-medium text-primary underline underline-offset-4 hover:text-primary/80">{children}</Link>
                    : <a href={href} className="font-medium text-primary underline underline-offset-4 hover:text-primary/80">{children}</a>,
                }}
              >
                {article.content}
              </ReactMarkdown>
            </article>

            {article.related_settings_link ? (
              <div className="mb-8 rounded-xl border border-primary/30 bg-primary/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Take action in Prime OS</p>
                <p className="mt-2 text-sm text-foreground">Open the relevant workspace setting and apply the steps from this article.</p>
                <Button asChild className="mt-4"><Link to={article.related_settings_link.href}>{article.related_settings_link.label}<ArrowRight className="size-4" /></Link></Button>
              </div>
            ) : null}

            <section className="mb-12 rounded-xl border border-border bg-card px-5 py-6 text-center" aria-labelledby="feedback-title">
              {feedback ? (
                <div className="flex min-h-16 flex-col items-center justify-center"><span className="grid size-8 place-items-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"><Check className="size-4" /></span><p id="feedback-title" className="mt-2 font-semibold">Thanks for your feedback.</p><p className="mt-1 text-sm text-muted-foreground">It helps us improve Prime OS documentation.</p></div>
              ) : (
                <><h2 id="feedback-title" className="font-semibold text-foreground">Was this article helpful?</h2><div className="mt-4 flex justify-center gap-2"><Button type="button" variant="outline" onClick={() => setFeedback('yes')}><ThumbsUp className="size-4" />Yes</Button><Button type="button" variant="outline" onClick={() => setFeedback('no')}><ThumbsDown className="size-4" />No</Button></div></>
              )}
            </section>
          </div>
        </main>

        <aside className="hidden border-l border-border xl:block" aria-label="Article navigation and support">
          <div className="sticky top-0 space-y-6 px-5 py-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">On this page</p>
              <nav className="mt-3 space-y-1 border-l border-border pl-3">
                {tableOfContents.map((item) => (
                  <a key={item.id} href={`#${item.id}`} className={cn('block rounded-r-md py-1.5 text-xs leading-5 text-muted-foreground hover:text-primary', item.level === 3 && 'pl-3')}>{item.label}</a>
                ))}
              </nav>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><MessageCircle className="size-4" /></span>
              <h2 className="mt-4 font-bold text-foreground">Still need help?</h2>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">Continue with a customer support agent in Prime Inbox.</p>
              <Button asChild variant="outline" className="mt-4 w-full justify-between bg-background"><Link to="/inbox/conversation">Open Live Support Chat<ExternalLink className="size-4" /></Link></Button>
            </div>

            {article.related_doc_id ? (
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-5">
                <span className="grid size-9 place-items-center rounded-lg bg-background text-primary"><FileText className="size-4" /></span>
                <h2 className="mt-4 font-bold text-foreground">Learn how this works</h2>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">Read the product documentation for concepts, expected behavior, and the complete workflow.</p>
                <Button asChild variant="outline" className="mt-4 w-full justify-between bg-background"><Link to={`/docs?article=${article.related_doc_id}`}>Open documentation<ArrowRight className="size-4" /></Link></Button>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
