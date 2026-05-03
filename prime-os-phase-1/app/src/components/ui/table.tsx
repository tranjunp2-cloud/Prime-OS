import * as React from "react";

import { cn } from "@/lib/utils";

type TableVariant = "index" | "embedded" | "compact";

const TableContext = React.createContext<TableVariant>("index");

function useTableVariant() {
  return React.useContext(TableContext);
}

const variantClassMap: Record<TableVariant, {
  wrapper: string;
  table: string;
  head: string;
  row: string;
  cell: string;
}> = {
  index: {
    wrapper: "",
    table: "text-sm",
    head: "h-9 px-4 py-2 text-[11px]",
    row: "hover:bg-[hsl(var(--surface-row-hover))]",
    cell: "h-11 px-4 py-2 text-[15px]",
  },
  embedded: {
    wrapper: "",
    table: "text-sm",
    head: "h-9 px-4 py-2 text-[11px]",
    row: "hover:bg-[hsl(var(--surface-row-hover))]",
    cell: "h-11 px-4 py-2 text-[15px]",
  },
  compact: {
    wrapper: "",
    table: "text-xs",
    head: "h-8 px-3 py-1.5 text-[10px]",
    row: "hover:bg-[hsl(var(--surface-row-hover))]",
    cell: "h-9 px-3 py-1.5 text-xs",
  },
};

type TableProps = React.HTMLAttributes<HTMLTableElement> & {
  wrapperClassName?: string;
  variant?: TableVariant;
};

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, wrapperClassName, variant = "index", ...props }, ref) => (
    <TableContext.Provider value={variant}>
      <div
        data-table-variant={variant}
        className={cn("relative w-full overflow-x-auto scroll-smooth", "scrollbar-visible", variantClassMap[variant].wrapper, wrapperClassName)}
      >
        <table
          ref={ref}
          className={cn("w-full min-w-full caption-bottom", variantClassMap[variant].table, className)}
          {...props}
        />
      </div>
    </TableContext.Provider>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn("[&_tr]:border-b [&_tr]:border-border", className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => {
    const variant = useTableVariant();
    return (
      <tr
        ref={ref}
        className={cn(
          "prime-transition-fast border-b border-border/45 transition-colors data-[state=selected]:bg-[hsl(var(--surface-row-selected))]",
          variantClassMap[variant].row,
          className,
        )}
        {...props}
      />
    );
  },
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => {
    const variant = useTableVariant();
    return (
      <th
        ref={ref}
        className={cn(
          "sticky top-0 z-30 bg-[hsl(var(--surface-toolbar))] text-left align-middle font-semibold uppercase tracking-[0.08em] text-muted-foreground shadow-[inset_0_-1px_0_hsl(var(--border-divider))] [&:has([role=checkbox])]:pr-0",
          variantClassMap[variant].head,
          className,
        )}
        {...props}
      />
    );
  },
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => {
    const variant = useTableVariant();
    return (
      <td
        ref={ref}
        className={cn(variantClassMap[variant].cell, "align-middle [&:has([role=checkbox])]:pr-0", className)}
        {...props}
      />
    );
  },
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
export type { TableVariant };
