import { ControlTowerKpiRow, ControlTowerKpiCard } from "@/components/dashboard/ControlTowerKpiRow";
import { HealthCard } from "@/components/dashboard/HealthCard";
import { PipelineCard } from "@/components/dashboard/PipelineCard";
import { AlertsFeed } from "@/components/dashboard/AlertsFeed";
import { ShoppingCart, PackageOpen, Boxes, Clock, Truck, HardHat, ArrowRight } from "lucide-react";
import type { DashboardDTO } from "@/lib/dashboard/types";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n/I18nContext";
import { formatLocalizedNumber } from "@/lib/i18n/format";

export function OperationsVariant({ data }: { data: DashboardDTO }) {
    const { locale, t } = useI18n();
    const alerts = data.alerts;

    return (
        <div className="flex animate-in fade-in slide-in-from-bottom-4 duration-500 flex-col gap-6">
            <ControlTowerKpiRow>
                <ControlTowerKpiCard
                    title={t('controlTower.pendingOrders')}
                    value={data.oms.pendingOrders}
                    zeroStateLabel={t('controlTower.zeroPendingOrders')}
                    icon={<ShoppingCart className="size-5 text-warning" />}
                    linkTo="/orders?status=pending"
                />
                <ControlTowerKpiCard
                    title={t('controlTower.totalAtsInventory')}
                    value={formatLocalizedNumber(locale, data.inventory.ats)}
                    secondaryValue={t('controlTower.units')}
                    icon={<Boxes className="size-5 text-primary" />}
                    linkTo="/inventory"
                />
                <ControlTowerKpiCard
                    title={t('controlTower.inboundReceipts')}
                    value={formatLocalizedNumber(locale, data.inventory.inbound)}
                    secondaryValue={t('controlTower.units')}
                    zeroStateLabel={t('controlTower.zeroInboundReceipts')}
                    icon={<PackageOpen className="size-5 text-chart-4" />}
                    linkTo="/inventory"
                />
                <ControlTowerKpiCard
                    title={t('controlTower.pickTimeP50')}
                    value={`${data.fulfillment.pickTimeP50}${t('controlTower.h')}`}
                    icon={<Clock className="size-5 text-success" />}
                    linkTo="/fulfillment"
                />
                <ControlTowerKpiCard
                    title={t('controlTower.packTimeP50')}
                    value={`${data.fulfillment.packTimeP50}${t('controlTower.h')}`}
                    icon={<HardHat className="size-5 text-chart-3" />}
                    linkTo="/fulfillment"
                />
                <ControlTowerKpiCard
                    title={t('controlTower.avgDeliveryTime')}
                    value={`${data.fulfillment.deliveryTimeAvg}${t('controlTower.d')}`}
                    zeroStateLabel={t('controlTower.zeroDeliveries')}
                    icon={<Truck className="size-5 text-chart-5" />}
                />
            </ControlTowerKpiRow>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PipelineCard
                    title={t('controlTower.orchestrationPipeline')}
                    stages={[
                        { label: t('controlTower.stageCreated'), count: data.oms.pipelineCounts.created, colorClass: "bg-primary" },
                        { label: t('controlTower.stageValidated'), count: data.oms.pipelineCounts.validated, colorClass: "bg-chart-5" },
                        { label: t('controlTower.stageAllocated'), count: data.oms.pipelineCounts.allocated, colorClass: "bg-chart-3" },
                        { label: t('controlTower.stageReserved'), count: data.oms.pipelineCounts.reserved, colorClass: "bg-chart-4" },
                        { label: t('controlTower.stageInFulfillment'), count: data.oms.pipelineCounts.fulfillment, colorClass: "bg-chart-2" },
                        { label: t('controlTower.stageShipped'), count: data.oms.pipelineCounts.shipped, colorClass: "bg-success" },
                        { label: t('controlTower.stageDelivered'), count: data.oms.pipelineCounts.delivered, colorClass: "bg-chart-1" },
                    ]}
                    linkTo="/orders"
                />

                <HealthCard
                    title={t('controlTower.inventoryByNode')}
                    metrics={[
                        { label: t('controlTower.totalNetworkAts'), value: formatLocalizedNumber(locale, data.inventory.ats) },
                        { label: t('controlTower.totalReserved'), value: formatLocalizedNumber(locale, data.inventory.reserved) },
                    ]}
                    linkTo="/warehouses"
                    linkText={t('controlTower.viewWarehouses')}
                >
                    <div className="flex mt-2 flex-col gap-3">
                        {data.inventory.nodes.map(n => (
                            <div key={n.nodeId} className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <div className={`size-2 rounded-full ${n.health === 'ok' ? 'bg-success' : n.health === 'warning' ? 'bg-warning' : 'bg-destructive'}`} />
                                    <span className="font-medium">{n.nodeName}</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-semibold">{formatLocalizedNumber(locale, n.ats)}</span> <span className="text-xs text-muted-foreground mr-2">{t('controlTower.ats')}</span>
                                    <span className="font-semibold text-warning">{formatLocalizedNumber(locale, n.reserved)}</span> <span className="text-xs text-muted-foreground">{t('controlTower.r')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </HealthCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader className="pb-3 border-b border-border">
                            <CardTitle className="text-base font-semibold">{t('controlTower.fulfillmentNodePerformance')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">{t('controlTower.colNode')}</th>
                                        <th className="px-4 py-3 font-medium">{t('controlTower.colShipSlaSuccess')}</th>
                                        <th className="px-4 py-3 font-medium text-right">{t('controlTower.colBacklog')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {data.fulfillment.nodePerformance.map(n => (
                                        <tr key={n.nodeId} className="hover:bg-muted/10 transition-colors">
                                            <td className="px-4 py-3 font-medium">{n.nodeName}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-semibold ${n.shipSlaPct < 95 ? 'text-warning' : 'text-success'}`}>{n.shipSlaPct}%</span>
                                                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                                                        <div className={`h-full ${n.shipSlaPct < 95 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${n.shipSlaPct}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold">{n.backlog > 0 ? <span className="text-destructive">{n.backlog}</span> : 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                        <CardFooter className="pt-3 pb-3 border-t border-border mt-auto">
                            <Link to="/fulfillment" className="text-xs font-medium text-primary hover:text-primary/80 flex items-center">
                                {t('controlTower.viewFulfillmentOps')} <ArrowRight className="ml-1 size-3" />
                            </Link>
                        </CardFooter>
                    </Card>
                </div>
                <div>
                    <AlertsFeed alerts={alerts} maxItems={6} />
                </div>
            </div>
        </div>
    );
}
