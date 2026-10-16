import { ChevronDown, Globe2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { OrgLocaleConfig } from '@/lib/product-catalog-settings-store';
import { cn } from '@/lib/utils';
import { ProductWorkspaceHeader } from './ProductWorkspaceHeader';
import styles from './ProductContentLanguage.module.css';

type LocaleStatus = 'primary' | 'complete' | 'partial' | 'missing';

export function ProductContentLanguage({ locales, current, getStatus, onSelect, readOnly = false, title = "Product data" }: {
  locales: OrgLocaleConfig[];
  current: string;
  getStatus: (locale: OrgLocaleConfig) => LocaleStatus;
  onSelect: (locale: string) => void;
  readOnly?: boolean;
  title?: string;
}) {
  const currentConfig = locales.find(item => item.locale === current);
  const translations = locales.filter(item => !item.isPrimary);
  const completeCount = translations.filter(item => getStatus(item) === 'complete').length;
  const completion = translations.length ? `Translations: ${completeCount}/${translations.length} complete` : 'Primary language only';
  const languageLabel = currentConfig?.label ?? current;
  const nativeLabel = currentConfig?.nativeLabel ?? current;
  const editingContext = `${readOnly ? 'Viewing' : 'Editing'} ${languageLabel}${currentConfig?.isPrimary ? ' · Primary content' : ' translation'}`;

  return (
    <ProductWorkspaceHeader
      title={title}
      accessibleName="Product content language"
      className={styles.header}
      help="Changes the language of the product name, description and translatable attributes only — not the interface, prices or currency. Missing translations do not block Master activation. Languages are managed by your organization."
      context={<p aria-live="polite" className="truncate" title={editingContext}>{editingContext}</p>}
      actions={<div className={styles.controls}>
        <div className={styles.selector}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" aria-label={`Content: ${nativeLabel}`} title={`Content: ${nativeLabel}`} className="h-11 min-h-11 w-auto min-w-0 max-w-full gap-2 whitespace-nowrap px-3 py-2 text-sm">
                <Globe2 className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate text-left"><span className={cn(styles.prefix, 'font-normal text-muted-foreground')}>Content: </span><span lang={current}>{nativeLabel}</span></span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" collisionPadding={12} className="w-72 max-w-[calc(100vw-1.5rem)] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto">
              <DropdownMenuLabel>Content language</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={current} onValueChange={onSelect} aria-label="Content language">
                {locales.map(item => {
                  const status = getStatus(item);
                  const statusLabel = item.isPrimary ? 'Primary' : status === 'complete' ? 'Complete' : status === 'partial' ? 'In progress' : 'Not translated';
                  return (
                    <DropdownMenuRadioItem key={item.locale} value={item.locale} aria-label={`${item.nativeLabel} ${statusLabel}`} className={cn('min-h-11 cursor-pointer gap-2 py-2', current === item.locale && 'bg-primary/5')}>
                      <span lang={item.locale} className="min-w-0 flex-1">{item.nativeLabel}</span>
                      {item.isPrimary ? <Badge variant="outline" className="text-xs font-normal">Primary</Badge> : (
                        <span className={cn('text-xs', status === 'complete' ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground')}>
                          {statusLabel}
                        </span>
                      )}
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <p className="px-2 py-2 text-xs leading-5 text-muted-foreground">{completion}</p>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="max-w-full truncate text-xs leading-5 text-muted-foreground" title={completion}>{completion}</p>
      </div>}
    />
  );
}
