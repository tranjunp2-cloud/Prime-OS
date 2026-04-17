import type { ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/system/EmptyState';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageDataStateProps<T> {
  /** Data returned from useQuery */
  data: T | undefined;
  /** isLoading from useQuery */
  isLoading: boolean;
  /** error from useQuery */
  error: Error | null;
  /** refetch function from useQuery */
  refetch: () => void;
  /** Title for empty state */
  emptyTitle?: string;
  /** Description for empty state */
  emptyDescription?: string;
  /** Custom check if data is "empty" (e.g. array length === 0) */
  isEmpty?: (data: T) => boolean;
  /** Custom skeleton to render during initial load */
  skeleton?: ReactNode;
  /** Icon for empty state */
  emptyIcon?: ReactNode;
  /** Render density */
  mode?: 'page' | 'section';
  className?: string;
  /** Render function — only called when data exists */
  children: (data: T) => ReactNode;
}

/**
 * Standardized data state handler following react-ui-patterns Golden Rule:
 * 1. Error? → Show error with retry
 * 2. Loading AND no cached data? → Show skeleton
 * 3. Data empty? → Show empty state
 * 4. Data exists? → Render children(data)
 *
 * IMPORTANT: Does NOT show loading indicator during background refetches
 * when cached data already exists. This prevents UI "flash" on tab switches.
 */
export function PageDataState<T>({
  data,
  isLoading,
  error,
  refetch,
  emptyTitle = "No data yet",
  emptyDescription,
  isEmpty,
  skeleton,
  emptyIcon,
  mode = 'page',
  className,
  children,
}: PageDataStateProps<T>) {
  // 1. Error state — always show first
  if (error && !data) {
    return (
      <div className={cn(
        'flex min-h-[200px] flex-col items-center justify-center rounded-[1.75rem] border border-border/60 bg-card px-6 py-12 text-center',
        className,
      )}>
        <AlertCircle className="mb-4 size-10 text-destructive" />
        <h3 className="mb-1 text-base font-semibold">Something went wrong</h3>
        <p className="mb-4 max-w-md text-sm text-muted-foreground">
          {error.message || "Failed to load data. Please try again."}
        </p>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCcw className="size-4 mr-2" />
          Try again
        </Button>
      </div>
    );
  }

  // 2. Loading state — ONLY when no cached data exists
  if (isLoading && !data) {
    if (skeleton) return <>{skeleton}</>;
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        <div className={cn(
          'grid gap-4',
          mode === 'page' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2',
        )}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-[1.5rem]" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-[1.5rem]" />
      </div>
    );
  }

  // 3. No data at all (shouldn't happen often, but safety fallback)
  if (!data) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        variant="unavailable"
        className={className}
      />
    );
  }

  // 4. Data exists but is empty
  if (isEmpty && isEmpty(data)) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        variant="empty"
        className={className}
      />
    );
  }

  // 5. Render content with data
  return <>{children(data)}</>;
}
