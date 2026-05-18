import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { SummaryMetricCard } from "@/components/system/SummaryMetricCard";
import { cn } from "@/lib/utils";

interface KpiProps {
    title: string;
    value: string | number;
    secondaryValue?: string;
    zeroStateLabel?: string;
    trend?: { value: number; label: string };
    icon: ReactNode;
    linkTo?: string;
}

export function ControlTowerKpiCard({ title, value, secondaryValue, zeroStateLabel, trend, icon, linkTo }: KpiProps) {
    const isPositive = trend && trend.value > 0;
    const isNegative = trend && trend.value < 0;
    const isNeutral = trend && trend.value === 0;
    const tone = trend ? (isPositive ? "success" : isNegative ? "danger" : "info") : "muted";
    const isZeroState = typeof value === 'number' && value === 0;
    const meta = isZeroState ? zeroStateLabel : secondaryValue;

    const content = (
        <SummaryMetricCard
            className={cn("h-full transition-colors", linkTo && "hover:border-primary/50")}
            label={title}
            value={
                <div className="flex items-baseline gap-2">
                    <span>{value}</span>
                    {secondaryValue && !isZeroState ? (
                        <span className="text-sm font-medium text-muted-foreground">{secondaryValue}</span>
                    ) : null}
                </div>
            }
            meta={meta}
            status={trend ? (
                <div className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-medium",
                    isPositive ? "text-emerald-700 dark:text-emerald-300" : isNegative ? "text-rose-700 dark:text-rose-300" : "text-muted-foreground",
                )}>
                    {isPositive && <ArrowUpRight className="size-3" />}
                    {isNegative && <ArrowDownRight className="size-3" />}
                    {isNeutral && <Minus className="size-3" />}
                    <span>{Math.abs(trend.value)}%</span>
                    <span className="font-normal text-muted-foreground">{trend.label}</span>
                </div>
            ) : null}
            icon={icon}
            tone={tone}
        />
    );

    if (linkTo) {
        return <Link to={linkTo} className="block h-full">{content}</Link>;
    }
    return content;
}

export function ControlTowerKpiRow({ children }: { children: ReactNode }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {children}
        </div>
    );
}
