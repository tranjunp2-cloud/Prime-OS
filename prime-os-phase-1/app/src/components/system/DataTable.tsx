import { type KeyboardEvent, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    type TableVariant,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "./EmptyState"
import { cn } from "@/lib/utils"

export interface Column<T> {
    header: ReactNode
    accessor_key?: keyof T
    cell?: (item: T) => ReactNode
    className?: string
    headerClassName?: string
    cellClassName?: string
    width?: string
}

export interface DataTableProps<T> {
    columns: Column<T>[]
    data: T[]
    keyExtractor: (item: T) => string
    isLoading?: boolean
    emptyState?: ReactNode
    onRowClick?: (item: T) => void
    totalCount?: number
    className?: string
    variant?: TableVariant
    wrapperClassName?: string
    rowClassName?: string | ((item: T) => string)
    rowHref?: (item: T) => string | undefined
    rowState?: (item: T) => unknown
    rowLabel?: (item: T) => string
    emptyTitle?: string
    emptyDescription?: string
    emptyVariant?: 'empty' | 'filtered' | 'unavailable' | 'error'
}

export function DataTable<T>({
    columns,
    data,
    keyExtractor,
    isLoading,
    emptyState,
    onRowClick,
    totalCount,
    className,
    variant = "index",
    wrapperClassName,
    rowClassName,
    rowHref,
    rowState,
    rowLabel,
    emptyTitle = "No records found",
    emptyDescription = "There is no data to display right now.",
    emptyVariant = "empty",
}: DataTableProps<T>) {
    const navigate = useNavigate()
    const resolvedWrapperClassName = cn(
        variant === "index" && "max-h-[55vh] overflow-y-auto overscroll-contain lg:max-h-[60vh]",
        wrapperClassName,
    )

    function isInteractiveTarget(target: EventTarget | null) {
        return target instanceof HTMLElement && Boolean(
            target.closest('a, button, input, select, textarea, [role="button"]')
        )
    }

    function handleRowAction(item: T) {
        const href = rowHref?.(item)
        if (href) {
            navigate(href, { state: rowState?.(item) })
            return
        }
        onRowClick?.(item)
    }

    function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, item: T) {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        handleRowAction(item)
    }

    if (isLoading) {
        const skeletonClass = variant === "compact" ? "h-9 rounded-md" : variant === "embedded" ? "h-12 rounded-md" : "h-[78px] rounded-lg";

        return (
            <div className="flex w-full flex-col gap-2">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className={cn("w-full", skeletonClass)} />
                ))}
            </div>
        )
    }

    return (
        <div className={cn("space-y-4", className)}>
            {totalCount !== undefined && (
                <p className="text-sm text-muted-foreground px-1">
                    Showing {data.length} of {totalCount} records
                </p>
            )}

            {data.length === 0 ? (
                emptyState || (
                    <EmptyState
                        title={emptyTitle}
                        description={emptyDescription}
                        variant={emptyVariant}
                    />
                )
            ) : (
                <div className="surface-solid overflow-hidden rounded-xl">
                    <Table variant={variant} wrapperClassName={resolvedWrapperClassName}>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                {columns.map((col, i) => (
                                    <TableHead
                                        key={i}
                                        className={cn(col.className, col.headerClassName)}
                                        style={{ width: col.width }}
                                    >
                                        {col.header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item) => {
                                const interactive = Boolean(onRowClick || rowHref?.(item));
                                const computedRowClassName = typeof rowClassName === "function" ? rowClassName(item) : rowClassName;
                                const href = rowHref?.(item);

                                return (
                                    <TableRow
                                        key={keyExtractor(item)}
                                        onClick={(event) => {
                                            if (!interactive || isInteractiveTarget(event.target)) return;
                                            handleRowAction(item);
                                        }}
                                        onKeyDown={interactive ? (event) => handleRowKeyDown(event, item) : undefined}
                                        tabIndex={interactive ? 0 : undefined}
                                        aria-label={rowLabel?.(item)}
                                        className={cn(
                                            interactive && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80",
                                            href && "group",
                                            computedRowClassName,
                                        )}
                                    >
                                        {columns.map((col, i) => (
                                            <TableCell key={i} className={cn(col.className, col.cellClassName)}>
                                                {col.cell
                                                    ? col.cell(item)
                                                    : col.accessor_key
                                                        ? (item[col.accessor_key] as ReactNode)
                                                        : null}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
