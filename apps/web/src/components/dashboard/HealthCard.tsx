import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface HealthMetric {
    label: string;
    value: string | number;
    subtext?: string;
    status?: "ok" | "warning" | "critical";
}

interface Props {
    title: string;
    description?: string;
    metrics: HealthMetric[];
    linkTo: string;
    linkText?: string;
    children?: React.ReactNode;
}

export function HealthCard({ title, description, metrics, linkTo, linkText, children }: Props) {
    const { t } = useI18n();
    const resolvedLinkText = linkText || t('common.viewDetails');

    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">{title}</CardTitle>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-4">
                {/* Top metrics summary layout */}
                <div className="grid grid-cols-2 gap-4">
                    {metrics.map((m, i) => (
                        <div key={i} className="flex block flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-xl font-bold ${m.status === 'critical' ? 'text-destructive' :
                                    m.status === 'warning' ? 'text-warning' :
                                        'text-foreground'
                                    }`}>
                                    {m.value}
                                </span>
                            </div>
                            {m.subtext && <p className="text-[10px] text-muted-foreground">{m.subtext}</p>}
                        </div>
                    ))}
                </div>

                {/* Optional body content, like lists or progress bars */}
                {children && (
                    <div className="mt-2 pt-4 border-t border-border">
                        {children}
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-2 pb-4">
                <Link
                    to={linkTo}
                    className="text-xs font-medium text-primary hover:text-primary/80 flex items-center transition-colors"
                >
                    {resolvedLinkText}
                    <ArrowRight className="ml-1 size-3" />
                </Link>
            </CardFooter>
        </Card>
    );
}
