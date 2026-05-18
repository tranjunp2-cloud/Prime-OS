import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToolbarSurface } from '@/components/system/surfaces/PanelSurfaces';
import { useI18n } from '@/lib/i18n/I18nContext';
import {
  getActiveFilterPillClassName,
  getInactiveFilterPillClassName,
} from '@/components/system/semantic-helpers';

export interface FilterPillOption {
  value: string;
  label: string;
  count?: number;
  activeClassName?: string;
  inactiveClassName?: string;
}

interface FilterGroupConfig {
  value: string;
  onChange: (value: string) => void;
  options: FilterPillOption[];
  label?: string;
  allowToggleOff?: boolean;
}

interface FilterSearchConfig {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onClear?: () => void;
  className?: string;
}

export interface FiltersBarProps {
  children?: ReactNode;
  className?: string;
  actions?: ReactNode;
  search?: FilterSearchConfig;
  primaryFilters?: FilterGroupConfig;
  secondaryFilters?: FilterGroupConfig;
  resultCount?: string;
  clearAll?: () => void;
}

function renderPillGroup(group: FilterGroupConfig, className?: string) {
  return (
    <div className={cn('flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 scrollbar-visible', className)}>
      {group.label && <span className="mr-1 flex-none text-xs text-muted-foreground">{group.label}</span>}
      {group.options.map((option) => {
        const isActive = group.value === option.value;
        return (
          <button
            key={option.value || 'all'}
            type="button"
            aria-pressed={isActive}
            onClick={() => {
              if (group.allowToggleOff && isActive) {
                group.onChange('');
                return;
              }
              group.onChange(option.value);
            }}
            className={cn(
              'flex-none rounded-full border px-3 py-1 text-xs transition-all touch-manipulation',
              isActive ? getActiveFilterPillClassName() : getInactiveFilterPillClassName(),
              isActive ? option.activeClassName : option.inactiveClassName,
            )}
          >
            {option.label}
            {option.count !== undefined ? ` (${option.count})` : ''}
          </button>
        );
      })}
    </div>
  );
}

export function FiltersBar({
  children,
  className,
  actions,
  search,
  primaryFilters,
  secondaryFilters,
  resultCount,
  clearAll,
}: FiltersBarProps) {
  const { t } = useI18n();
  const hasStructuredConfig = Boolean(search || primaryFilters || secondaryFilters || resultCount || clearAll);

  if (hasStructuredConfig) {
    return (
      <ToolbarSurface className={cn('px-4 py-4 sm:px-5', className)}>
        <div className="flex flex-col gap-3">
          {(search || actions || clearAll) && (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              {search && (
                <div className={cn('relative w-full max-w-xl flex-1', search.className)}>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={search.placeholder}
                    value={search.value}
                    onChange={(event) => search.onChange(event.target.value)}
                    className="pl-9 pr-9"
                  />
                  {search.value && (
                    <button
                      type="button"
                      aria-label={t('common.clearSearch')}
                      onClick={() => (search.onClear ? search.onClear() : search.onChange(''))}
                      className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              )}
            {(actions || clearAll) && (
              <div className="flex flex-wrap items-center gap-2 lg:ml-auto lg:justify-end">
                {actions}
                {clearAll && (
                  <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                    {t('common.clear')}
                  </Button>
                )}
              </div>
            )}
            </div>
          )}

          {primaryFilters && renderPillGroup(primaryFilters)}

          {(secondaryFilters || resultCount) && (
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              {secondaryFilters && renderPillGroup(secondaryFilters, 'lg:flex-1')}
              {resultCount && <span className="text-xs text-muted-foreground lg:pl-4">{resultCount}</span>}
            </div>
          )}
        </div>
      </ToolbarSurface>
    );
  }

  return (
    <ToolbarSurface
      className={cn(
        'flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between',
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </ToolbarSurface>
  );
}
