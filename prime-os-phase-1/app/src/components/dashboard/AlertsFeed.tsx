import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { AlertCircle, AlertTriangle, Info, BellRing, CheckCircle2 } from "lucide-react";
import type { ControlTowerAlert, AlertSeverity } from "@/lib/dashboard/types";
import { formatDistanceToNow } from "date-fns";
import { useI18n } from "@/lib/i18n/I18nContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertSeverityBadge } from "@/components/system/AlertSeverityBadge";
import { getAlertSeverityMeta, getSemanticSurfaceToneClassName } from "@/components/system/semantic-helpers";

interface Props {
    alerts: ControlTowerAlert[];
    maxItems?: number;
    loading?: boolean;
}

const severityIcons: Record<AlertSeverity, React.ReactNode> = {
    CRITICAL: <AlertCircle className="size-4" />,
    WARNING: <AlertTriangle className="size-4" />,
    INFO: <Info className="size-4" />
};

export function AlertsFeed({ alerts, maxItems, loading = false }: Props) {
    const { t } = useI18n();
    const displayAlerts = maxItems ? alerts.slice(0, maxItems) : alerts;

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                    <BellRing className="size-4 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">{t('controlTower.priorityAlerts')}</CardTitle>
                    <span className="ml-auto bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-semibold">
                        {alerts.length}
                    </span>
                </div>
            </CardHeader>

            <CardContent className="flex-1 p-4 overflow-y-auto">
                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="rounded-[1.25rem] border border-border/60 bg-muted/20 p-4">
                                <div className="flex items-start gap-3">
                                    <Skeleton className="size-10 rounded-2xl" />
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <Skeleton className="h-5 w-28 rounded-full" />
                                            <Skeleton className="h-3 w-16 rounded-full" />
                                        </div>
                                        <Skeleton className="h-4 w-3/4 rounded-full" />
                                        <Skeleton className="h-3 w-full rounded-full" />
                                        <div className="flex gap-2">
                                            <Skeleton className="h-5 w-20 rounded-full" />
                                            <Skeleton className="h-5 w-24 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : displayAlerts.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/6 px-6 py-10 text-center">
                        <CheckCircle2 className="size-8 mx-auto mb-3 text-emerald-600 dark:text-emerald-300" />
                        <p className="text-sm font-medium text-foreground">{t('controlTower.noPriorityAlerts')}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            No escalated action is required right now.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {displayAlerts.map(alert => {
                            const meta = getAlertSeverityMeta(alert.severity);
                            return (
                                <Link
                                    key={alert.id}
                                    to={alert.actionLink}
                                    className={cn(
                                        "group block rounded-[1.25rem] border p-4 transition-all duration-200 hover:border-primary/45 hover:bg-muted/18",
                                        meta.borderClassName,
                                        meta.surfaceClassName,
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl",
                                            getSemanticSurfaceToneClassName(meta.tone ?? 'muted'),
                                            meta.textClassName,
                                        )}>
                                            {severityIcons[alert.severity]}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <AlertSeverityBadge severity={alert.severity} />
                                                    <Badge variant="outline" className="text-[11px] font-medium">
                                                        {alert.tower}
                                                    </Badge>
                                                    {alert.entityRef ? (
                                                        <span className="rounded-full border border-border/70 bg-background/70 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                                                            {alert.entityRef}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <h4 className="mt-3 text-sm font-semibold leading-5 text-foreground group-hover:text-primary transition-colors">
                                                {alert.title}
                                            </h4>
                                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                                {alert.detail}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
