import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import styles from './ProductWorkspaceHeader.module.css';

/** One heading level and action area for every Product Master workspace. */
export function ProductWorkspaceHeader({ title, accessibleName, context, help, badge, actions }: {
  title: string;
  accessibleName?: string;
  context?: ReactNode;
  help?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return <section aria-label={accessibleName ?? `${title} header`} data-testid="product-workspace-header" className={styles.header}>
    <div className={styles.identity}>
      <div className={styles.titleRow}>
        <h2 className={styles.title}>{title}</h2>
        {badge}
        {help && <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground" aria-label={`About ${title.toLowerCase()}`}>
                <Info className="size-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-72 text-xs leading-5">{help}</TooltipContent>
          </Tooltip>
        </TooltipProvider>}
      </div>
      {context && <div className={styles.context}>{context}</div>}
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </section>;
}
