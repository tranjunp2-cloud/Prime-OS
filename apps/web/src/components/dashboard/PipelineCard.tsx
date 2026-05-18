import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface PipelineStage {
    label: string;
    count: number;
    colorClass: string;
}

interface Props {
    title: string;
    stages: PipelineStage[];
    linkTo: string;
}

export function PipelineCard({ title, stages, linkTo }: Props) {
    const { t } = useI18n();
    const max = Math.max(...stages.map(s => s.count), 1); // avoid dist by 0

    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">{title}</CardTitle>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-3">
                {stages.map((stage, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="w-24 text-xs font-medium text-muted-foreground shrink-0">{stage.label}</div>
                        <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden flex items-center">
                            <div
                                className={`h-full ${stage.colorClass} transition-all duration-500`}
                                style={{ width: `${(stage.count / max) * 100}%` }}
                            />
                        </div>
                        <div className="w-12 text-sm font-bold text-right shrink-0">{stage.count}</div>
                    </div>
                ))}
            </CardContent>

            <CardFooter className="pt-2 pb-4 border-t border-border mt-auto">
                <Link
                    to={linkTo}
                    className="text-xs font-medium text-primary hover:text-primary/80 flex items-center transition-colors"
                >
                    {t('controlTower.viewFullPipeline')}
                    <ArrowRight className="ml-1 size-3" />
                </Link>
            </CardFooter>
        </Card>
    );
}
