import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileText,
  Info,
  Megaphone,
  PackageCheck,
  Radar,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Store,
  TrendingUp,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PartnerWorkspacePanel } from '@/components/prime/PartnerWorkspacePanel';
import { getPartnerWorkspaceSummary } from '@/lib/prime/partner-workspace';
import { getPrimeSnapshot, getSkuProductName } from '@/lib/prime/prime-data';
import { useI18n } from '@/lib/i18n/I18nContext';
import type { Locale } from '@/lib/i18n/dictionaries';

const currency = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const suiteReadinessChartConfig = {
  readiness: {
    label: 'Readiness',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

type OperatingStatus = 'Ready' | 'Watch' | 'Critical';
type OperatingMode = 'command' | 'investigate' | 'audit';
type ProofTimelineType = string;
type StatusTone = 'normal' | 'quiet';

type PriorityAction = {
  id: string;
  title: string;
  owner: string;
  object: string;
  reason: string;
  due: string;
  risk: OperatingStatus;
  impact: string;
  href: string;
  cta: string;
  evidence: string;
  blocker: string;
  sla: string;
  whyNow: string;
};

type RiskFlowItem = {
  area: string;
  stage: string;
  title: string;
  status: OperatingStatus;
  owner: string;
  entity: string;
  dependency: string;
  signal: string;
  href: string;
};

type HealthMetric = {
  label: string;
  value: string;
  status: OperatingStatus;
  context: string;
  cause: string;
  href: string;
  icon: LucideIcon;
};

type AreaStatusItem = {
  area: string;
  status: OperatingStatus;
  summary: string;
  metric: string;
  blocker: string;
  readiness: number;
  href: string;
  action: string;
  icon: LucideIcon;
  risks: number;
};

type QuickLinkItem = {
  label: string;
  href: string;
  count?: string;
  status?: OperatingStatus;
};

type QuickLinkGroup = {
  suite: string;
  summary: string;
  icon: LucideIcon;
  links: QuickLinkItem[];
};

type EvidenceItem = {
  label: string;
  value: string;
  detail: string;
  status: OperatingStatus;
};

type ActivityItem = {
  id: string;
  source: string;
  object: string;
  detail: string;
  time: string;
};

type ProofTimelineItem = {
  id: string;
  type: ProofTimelineType;
  source: string;
  object: string;
  detail: string;
  time: string;
  status: OperatingStatus;
  href?: string;
};

const overviewCopy = {
  'en-US': {
    moreInformation: 'More information',
    today: 'Today',
    thisWeek: 'This week',
    nextRun: 'Next run',
    noBlocker: 'No blocker',
    monitorMode: 'Monitor mode',
    generalDashboard: 'General Dashboard',
    liveConsole: 'Live console',
    crossSuiteSnapshot: 'General Dashboard / Cross-suite snapshot',
    reviewDashboard: 'Review dashboard',
    askPrimeAi: 'Ask Prime AI',
    primarySignal: 'Primary signal',
    primarySignalInfo: 'The most urgent cross-suite signal currently affecting PrimeOS readiness.',
    operatingSystem: 'Operating system',
    noActiveDependencyPressure: 'No active dependency pressure.',
    owner: 'Owner',
    object: 'Object',
    mode: 'Mode',
    monitor: 'monitor',
    exposure: 'Exposure',
    system: 'System',
    blocked: 'blocked',
    suiteHealth: 'Suite health',
    suiteHealthInfo: 'Readiness comparison across PrimeOS suites. Each row links to the owner module.',
    crossSuiteFlow: 'Cross-suite flow',
    crossSuiteFlowInfo: 'Risk path from inventory through demand, order fulfillment, customer trust, and finance exposure.',
    active: 'active',
    crossSuiteKpis: 'Cross-suite KPIs',
    crossSuiteKpisInfo: 'Compact operating signals with links back to owner modules.',
    indicators: 'indicators',
    quickAccess: 'Quick access',
    quickAccessInfo: 'Jump into the suite, product, or function that owns the current signal without reopening the sidebar.',
    suites: 'suites',
    topPriorities: 'Top 3 Priorities',
    topPrioritiesInfo: 'Owner route, reason, and impact. Details expand only when needed.',
    visible: 'visible',
    secondaryActionTree: 'Secondary action tree',
    details: 'Details',
    blocker: 'Blocker',
    sla: 'SLA',
    evidence: 'Evidence',
    operatorMode: 'Operator mode',
    operatorModeInfo: {
      command: 'Action-first: mission, top 3, health, consequence flow.',
      investigate: 'Evidence-first: owners, blockers, dependencies, source detail.',
      audit: 'Traceability-first: timeline, events, evidence stack.',
    },
    command: 'command',
    investigate: 'investigate',
    audit: 'audit',
    dependencyRiskFlow: 'Dependency Risk Flow',
    dependencyRiskFlowInfo: 'Business consequence order; severity stays as metadata.',
    dependencyDetail: 'Dependency detail',
    areaStatus: 'Area status',
    proofTimeline: 'Proof timeline',
    legacyEvidence: 'Evidence stack',
    checkInventory: 'Check inventory',
    openService: 'Open service',
    reviewDecision: 'Review decision',
    openQueue: 'Open queue',
    reviewFinance: 'Review finance',
    reviewDecisions: 'Review decisions',
    openCampaigns: 'Open campaigns',
    checkCos: 'Check COS',
    openCrm: 'Open CRM',
    reviewRisk: 'Review risk',
    revenueAtRisk: 'Revenue at risk',
    demandReadiness: 'Demand readiness',
    inventoryPressure: 'Inventory pressure',
    ordersAtRisk: 'Orders at risk',
    customerIssues: 'Customer issues',
    stockSignals: 'stock signals',
    orderSignals: 'order signals',
    reach: 'reach',
    leads: 'leads',
    rfqs: 'RFQs',
    totalOrders: 'total orders',
    highPriority: 'high priority',
    critical: 'critical',
    noCriticalSku: 'No critical SKU',
    activeSignals: 'active signals',
    campaigns: 'campaigns',
    inventoryRows: 'inventory rows',
    profiles: 'profiles',
    readiness: 'readiness',
    openTickets: 'open tickets',
    products: 'products',
    ordersNeedWatch: 'orders need watch',
    capitalGuardrailReady: 'Capital guardrail ready',
    readinessBelowScaleThreshold: 'Readiness below scale threshold',
    noActiveBlocker: 'No active blocker',
    inventory: 'Inventory',
    demand: 'Demand',
    ecomCos: 'Ecom / COS',
    finance: 'Finance',
    customer: 'Customer',
    intelligence: 'Intelligence',
    campaignReadiness: 'Campaign Readiness',
    orderFulfillment: 'Order Fulfillment',
    revenueExposure: 'Revenue Exposure',
    customerTrustSla: 'Customer Trust / SLA',
    serviceRecoveryTrust: 'Service recovery → Trust',
    inventoryToCampaign: 'Inventory → Campaign readiness',
    campaignToOrder: 'Campaign readiness → Order fulfillment',
    orderToRevenue: 'Order fulfillment → Revenue exposure',
    revenueToCustomer: 'Revenue exposure → Customer trust',
    operationAgent: 'Operation Agent',
    kpiDashboard: 'KPI Dashboard',
    signalsBoard: 'Signals Board',
    launchDecisions: 'Launch Decisions',
    inventoryBrain: 'Inventory Brain',
    orders: 'Orders',
    fulfillment: 'Fulfillment',
    composer: 'Composer',
    calendar: 'Calendar',
    activationPlays: 'Activation Plays',
    finSupport: 'Fin Support',
    reviewRoutes: 'Review Routes',
    blockers: 'Blockers',
    crmCompact: 'CRM Compact',
    service: 'Service',
    customerProfile: 'Customer Profile',
    currentProof: 'Current proof',
    ownerAction: 'Owner Action',
    event: 'Event',
    decision: 'Decision',
  },
  'ja-JP': {
    moreInformation: '詳細情報',
    today: '本日',
    thisWeek: '今週',
    nextRun: '次回実行',
    noBlocker: 'ブロッカーなし',
    monitorMode: '監視モード',
    generalDashboard: '総合ダッシュボード',
    liveConsole: 'ライブコンソール',
    crossSuiteSnapshot: '総合ダッシュボード / クロススイートスナップショット',
    reviewDashboard: 'ダッシュボードを確認',
    askPrimeAi: 'Prime AIに相談',
    primarySignal: '主要シグナル',
    primarySignalInfo: '現在のPrimeOS準備状況に影響する最重要クロススイートシグナルです。',
    operatingSystem: '運用システム',
    noActiveDependencyPressure: '現在アクティブな依存圧力はありません。',
    owner: '担当',
    object: '対象',
    mode: 'モード',
    monitor: '監視',
    exposure: 'エクスポージャー',
    system: 'システム',
    blocked: '件ブロック',
    suiteHealth: 'スイートヘルス',
    suiteHealthInfo: 'PrimeOS各スイートの準備度比較です。各行は担当モジュールへリンクします。',
    crossSuiteFlow: 'クロススイートフロー',
    crossSuiteFlowInfo: '在庫、需要、受注、顧客信頼、財務リスクまでのリスク経路です。',
    active: 'アクティブ',
    crossSuiteKpis: 'クロススイートKPI',
    crossSuiteKpisInfo: '担当モジュールへ戻れるコンパクトな運用シグナルです。',
    indicators: '指標',
    quickAccess: 'クイックアクセス',
    quickAccessInfo: 'サイドバーを開かず、現在のシグナルを担当するスイート、プロダクト、機能へ移動します。',
    suites: 'スイート',
    topPriorities: '上位3優先事項',
    topPrioritiesInfo: '担当ルート、理由、影響。詳細は必要時のみ展開します。',
    visible: '表示中',
    secondaryActionTree: '二次アクションツリー',
    details: '詳細',
    blocker: 'ブロッカー',
    sla: 'SLA',
    evidence: '根拠',
    operatorMode: 'オペレーターモード',
    operatorModeInfo: {
      command: 'アクション優先: ミッション、上位3件、ヘルス、影響フロー。',
      investigate: '根拠優先: 担当、ブロッカー、依存関係、ソース詳細。',
      audit: 'トレーサビリティ優先: タイムライン、イベント、根拠スタック。',
    },
    command: 'コマンド',
    investigate: '調査',
    audit: '監査',
    dependencyRiskFlow: '依存リスクフロー',
    dependencyRiskFlowInfo: 'ビジネス影響の順序です。深刻度はメタデータとして保持されます。',
    dependencyDetail: '依存詳細',
    areaStatus: 'エリアステータス',
    proofTimeline: '証跡タイムライン',
    legacyEvidence: '根拠スタック',
    checkInventory: '在庫を確認',
    openService: 'サービスを開く',
    reviewDecision: '判断を確認',
    openQueue: 'キューを開く',
    reviewFinance: '財務を確認',
    reviewDecisions: '判断を確認',
    openCampaigns: 'キャンペーンを開く',
    checkCos: 'COSを確認',
    openCrm: 'CRMを開く',
    reviewRisk: 'リスクを確認',
    revenueAtRisk: 'リスク収益',
    demandReadiness: '需要準備度',
    inventoryPressure: '在庫圧力',
    ordersAtRisk: 'リスク注文',
    customerIssues: '顧客課題',
    stockSignals: '在庫シグナル',
    orderSignals: '注文シグナル',
    reach: 'リーチ',
    leads: 'リード',
    rfqs: 'RFQ',
    totalOrders: '総注文',
    highPriority: '高優先度',
    critical: '重大',
    noCriticalSku: '重大SKUなし',
    activeSignals: 'アクティブシグナル',
    campaigns: 'キャンペーン',
    inventoryRows: '在庫行',
    profiles: 'プロファイル',
    readiness: '準備度',
    openTickets: '未解決チケット',
    products: '商品',
    ordersNeedWatch: '監視対象注文',
    capitalGuardrailReady: '資金ガードレール準備完了',
    readinessBelowScaleThreshold: '拡大基準を下回る準備度',
    noActiveBlocker: 'アクティブなブロッカーなし',
    inventory: '在庫',
    demand: '需要',
    ecomCos: 'Ecom / COS',
    finance: '財務',
    customer: '顧客',
    intelligence: 'インテリジェンス',
    campaignReadiness: 'キャンペーン準備',
    orderFulfillment: '受注フルフィルメント',
    revenueExposure: '収益エクスポージャー',
    customerTrustSla: '顧客信頼 / SLA',
    serviceRecoveryTrust: 'サービス復旧 → 信頼',
    inventoryToCampaign: '在庫 → キャンペーン準備',
    campaignToOrder: 'キャンペーン準備 → 受注フルフィルメント',
    orderToRevenue: '受注フルフィルメント → 収益エクスポージャー',
    revenueToCustomer: '収益エクスポージャー → 顧客信頼',
    operationAgent: 'オペレーションエージェント',
    kpiDashboard: 'KPIダッシュボード',
    signalsBoard: 'シグナルボード',
    launchDecisions: 'ローンチ判断',
    inventoryBrain: '在庫ブレイン',
    orders: '注文',
    fulfillment: 'フルフィルメント',
    composer: 'コンポーザー',
    calendar: 'カレンダー',
    activationPlays: 'アクティベーション施策',
    finSupport: '財務サポート',
    reviewRoutes: '審査ルート',
    blockers: 'ブロッカー',
    crmCompact: 'CRMコンパクト',
    service: 'サービス',
    customerProfile: '顧客プロファイル',
    currentProof: '現在の根拠',
    ownerAction: '担当アクション',
    event: 'イベント',
    decision: '判断',
  },
  'vi-VN': {
    moreInformation: 'Thông tin thêm',
    today: 'Hôm nay',
    thisWeek: 'Tuần này',
    nextRun: 'Lần chạy tiếp theo',
    noBlocker: 'Không có điểm chặn',
    monitorMode: 'Chế độ giám sát',
    generalDashboard: 'Bảng điều khiển tổng quan',
    liveConsole: 'Bảng vận hành trực tiếp',
    crossSuiteSnapshot: 'Bảng điều khiển tổng quan / Ảnh chụp liên bộ phận',
    reviewDashboard: 'Xem dashboard',
    askPrimeAi: 'Hỏi Prime AI',
    primarySignal: 'Tín hiệu chính',
    primarySignalInfo: 'Tín hiệu liên bộ phận quan trọng nhất đang ảnh hưởng tới mức sẵn sàng PrimeOS.',
    operatingSystem: 'Hệ thống vận hành',
    noActiveDependencyPressure: 'Không có áp lực phụ thuộc đang hoạt động.',
    owner: 'Phụ trách',
    object: 'Đối tượng',
    mode: 'Chế độ',
    monitor: 'giám sát',
    exposure: 'Rủi ro giá trị',
    system: 'Hệ thống',
    blocked: 'bị chặn',
    suiteHealth: 'Sức khỏe bộ phận',
    suiteHealthInfo: 'So sánh mức sẵn sàng giữa các bộ phận PrimeOS. Mỗi dòng mở module phụ trách.',
    crossSuiteFlow: 'Luồng liên bộ phận',
    crossSuiteFlowInfo: 'Đường rủi ro từ tồn kho qua demand, xử lý đơn, niềm tin khách hàng và tài chính.',
    active: 'đang hoạt động',
    crossSuiteKpis: 'KPI liên bộ phận',
    crossSuiteKpisInfo: 'Tín hiệu vận hành gọn, có link về module phụ trách.',
    indicators: 'chỉ số',
    quickAccess: 'Truy cập nhanh',
    quickAccessInfo: 'Đi tới bộ phận, sản phẩm hoặc chức năng đang sở hữu tín hiệu hiện tại mà không mở sidebar.',
    suites: 'bộ phận',
    topPriorities: '3 ưu tiên hàng đầu',
    topPrioritiesInfo: 'Route phụ trách, lý do và tác động. Chi tiết chỉ mở khi cần.',
    visible: 'đang hiển thị',
    secondaryActionTree: 'Cây hành động phụ',
    details: 'Chi tiết',
    blocker: 'Điểm chặn',
    sla: 'SLA',
    evidence: 'Bằng chứng',
    operatorMode: 'Chế độ operator',
    operatorModeInfo: {
      command: 'Ưu tiên hành động: mission, top 3, health, luồng hệ quả.',
      investigate: 'Ưu tiên bằng chứng: owner, blocker, phụ thuộc, chi tiết nguồn.',
      audit: 'Ưu tiên truy vết: timeline, event, stack bằng chứng.',
    },
    command: 'điều khiển',
    investigate: 'điều tra',
    audit: 'kiểm toán',
    dependencyRiskFlow: 'Luồng rủi ro phụ thuộc',
    dependencyRiskFlowInfo: 'Thứ tự hệ quả kinh doanh; mức nghiêm trọng giữ như metadata.',
    dependencyDetail: 'Chi tiết phụ thuộc',
    areaStatus: 'Trạng thái khu vực',
    proofTimeline: 'Timeline chứng cứ',
    legacyEvidence: 'Stack bằng chứng',
    checkInventory: 'Kiểm tra tồn kho',
    openService: 'Mở service',
    reviewDecision: 'Xem quyết định',
    openQueue: 'Mở queue',
    reviewFinance: 'Xem tài chính',
    reviewDecisions: 'Xem quyết định',
    openCampaigns: 'Mở campaign',
    checkCos: 'Kiểm tra COS',
    openCrm: 'Mở CRM',
    reviewRisk: 'Xem rủi ro',
    revenueAtRisk: 'Doanh thu rủi ro',
    demandReadiness: 'Mức sẵn sàng demand',
    inventoryPressure: 'Áp lực tồn kho',
    ordersAtRisk: 'Đơn hàng rủi ro',
    customerIssues: 'Vấn đề khách hàng',
    stockSignals: 'tín hiệu tồn kho',
    orderSignals: 'tín hiệu đơn hàng',
    reach: 'reach',
    leads: 'lead',
    rfqs: 'RFQ',
    totalOrders: 'tổng đơn',
    highPriority: 'ưu tiên cao',
    critical: 'nghiêm trọng',
    noCriticalSku: 'Không có SKU nghiêm trọng',
    activeSignals: 'tín hiệu hoạt động',
    campaigns: 'campaign',
    inventoryRows: 'dòng tồn kho',
    profiles: 'hồ sơ',
    readiness: 'sẵn sàng',
    openTickets: 'ticket mở',
    products: 'sản phẩm',
    ordersNeedWatch: 'đơn cần theo dõi',
    capitalGuardrailReady: 'Guardrail vốn đã sẵn sàng',
    readinessBelowScaleThreshold: 'Mức sẵn sàng dưới ngưỡng scale',
    noActiveBlocker: 'Không có điểm chặn hoạt động',
    inventory: 'Tồn kho',
    demand: 'Demand',
    ecomCos: 'Ecom / COS',
    finance: 'Tài chính',
    customer: 'Khách hàng',
    intelligence: 'Intelligence',
    campaignReadiness: 'Sẵn sàng campaign',
    orderFulfillment: 'Xử lý đơn hàng',
    revenueExposure: 'Rủi ro doanh thu',
    customerTrustSla: 'Niềm tin khách hàng / SLA',
    serviceRecoveryTrust: 'Khôi phục service → Niềm tin',
    inventoryToCampaign: 'Tồn kho → Sẵn sàng campaign',
    campaignToOrder: 'Sẵn sàng campaign → Xử lý đơn hàng',
    orderToRevenue: 'Xử lý đơn hàng → Rủi ro doanh thu',
    revenueToCustomer: 'Rủi ro doanh thu → Niềm tin khách hàng',
    operationAgent: 'Operation Agent',
    kpiDashboard: 'KPI Dashboard',
    signalsBoard: 'Bảng tín hiệu',
    launchDecisions: 'Quyết định launch',
    inventoryBrain: 'Inventory Brain',
    orders: 'Đơn hàng',
    fulfillment: 'Fulfillment',
    composer: 'Composer',
    calendar: 'Lịch',
    activationPlays: 'Play kích hoạt',
    finSupport: 'Fin Support',
    reviewRoutes: 'Route xét duyệt',
    blockers: 'Điểm chặn',
    crmCompact: 'CRM Compact',
    service: 'Service',
    customerProfile: 'Hồ sơ khách hàng',
    currentProof: 'Bằng chứng hiện tại',
    ownerAction: 'Hành động owner',
    event: 'Sự kiện',
    decision: 'Quyết định',
  },
} as Record<Locale, any>;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreStatus(score: number): OperatingStatus {
  if (score >= 80) return 'Ready';
  if (score >= 60) return 'Watch';
  return 'Critical';
}

function statusRank(status: OperatingStatus) {
  if (status === 'Critical') return 0;
  if (status === 'Watch') return 1;
  return 2;
}

function statusClass(status: OperatingStatus, tone: StatusTone = 'normal') {
  if (tone === 'quiet') {
    if (status === 'Ready') return 'border-emerald-500/20 bg-background text-emerald-700 dark:text-emerald-300';
    if (status === 'Watch') return 'border-amber-500/25 bg-background text-amber-700 dark:text-amber-300';
    return 'border-border bg-muted/40 text-muted-foreground';
  }

  if (status === 'Critical') return 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300';
  if (status === 'Watch') return 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return 'border-emerald-500/30 bg-background text-emerald-700 dark:text-emerald-300';
}

function statusDotClass(status: OperatingStatus, tone: StatusTone = 'normal') {
  if (tone === 'quiet') {
    if (status === 'Critical') return 'bg-muted-foreground';
    if (status === 'Watch') return 'bg-amber-500/70';
    return 'bg-emerald-500/70';
  }

  if (status === 'Critical') return 'bg-red-500';
  if (status === 'Watch') return 'bg-amber-500';
  return 'bg-emerald-500';
}

function riskLabel(count: number) {
  return count === 1 ? '1 risk' : `${count} risks`;
}

function openPrimeAi(context?: Record<string, string>) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('prime-ai:open', { detail: context }));
  }
}

function InfoHint({ children, label }: { children: ReactNode; label?: string }) {
  const { locale } = useI18n();
  const copy = overviewCopy[locale];

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            aria-label={label ?? copy.moreInformation}
          >
            <Info className="size-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-72 text-xs leading-relaxed">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function PrimeOverview() {
  const { locale } = useI18n();
  const copy = overviewCopy[locale];
  const [operatingMode, setOperatingMode] = useState<OperatingMode>('command');
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const snapshot = getPrimeSnapshot();
  const partnerWorkspace = getPartnerWorkspaceSummary(searchParams.get('role'));

  const totalTraffic = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.traffic, 0);
  const totalLeads = snapshot.leads.length;
  const totalOrders = snapshot.orders.length;
  const totalRfqs = snapshot.rfqs.length;
  const repeatCustomers = snapshot.customers.filter((customer) => customer.totalOrders > 1).length;
  const highRiskForecasts = snapshot.forecasts.filter((forecast) => forecast.risk === 'high');
  const watchForecasts = snapshot.forecasts.filter((forecast) => forecast.risk !== 'low');
  const openTickets = snapshot.tickets.filter((ticket) => ticket.status !== 'resolved');
  const highPriorityTickets = openTickets.filter((ticket) => ticket.priority === 'high');
  const ordersAtRisk = snapshot.orders.filter((order) => (
    order.risk_flags.length > 0
    || order.status === 'pending'
    || order.status === 'ready_to_ship'
    || order.status === 'shipping'
  ));
  const topCampaign = snapshot.campaigns[0] ?? null;
  const topForecast = highRiskForecasts[0] ?? watchForecasts[0] ?? snapshot.forecasts[0] ?? null;
  const topTicket = highPriorityTickets[0] ?? openTickets[0] ?? null;
  const topRecommendation = snapshot.recommendations[0] ?? null;
  const topPlay = snapshot.activationPlays[0] ?? null;
  const leadToOrderRate = snapshot.metrics.leadToOrderRate;
  const revenueAtRisk = (
    watchForecasts.reduce((sum, forecast) => sum + Math.max(0, forecast.demand7d - forecast.ats) * 22000, 0)
    + highPriorityTickets.length * 125000
    + ordersAtRisk.length * 18000
  );

  const intelligenceScore = clampScore(74 + snapshot.insightModels.length * 4 + snapshot.vocInsights.length * 2);
  const ecomScore = clampScore(66 + snapshot.products.length * 3 + snapshot.inventoryPositions.length - highRiskForecasts.length * 18);
  const demandScore = clampScore(60 + snapshot.campaigns.length * 6 + Math.min(18, leadToOrderRate));
  const financeScore = clampScore(70 + repeatCustomers * 4 - highRiskForecasts.length * 7 - ordersAtRisk.length);
  const customerScore = clampScore(72 + snapshot.customers.length * 2 - openTickets.length * 8);
  const systemScore = clampScore((intelligenceScore + ecomScore + demandScore + financeScore + customerScore) / 5);
  const systemStatus = scoreStatus(systemScore);

  const priorityActions: PriorityAction[] = [
    topForecast ? {
      id: `forecast-${topForecast.id}`,
      title: topForecast.risk === 'high' ? 'Resolve inventory pressure before campaign scale' : 'Validate inventory pressure',
      owner: 'Ecom / COS',
      object: topForecast.skuCode,
      reason: `${topForecast.ats} ATS vs ${topForecast.demand7d} projected 7-day demand.`,
      due: topForecast.risk === 'high' ? 'Today' : 'Next 24h',
      risk: topForecast.risk === 'high' ? 'Critical' : 'Watch',
      impact: currency.format(Math.max(0, topForecast.demand7d - topForecast.ats) * 22000),
      href: '/ecom/cos/inventory-brain',
      cta: 'Check inventory',
      evidence: topForecast.suggestedAction,
      blocker: topForecast.risk === 'high' ? 'ATS mismatch' : 'Coverage watch',
      sla: topForecast.risk === 'high' ? 'Resolve before campaign scale' : 'Validate before next launch push',
      whyNow: `${topForecast.ats} available units cannot support ${topForecast.demand7d} projected demand.`,
    } : null,
    topTicket ? {
      id: `ticket-${topTicket.id}`,
      title: 'Clear customer issue blocking trust loop',
      owner: 'Customer',
      object: topTicket.linkedEntity,
      reason: `${topTicket.subject}. SLA ${topTicket.sla}.`,
      due: topTicket.priority === 'high' ? 'Today' : 'This week',
      risk: topTicket.priority === 'high' ? 'Critical' : 'Watch',
      impact: `${topTicket.priority} priority`,
      href: '/customer/service',
      cta: 'Open service',
      evidence: 'Ticket is linked to CRM timeline and COS order context.',
      blocker: 'Trust loop blocked',
      sla: topTicket.sla,
      whyNow: 'Customer trust can degrade before launch allocation and follow-up.',
    } : null,
    topRecommendation ? {
      id: topRecommendation.id,
      title: topRecommendation.target,
      owner: 'Intelligence',
      object: topRecommendation.target,
      reason: topRecommendation.reasoning,
      due: copy.today,
      risk: topRecommendation.confidence >= 82 ? 'Watch' : 'Ready',
      impact: `${topRecommendation.confidence}% confidence`,
      href: '/intelligence/launch-decisions',
      cta: copy.reviewDecision,
      evidence: topRecommendation.action,
      blocker: topRecommendation.confidence >= 82 ? 'Decision needs owner review' : copy.monitorMode,
      sla: 'Review before next operating sync',
      whyNow: `${topRecommendation.confidence}% confidence signal is ready for human decision.`,
    } : null,
    topPlay ? {
      id: topPlay.id,
      title: 'Run next demand play against reachable audience',
      owner: copy.demand,
      object: topPlay.audience,
      reason: topPlay.trigger,
      due: copy.nextRun,
      risk: demandScore >= 80 ? 'Ready' : 'Watch',
      impact: `+${topPlay.projectedLift}% lift`,
      href: '/demand/campaigns',
      cta: copy.openQueue,
      evidence: topPlay.nextBestAction,
      blocker: demandScore >= 80 ? copy.noBlocker : 'Demand proof incomplete',
      sla: 'Queue before next run',
      whyNow: `${topPlay.projectedLift}% projected lift depends on reachable audience timing.`,
    } : null,
    {
      id: 'finance-readiness',
      title: financeScore >= 80 ? 'Keep finance guardrail in monitor mode' : 'Review finance readiness before demand expansion',
      owner: copy.finance,
      object: 'Scale capital',
      reason: `${financeScore}% finance readiness with ${ordersAtRisk.length} order risk signals.`,
      due: financeScore >= 80 ? copy.thisWeek : copy.today,
      risk: scoreStatus(financeScore),
      impact: currency.format(revenueAtRisk),
      href: '/finance/fin-support#funding-application-flow',
      cta: copy.reviewFinance,
      evidence: 'Finance guardrail protects campaign scale from fulfillment and cash risk.',
      blocker: financeScore >= 80 ? 'Monitor guardrail' : 'Scale capital review',
      sla: financeScore >= 80 ? 'Weekly check' : 'Clear before demand expansion',
      whyNow: `${currency.format(revenueAtRisk)} exposure links finance readiness to fulfillment and service risk.`,
    },
  ].filter((action): action is PriorityAction => Boolean(action))
    .sort((left, right) => statusRank(left.risk) - statusRank(right.risk))
    .slice(0, 5);

  const primaryAction = priorityActions[0];
  const visiblePriorities = priorityActions.slice(0, 3);
  const secondaryActions = priorityActions.slice(3);

  const healthMetrics: HealthMetric[] = [
    {
      label: copy.revenueAtRisk,
      value: currency.format(revenueAtRisk),
      status: revenueAtRisk > 250000 ? 'Critical' as const : revenueAtRisk > 0 ? 'Watch' as const : 'Ready' as const,
      context: `${watchForecasts.length} ${copy.stockSignals}, ${ordersAtRisk.length} ${copy.orderSignals}`,
      cause: revenueAtRisk > 0 ? 'Exposure comes from inventory and service blockers.' : 'No material exposure detected.',
      href: '/finance/fin-support#status',
      icon: CircleDollarSign,
    },
    {
      label: copy.demandReadiness,
      value: `${demandScore}%`,
      status: scoreStatus(demandScore),
      context: `${compactNumber.format(totalTraffic)} ${copy.reach}, ${totalLeads} ${copy.leads}`,
      cause: `${leadToOrderRate}% lead-to-order with ${totalRfqs} RFQs attached.`,
      href: '/demand/campaigns',
      icon: TrendingUp,
    },
    {
      label: copy.inventoryPressure,
      value: `${watchForecasts.length} SKU`,
      status: highRiskForecasts.length ? 'Critical' as const : watchForecasts.length ? 'Watch' as const : 'Ready' as const,
      context: highRiskForecasts.length ? `${highRiskForecasts.length} ${copy.critical}` : copy.noCriticalSku,
      cause: topForecast ? `${topForecast.skuCode}: ${topForecast.ats} ATS vs ${topForecast.demand7d} demand.` : 'Inventory coverage is clear.',
      href: '/ecom/cos/inventory-brain',
      icon: Boxes,
    },
    {
      label: copy.ordersAtRisk,
      value: String(ordersAtRisk.length),
      status: ordersAtRisk.length > 3 ? 'Critical' as const : ordersAtRisk.length ? 'Watch' as const : 'Ready' as const,
      context: `${totalOrders} ${copy.totalOrders}`,
      cause: ordersAtRisk.length ? 'Open lifecycle or risk flags need COS review.' : 'No order blocker in the queue.',
      href: '/ecom/cos/oms',
      icon: PackageCheck,
    },
    {
      label: copy.customerIssues,
      value: String(openTickets.length),
      status: highPriorityTickets.length ? 'Critical' as const : openTickets.length ? 'Watch' as const : 'Ready' as const,
      context: `${highPriorityTickets.length} ${copy.highPriority}`,
      cause: topTicket ? `${topTicket.subject} is still open.` : 'Service queue is clear.',
      href: '/customer/service',
      icon: UsersRound,
    },
  ];

  const riskRadar: RiskFlowItem[] = [
    {
      area: 'Inventory',
      stage: 'Inventory',
      title: highRiskForecasts.length ? 'ATS below launch demand' : watchForecasts.length ? 'SKU coverage needs watch' : 'Stock coverage ready',
      status: highRiskForecasts.length ? 'Critical' as const : watchForecasts.length ? 'Watch' as const : 'Ready' as const,
      owner: 'Ecom / COS',
      entity: topForecast?.skuCode || 'Inventory Brain',
      dependency: 'Inventory → Campaign readiness',
      signal: topForecast ? `${topForecast.ats} ATS vs ${topForecast.demand7d} demand` : 'Coverage clear',
      href: '/ecom/cos/inventory-brain',
    },
    {
      area: 'Demand',
      stage: 'Campaign Readiness',
      title: demandScore >= 80 ? 'Demand engine ready' : 'Demand proof needs operator review',
      status: scoreStatus(demandScore),
      owner: 'Demand',
      entity: topCampaign?.name || 'Campaign queue',
      dependency: 'Campaign readiness → Order fulfillment',
      signal: `${totalLeads} leads, ${totalRfqs} RFQs`,
      href: '/demand/campaigns',
    },
    {
      area: 'Ecom / COS',
      stage: 'Order Fulfillment',
      title: ecomScore >= 80 ? 'COS route ready' : 'Product and order route needs watch',
      status: scoreStatus(ecomScore),
      owner: 'Ecom / COS',
      entity: `${snapshot.products.length} products`,
      dependency: 'Order fulfillment → Revenue exposure',
      signal: `${ordersAtRisk.length} orders need watch`,
      href: '/ecom/cos/product-master',
    },
    {
      area: 'Finance',
      stage: 'Revenue Exposure',
      title: financeScore >= 80 ? 'Capital guardrail ready' : 'Scale finance needs review',
      status: scoreStatus(financeScore),
      owner: 'Finance',
      entity: `${financeScore}% readiness`,
      dependency: 'Revenue exposure → Customer trust',
      signal: financeScore >= 80 ? copy.capitalGuardrailReady : copy.readinessBelowScaleThreshold,
      href: '/finance/fin-support#blockers',
    },
    {
      area: 'Customer',
      stage: 'Customer Trust / SLA',
      title: highPriorityTickets.length ? 'High priority service issue' : openTickets.length ? 'Open service queue' : 'Service queue clear',
      status: highPriorityTickets.length ? 'Critical' as const : openTickets.length ? 'Watch' as const : 'Ready' as const,
      owner: 'Customer',
      entity: topTicket?.linkedEntity || 'CRM Compact',
      dependency: copy.serviceRecoveryTrust,
      signal: topTicket ? topTicket.sla : copy.noActiveBlocker,
      href: '/customer/service',
    },
  ];
  const blockedAreaCount = riskRadar.filter((item) => item.status !== 'Ready').length;
  const criticalSignals = riskRadar.filter((item) => item.status === 'Critical').slice(0, 2);
  const missionSignal = criticalSignals[0] ?? riskRadar.find((item) => item.status === 'Watch') ?? riskRadar[0];

  const areaStatus: AreaStatusItem[] = [
    {
      area: copy.intelligence,
      status: scoreStatus(intelligenceScore),
      summary: 'Recommendations, VOC and model signals are ready for operator review.',
      metric: `${snapshot.insightModels.length + snapshot.vocInsights.length} ${copy.activeSignals}`,
      blocker: topRecommendation ? topRecommendation.target : copy.noBlocker,
      readiness: intelligenceScore,
      href: '/intelligence/launch-decisions',
      action: copy.reviewDecisions,
      icon: Sparkles,
      risks: snapshot.alerts.filter((alert) => alert.area === 'Intelligence Area').length,
    },
    {
      area: copy.demand,
      status: scoreStatus(demandScore),
      summary: 'Campaigns, leads, RFQs and activation plays are connected.',
      metric: `${snapshot.campaigns.length} ${copy.campaigns}`,
      blocker: demandScore < 80 ? `${leadToOrderRate}% lead to order` : copy.noBlocker,
      readiness: demandScore,
      href: '/demand/campaigns',
      action: copy.openCampaigns,
      icon: Megaphone,
      risks: demandScore < 80 ? 1 : 0,
    },
    {
      area: copy.ecomCos,
      status: scoreStatus(ecomScore),
      summary: 'Catalog, inventory and OMS signals show route readiness.',
      metric: `${snapshot.inventoryPositions.length} ${copy.inventoryRows}`,
      blocker: highRiskForecasts.length ? `${highRiskForecasts.length} ${copy.critical} SKU` : copy.noBlocker,
      readiness: ecomScore,
      href: '/ecom/cos/product-master',
      action: copy.checkCos,
      icon: Store,
      risks: highRiskForecasts.length,
    },
    {
      area: copy.customer,
      status: scoreStatus(customerScore),
      summary: 'CRM memory and service queue protect buyer trust.',
      metric: `${snapshot.customers.length} ${copy.profiles}`,
      blocker: openTickets.length ? `${openTickets.length} ${copy.openTickets}` : copy.noBlocker,
      readiness: customerScore,
      href: '/customer/crm-compact',
      action: copy.openCrm,
      icon: UsersRound,
      risks: openTickets.length,
    },
    {
      area: copy.finance,
      status: scoreStatus(financeScore),
      summary: 'Finance health gates whether demand should expand today.',
      metric: `${financeScore}% ${copy.readiness}`,
      blocker: financeScore < 80 ? 'Review risk trust' : copy.noBlocker,
      readiness: financeScore,
      href: '/finance/fin-support',
      action: copy.reviewRisk,
      icon: ShieldCheck,
      risks: financeScore < 80 ? 1 : 0,
    },
  ];

  const quickLinkGroups: QuickLinkGroup[] = [
    {
      suite: copy.intelligence,
      summary: `${snapshot.insightModels.length + snapshot.vocInsights.length} ${copy.activeSignals}`,
      icon: Sparkles,
      links: [
        { label: copy.operationAgent, href: '/intelligence/product-operation-agent?view=command', status: scoreStatus(intelligenceScore) },
        { label: copy.kpiDashboard, href: '/intelligence/consulting-agent?tab=kpi' },
        { label: copy.signalsBoard, href: '/intelligence/consulting-agent?tab=signals', count: `${snapshot.vocInsights.length}` },
        { label: copy.launchDecisions, href: '/intelligence/consulting-agent?tab=launch', count: topRecommendation ? '1' : '0' },
      ],
    },
    {
      suite: 'Ecom/COS',
      summary: `${ordersAtRisk.length} ${copy.ordersNeedWatch}`,
      icon: Store,
      links: [
        { label: copy.products, href: '/ecom/cos/product-master', count: `${snapshot.products.length}` },
        { label: copy.inventoryBrain, href: '/ecom/cos/inventory-brain', count: `${watchForecasts.length}`, status: highRiskForecasts.length ? 'Critical' : watchForecasts.length ? 'Watch' : 'Ready' },
        { label: copy.orders, href: '/ecom/cos/oms', count: `${ordersAtRisk.length}` },
        { label: copy.fulfillment, href: '/ecom/cos/fulfillment' },
      ],
    },
    {
      suite: copy.demand,
      summary: `${totalLeads} ${copy.leads}, ${totalRfqs} ${copy.rfqs}`,
      icon: Megaphone,
      links: [
        { label: copy.campaigns, href: '/demand/campaigns', count: `${snapshot.campaigns.length}`, status: scoreStatus(demandScore) },
        { label: copy.composer, href: '/demand/mdec?view=composer' },
        { label: copy.calendar, href: '/demand/mdec?view=calendar' },
        { label: copy.activationPlays, href: '/demand/campaigns', count: `${snapshot.activationPlays.length}` },
      ],
    },
    {
      suite: copy.finance,
      summary: `${financeScore}% ${copy.readiness}`,
      icon: CircleDollarSign,
      links: [
        { label: copy.finSupport, href: '/finance/fin-support', status: scoreStatus(financeScore) },
        { label: copy.evidence, href: '/finance/fin-support?tab=evidence' },
        { label: copy.reviewRoutes, href: '/finance/fin-support?tab=routes' },
        { label: copy.blockers, href: '/finance/fin-support#blockers', count: financeScore < 80 ? '1' : '0' },
      ],
    },
    {
      suite: copy.customer,
      summary: `${openTickets.length} ${copy.openTickets}`,
      icon: UsersRound,
      links: [
        { label: copy.crmCompact, href: '/customer/crm-compact', count: `${snapshot.customers.length}` },
        { label: copy.service, href: '/customer/service', count: `${openTickets.length}`, status: highPriorityTickets.length ? 'Critical' : openTickets.length ? 'Watch' : 'Ready' },
        { label: copy.customerProfile, href: '/customer/crm-compact?floor=overview' },
      ],
    },
  ];

  const evidenceItems: EvidenceItem[] = [
    {
      label: 'Inventory evidence',
      value: topForecast ? getSkuProductName(topForecast.skuCode) : 'Inventory coverage',
      detail: topForecast ? `${topForecast.skuCode}: ${topForecast.ats} ATS vs ${topForecast.demand7d} demand.` : 'No pressure forecast detected.',
      status: topForecast?.risk === 'high' ? 'Critical' as const : topForecast ? 'Watch' as const : 'Ready' as const,
    },
    {
      label: 'Demand evidence',
      value: topCampaign?.name || 'Demand route',
      detail: `${compactNumber.format(totalTraffic)} reach, ${totalLeads} leads, ${totalRfqs} RFQs, ${totalOrders} orders.`,
      status: scoreStatus(demandScore),
    },
    {
      label: 'Customer evidence',
      value: topTicket?.subject || 'Service queue',
      detail: topTicket ? `${topTicket.linkedEntity}, SLA ${topTicket.sla}.` : `${repeatCustomers} repeat buyers with clear service queue.`,
      status: highPriorityTickets.length ? 'Critical' as const : openTickets.length ? 'Watch' as const : 'Ready' as const,
    },
    {
      label: 'AI evidence',
      value: topRecommendation?.target || 'Recommendation queue',
      detail: topRecommendation ? `${topRecommendation.confidence}% confidence. ${topRecommendation.action}` : 'No recommendation pending.',
      status: topRecommendation && topRecommendation.confidence >= 82 ? 'Watch' as const : 'Ready' as const,
    },
  ];

  const activityItems: ActivityItem[] = [
    ...snapshot.orderEvents.slice(0, 2).map((event) => ({
      id: event.id,
      source: 'OMS',
      object: event.order_id,
      detail: event.message,
      time: event.created_at,
    })),
    ...snapshot.activationPlays.slice(0, 2).map((play) => ({
      id: play.id,
      source: 'Demand',
      object: play.audience,
      detail: play.nextBestAction,
      time: copy.nextRun,
    })),
    ...snapshot.tickets.slice(0, 2).map((ticket) => ({
      id: ticket.id,
      source: 'CRM',
      object: ticket.linkedEntity,
      detail: ticket.subject,
      time: ticket.sla,
    })),
  ].slice(0, 6);

  const proofTimelineItems: ProofTimelineItem[] = [
    ...evidenceItems.map((item) => ({
      id: `evidence-${item.label}`,
      type: copy.evidence as ProofTimelineType,
      source: item.label.replace(' evidence', ''),
      object: item.value,
      detail: item.detail,
      time: copy.currentProof,
      status: item.status,
    })),
    ...priorityActions.slice(0, 3).map((action) => ({
      id: `owner-action-${action.id}`,
      type: copy.ownerAction as ProofTimelineType,
      source: action.owner,
      object: action.object,
      detail: `${action.cta}: ${action.whyNow}`,
      time: action.due,
      status: action.risk,
      href: action.href,
    })),
    ...activityItems.map((item) => ({
      id: `event-${item.id}`,
      type: copy.event as ProofTimelineType,
      source: item.source,
      object: item.object,
      detail: item.detail,
      time: item.time,
      status: item.source === 'CRM' ? (highPriorityTickets.length ? 'Critical' as const : 'Watch' as const) : 'Ready' as const,
    })),
    ...(topRecommendation ? [{
      id: `decision-${topRecommendation.id}`,
      type: copy.decision as ProofTimelineType,
      source: 'Intelligence',
      object: topRecommendation.target,
      detail: topRecommendation.action,
      time: `${topRecommendation.confidence}% confidence`,
      status: topRecommendation.confidence >= 82 ? 'Watch' as const : 'Ready' as const,
      href: '/intelligence/launch-decisions',
    }] : []),
  ].slice(0, operatingMode === 'audit' ? 12 : 8);

  const showAreaStatus = operatingMode !== 'command';
  const showProofTimeline = operatingMode !== 'command';
  const showLegacyEvidence = operatingMode === 'audit';
  const primeAiContext = primaryAction ? {
    action: primaryAction.title,
    owner: primaryAction.owner,
    object: primaryAction.object,
    risk: primaryAction.risk,
    impact: primaryAction.impact,
    blocker: primaryAction.blocker,
    evidence: primaryAction.evidence,
    dependency: missionSignal?.dependency ?? copy.noActiveDependencyPressure,
    signal: missionSignal?.signal ?? copy.noActiveBlocker,
  } : {
    action: copy.reviewDashboard,
    owner: 'Prime OS',
    object: copy.generalDashboard,
    risk: systemStatus,
    impact: currency.format(revenueAtRisk),
    blocker: copy.noActiveBlocker,
    evidence: 'All operating areas are in monitor mode.',
    dependency: copy.noActiveDependencyPressure,
    signal: copy.noActiveBlocker,
  };

  return (
    <div className="min-h-full overflow-x-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_26rem),hsl(var(--background))]">
      <div className="space-y-4 p-4 pt-0 md:p-6 md:pt-0">
        <MissionBrief
          primaryAction={primaryAction}
          missionSignal={missionSignal}
          revenueAtRisk={revenueAtRisk}
          blockedAreaCount={blockedAreaCount}
          systemScore={systemScore}
          systemStatus={systemStatus}
          onAskAi={() => openPrimeAi(primeAiContext)}
        />

        {partnerWorkspace ? <PartnerWorkspacePanel summary={partnerWorkspace} /> : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <PriorityMissionList
            actions={visiblePriorities}
            secondaryActions={secondaryActions}
            mode={operatingMode}
            expandedActionId={expandedActionId}
            onToggleAction={(id) => setExpandedActionId((current) => (current === id ? null : id))}
          />

          <DependencyRiskFlow items={riskRadar} mode={operatingMode} />
        </section>

        <GeneralDashboardSurface
          suites={areaStatus}
          metrics={healthMetrics}
          dependencyFlow={riskRadar}
          quickLinks={quickLinkGroups}
        />

        <OperatorModeSwitch mode={operatingMode} onModeChange={setOperatingMode} />

        <SecondarySignalsPanel
          mode={operatingMode}
          showAreaStatus={showAreaStatus}
          showProofTimeline={showProofTimeline}
          showLegacyEvidence={showLegacyEvidence}
          areaStatus={areaStatus}
          evidenceItems={evidenceItems}
          activityItems={activityItems}
          proofTimelineItems={proofTimelineItems}
        />
      </div>
    </div>
  );
}

function MissionBrief({
  primaryAction,
  missionSignal,
  revenueAtRisk,
  blockedAreaCount,
  systemScore,
  systemStatus,
  onAskAi,
}: {
  primaryAction?: PriorityAction;
  missionSignal?: RiskFlowItem;
  revenueAtRisk: number;
  blockedAreaCount: number;
  systemScore: number;
  systemStatus: OperatingStatus;
  onAskAi: () => void;
}) {
  const { locale } = useI18n();
  const copy = overviewCopy[locale];
  const topActionCopy = primaryAction
    ? `${primaryAction.owner} owns ${primaryAction.object}: ${primaryAction.reason}`
    : 'All operating areas are ready for monitor mode.';

  return (
    <section data-testid="overview-command-bar" className="-mt-1 overflow-hidden rounded-2xl border bg-card/95 shadow-sm">
      <div className="grid gap-px bg-border/70 xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.72fr)] xl:items-stretch">
        <div className="flex min-w-0 flex-col justify-between gap-3 bg-card p-4">
          <div className="min-w-0">
            <Badge variant="outline" className="mb-2 rounded-full bg-background/80 font-mono uppercase tracking-[0.16em]">{copy.liveConsole}</Badge>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span className={`size-2 rounded-full ${statusDotClass(primaryAction?.risk ?? systemStatus, 'quiet')}`} />
              <span>{copy.crossSuiteSnapshot}</span>
              {primaryAction ? <StatusBadge status={primaryAction.risk} /> : <StatusBadge status={systemStatus} tone="quiet" />}
            </div>
            <h1 className="mt-1 max-w-3xl text-2xl font-semibold tracking-tight md:text-3xl">{copy.generalDashboard}</h1>
            <p className="mt-1 line-clamp-1 max-w-2xl text-sm leading-6 text-muted-foreground">{topActionCopy}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to={primaryAction?.href ?? '/intelligence/launch-decisions'}>
                {primaryAction?.cta ?? copy.reviewDashboard}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={onAskAi} aria-label={copy.askPrimeAi}>
              <Bot className="size-4" />
              {copy.askPrimeAi}
            </Button>
          </div>
        </div>

        <div className="grid gap-px bg-border/70 sm:grid-cols-[minmax(0,1fr)_190px]">
          <div className="bg-card p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>{copy.primarySignal}</span>
              <InfoHint label={`${copy.primarySignal} info`}>{copy.primarySignalInfo}</InfoHint>
              {missionSignal ? <StatusBadge status={missionSignal.status} tone="quiet" /> : null}
            </div>
            <div className="mt-1 text-sm font-semibold">{missionSignal?.stage ?? copy.operatingSystem}</div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {missionSignal ? `${missionSignal.signal}. ${missionSignal.dependency}` : copy.noActiveDependencyPressure}
            </p>
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <span className="rounded-md border bg-background/70 px-2 py-1">{copy.owner}: {missionSignal?.owner ?? primaryAction?.owner ?? 'Prime OS'}</span>
              <span className="rounded-md border bg-background/70 px-2 py-1">{copy.object}: {missionSignal?.entity ?? primaryAction?.object ?? copy.system}</span>
              <span className="rounded-md border bg-background/70 px-2 py-1">{copy.mode}: {copy.monitor}</span>
            </div>
          </div>

          <div className="grid bg-card">
            <MissionStat label={copy.exposure} value={currency.format(revenueAtRisk)} status={revenueAtRisk > 250000 ? 'Critical' : revenueAtRisk > 0 ? 'Watch' : 'Ready'} />
            <MissionStat label={copy.system} value={`${systemScore}%`} detail={`${blockedAreaCount} ${copy.blocked}`} status={systemStatus} />
          </div>
        </div>

      </div>
    </section>
  );
}

function MissionStat({
  label,
  value,
  detail,
  status,
}: {
  label: string;
  value: string;
  detail?: string;
  status: OperatingStatus;
}) {
  return (
    <div className="border-b border-r bg-background/70 px-3 py-3 last:border-b-0 sm:border-r-0">
      <div className="flex items-center justify-between gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <span className={`size-2 rounded-full ${statusDotClass(status, 'quiet')}`} />
      </div>
      <div className="mt-1 font-mono text-lg font-semibold tracking-tight">{value}</div>
      {detail ? <div className="mt-1 text-xs text-muted-foreground">{detail}</div> : null}
    </div>
  );
}

function GeneralDashboardSurface({
  suites,
  metrics,
  dependencyFlow,
  quickLinks,
}: {
  suites: AreaStatusItem[];
  metrics: HealthMetric[];
  dependencyFlow: RiskFlowItem[];
  quickLinks: QuickLinkGroup[];
}) {
  return (
    <section data-testid="general-dashboard-summary" className="space-y-4" aria-label="General Dashboard cross-suite summary">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <SuiteReadinessPanel suites={suites} />
        <CrossSuiteFlowSummary items={dependencyFlow} />
      </div>

      <SystemHealthStrip metrics={metrics} />

      <QuickAccessHub groups={quickLinks} />
    </section>
  );
}

function SuiteReadinessPanel({ suites }: { suites: AreaStatusItem[] }) {
  const { locale } = useI18n();
  const copy = overviewCopy[locale];
  const chartData = suites.map((suite) => ({
    suite: suite.area.replace(' / ', '/'),
    readiness: suite.readiness,
    status: suite.status,
    blocker: suite.blocker,
  }));
  const counts = suites.reduce(
    (acc, suite) => {
      acc[suite.status] += 1;
      return acc;
    },
    { Ready: 0, Watch: 0, Critical: 0 } satisfies Record<OperatingStatus, number>,
  );

  return (
    <Card className="overflow-hidden rounded-2xl border bg-card/95 shadow-sm">
      <CardHeader className="border-b pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="size-5" />
              {copy.suiteHealth}
              <InfoHint label={`${copy.suiteHealth} info`}>{copy.suiteHealthInfo}</InfoHint>
            </CardTitle>
          </div>
          <StatusDistribution counts={counts} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-px bg-border/70 p-0 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="bg-card p-4">
          <ChartContainer
            config={suiteReadinessChartConfig}
            className="h-64 w-full"
            aria-label={`Suite readiness: ${chartData.map((row) => `${row.suite} ${row.readiness} percent ${row.status}`).join(', ')}`}
          >
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 44, top: 8, bottom: 8 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis type="category" dataKey="suite" width={96} tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="readiness" fill="var(--color-readiness)" radius={[0, 6, 6, 0]} barSize={18}>
                <LabelList dataKey="readiness" position="right" formatter={(value: number) => `${value}%`} className="fill-foreground font-medium" />
              </Bar>
            </BarChart>
          </ChartContainer>
          <ul className="sr-only">
            {chartData.map((row) => (
              <li key={row.suite}>{row.suite}: {row.readiness} percent, {row.status}. {row.blocker}</li>
            ))}
          </ul>
        </div>

        <div className="grid content-start gap-px bg-border/70">
          {suites.map((suite) => {
            const Icon = suite.icon;

            return (
              <Link key={suite.area} to={suite.href} className="group bg-card p-3 transition-colors hover:bg-muted/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                      <span className="truncate text-sm font-semibold">{suite.area}</span>
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{suite.metric}</p>
                  </div>
                  <StatusBadge status={suite.status} tone="quiet" />
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusDistribution({ counts }: { counts: Record<OperatingStatus, number> }) {
  const total = Math.max(1, counts.Ready + counts.Watch + counts.Critical);
  const rows: Array<{ status: OperatingStatus; count: number }> = [
    { status: 'Critical', count: counts.Critical },
    { status: 'Watch', count: counts.Watch },
    { status: 'Ready', count: counts.Ready },
  ];

  return (
    <div className="min-w-[220px]" role="img" aria-label={`${counts.Critical} critical, ${counts.Watch} watch, ${counts.Ready} ready suites`}>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {rows.map((row) => (
          <span
            key={row.status}
            className={statusDotClass(row.status)}
            style={{ width: `${(row.count / total) * 100}%` }}
            aria-hidden="true"
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {rows.map((row) => (
          <span key={row.status}>{row.count} {row.status}</span>
        ))}
      </div>
    </div>
  );
}

function CrossSuiteFlowSummary({ items }: { items: RiskFlowItem[] }) {
  const { locale } = useI18n();
  const copy = overviewCopy[locale];

  return (
    <Card className="overflow-hidden rounded-2xl border bg-card/95 shadow-sm">
      <CardHeader className="border-b pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Radar className="size-5" />
              {copy.crossSuiteFlow}
              <InfoHint label={`${copy.crossSuiteFlow} info`}>{copy.crossSuiteFlowInfo}</InfoHint>
            </CardTitle>
          </div>
          <Badge variant="outline" className="rounded-full">{items.filter((item) => item.status !== 'Ready').length} {copy.active}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid gap-px overflow-hidden rounded-xl border bg-border/70">
          {items.map((item, index) => (
            <Link key={item.stage} to={item.href} className="group grid gap-2 bg-card p-3 transition-colors hover:bg-muted/20 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                  <span className={`size-2 rounded-full ${statusDotClass(item.status, 'quiet')}`} />
                  <span className="text-sm font-semibold">{item.stage}</span>
                  <StatusBadge status={item.status} tone="quiet" />
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{item.signal}</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAccessHub({ groups }: { groups: QuickLinkGroup[] }) {
  const { locale } = useI18n();
  const copy = overviewCopy[locale];

  return (
    <Card className="overflow-hidden rounded-2xl border bg-card/95 shadow-sm">
      <CardHeader className="border-b pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PackageCheck className="size-5" />
              {copy.quickAccess}
              <InfoHint label={`${copy.quickAccess} info`}>{copy.quickAccessInfo}</InfoHint>
            </CardTitle>
          </div>
          <Badge variant="outline" className="w-fit">{groups.length} {copy.suites}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-px bg-border/70 p-0 md:grid-cols-2 xl:grid-cols-5">
        {groups.map((group) => {
          const Icon = group.icon;

          return (
            <div key={group.suite} className="bg-card p-3">
              <div className="flex items-start gap-2">
                <div className="rounded-lg border bg-muted/30 p-2 text-muted-foreground">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{group.suite}</div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{group.summary}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-1.5">
                {group.links.map((link) => (
                  <Link key={`${group.suite}-${link.label}`} to={link.href} className="group flex min-h-9 items-center justify-between gap-2 rounded-md border border-transparent bg-muted/10 px-2.5 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-background">
                    <span className="truncate">{link.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {link.status ? <span className={`size-2 rounded-full ${statusDotClass(link.status, 'quiet')}`} role="img" aria-label={link.status} /> : null}
                      {link.count ? <Badge variant="outline" className="rounded-full px-1.5 py-0 text-[10px]">{link.count}</Badge> : null}
                      <ArrowRight className="size-3 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function OperatorModeSwitch({
  mode,
  onModeChange,
}: {
  mode: OperatingMode;
  onModeChange: (mode: OperatingMode) => void;
}) {
  const { locale } = useI18n();
  const copy = overviewCopy[locale];
  const modeCopy = copy.operatorModeInfo;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card/95 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            {copy.operatorMode}
            <InfoHint label={`${copy.operatorMode} info`}>{modeCopy[mode]}</InfoHint>
          </div>
        </div>
      <div className="grid w-full grid-cols-3 gap-1 rounded-xl border bg-muted p-1 sm:w-auto" role="group" aria-label={copy.operatorMode}>
        {(['command', 'investigate', 'audit'] as OperatingMode[]).map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={mode === option ? 'secondary' : 'ghost'}
            className="h-8 px-3 capitalize"
            aria-pressed={mode === option}
            onClick={() => onModeChange(option)}
          >
            {copy[option]}
          </Button>
        ))}
      </div>
    </div>
  );
}

function SystemHealthStrip({ metrics }: { metrics: HealthMetric[] }) {
  const { locale } = useI18n();
  const copy = overviewCopy[locale];

  return (
    <section className="overflow-hidden rounded-2xl border bg-card/95 shadow-sm">
      <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            {copy.crossSuiteKpis}
            <InfoHint label={`${copy.crossSuiteKpis} info`}>{copy.crossSuiteKpisInfo}</InfoHint>
          </h2>
        </div>
        <Badge variant="outline" className="w-fit">{metrics.length} {copy.indicators}</Badge>
      </div>
      <div className="grid gap-px bg-border/70 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <Link key={metric.label} to={metric.href} className="group bg-card p-3 transition-colors hover:bg-muted/20">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span className={`size-2 rounded-full ${statusDotClass(metric.status, 'quiet')}`} />
                    <span className="truncate">{metric.label}</span>
                  </div>
                  <div className="mt-1 font-mono text-lg font-semibold tracking-tight">{metric.value}</div>
                </div>
                <div className="rounded-lg border bg-background p-2 text-muted-foreground transition-colors group-hover:text-foreground">
                  <Icon className="size-4" />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <StatusBadge status={metric.status} tone="quiet" />
                <span className="truncate text-xs text-muted-foreground">{metric.context}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function PriorityMissionList({
  actions,
  secondaryActions,
  mode,
  expandedActionId,
  onToggleAction,
}: {
  actions: PriorityAction[];
  secondaryActions: PriorityAction[];
  mode: OperatingMode;
  expandedActionId: string | null;
  onToggleAction: (id: string) => void;
}) {
  const { locale } = useI18n();
  const copy = overviewCopy[locale];

  return (
    <Card id="priority-action-queue" className="overflow-hidden rounded-2xl border bg-card/95 shadow-sm">
      <CardHeader className="border-b pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="size-5" />
              {copy.topPriorities}
              <InfoHint label={`${copy.topPriorities} info`}>{copy.topPrioritiesInfo}</InfoHint>
            </CardTitle>
          </div>
          <Badge variant="outline" className="w-fit">{actions.length} {copy.visible}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-3">
        {actions.map((action, index) => (
          <PriorityMissionCard
            key={action.id}
            action={action}
            rank={index + 1}
            mode={mode}
            expanded={expandedActionId === action.id}
            onToggle={() => onToggleAction(action.id)}
          />
        ))}

        {mode !== 'command' && secondaryActions.length ? (
          <div className="rounded-lg border bg-muted/10">
            <div className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {copy.secondaryActionTree}
            </div>
            <div className="divide-y">
              {secondaryActions.map((action) => (
                <SecondaryActionRow key={action.id} action={action} />
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PriorityMissionCard({
  action,
  rank,
  mode,
  expanded,
  onToggle,
}: {
  action: PriorityAction;
  rank: number;
  mode: OperatingMode;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { locale } = useI18n();
  const copy = overviewCopy[locale];
  const showDetails = expanded || mode !== 'command';
  const emphasized = rank === 1;

  return (
    <div className="rounded-xl border bg-background p-3 transition-colors hover:bg-muted/20 data-[emphasis=true]:border-primary/30 data-[emphasis=true]:bg-primary/5" data-emphasis={emphasized}>
      <div className="grid gap-3 lg:grid-cols-[48px_minmax(0,1fr)_auto] lg:items-start">
        <div className="flex size-10 items-center justify-center rounded-lg border bg-card font-mono text-sm font-semibold">
          {String(rank).padStart(2, '0')}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={action.risk} tone={emphasized ? 'normal' : 'quiet'} />
            <Badge variant="outline" className="gap-1 rounded-full">
              <UserRoundCheck className="size-3" />
              {action.owner}
            </Badge>
            <span className="text-xs text-muted-foreground">{action.due}</span>
          </div>
          <h3 className="mt-2 text-base font-semibold leading-tight">{action.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{action.reason}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
            <span><span className="font-medium text-foreground">Object:</span> {action.object}</span>
            <span><span className="font-medium text-foreground">Impact:</span> {action.impact}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button asChild size="sm" variant={emphasized ? 'default' : 'outline'}>
            <Link to={action.href}>
              {action.cta}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          {mode === 'command' ? (
            <Button type="button" size="sm" variant="ghost" onClick={onToggle} aria-expanded={expanded}>
              {copy.details}
            </Button>
          ) : null}
        </div>
      </div>

      {showDetails ? (
        <div className="mt-3 grid gap-px overflow-hidden rounded-lg border bg-border/70 text-xs md:grid-cols-3">
          <div className="bg-card p-3">
            <div className="text-muted-foreground">{copy.blocker}</div>
            <div className="mt-1 font-medium">{action.blocker}</div>
          </div>
          <div className="bg-card p-3">
            <div className="text-muted-foreground">{copy.sla}</div>
            <div className="mt-1 font-mono font-medium">{action.sla}</div>
          </div>
          <div className="bg-card p-3">
            <div className="text-muted-foreground">{copy.evidence}</div>
            <div className="mt-1 line-clamp-2 font-medium">{action.evidence}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SecondaryActionRow({ action }: { action: PriorityAction }) {
  return (
    <Link to={action.href} className="grid gap-2 px-3 py-2 transition-colors hover:bg-muted/20 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={action.risk} tone="quiet" />
          <span className="truncate text-sm font-medium">{action.title}</span>
        </div>
        <div className="mt-1 truncate text-xs text-muted-foreground">{action.owner} · {action.object} · {action.impact}</div>
      </div>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
        {action.cta}
        <ArrowRight className="size-3" />
      </span>
    </Link>
  );
}

function DependencyRiskFlow({
  items,
  mode,
}: {
  items: RiskFlowItem[];
  mode: OperatingMode;
}) {
  const { locale } = useI18n();
  const copy = overviewCopy[locale];

  return (
    <Card className="overflow-hidden rounded-2xl border bg-card/95 shadow-sm">
      <CardHeader className="border-b pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radar className="size-4" />
              {copy.dependencyRiskFlow}
              <InfoHint label={`${copy.dependencyRiskFlow} info`}>{copy.dependencyRiskFlowInfo}</InfoHint>
            </CardTitle>
          </div>
          <Badge variant="outline" className="w-fit">{items.filter((item) => item.status !== 'Ready').length} {copy.active}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid gap-px overflow-hidden rounded-xl border bg-border/70">
          {items.map((item, index) => (
            <RiskFlowNode key={item.stage} item={item} isLast={index === items.length - 1} />
          ))}
        </div>

        {mode !== 'command' ? (
          <div className="mt-4 rounded-lg border bg-muted/10">
            <div className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {copy.dependencyDetail}
            </div>
            <div className="divide-y">
              {items.map((item) => (
                <Link key={item.area} to={item.href} className="grid gap-2 px-3 py-2 transition-colors hover:bg-muted/20 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${statusDotClass(item.status, 'quiet')}`} />
                    <span className="text-sm font-medium">{item.area}</span>
                  </div>
                  <div className="min-w-0 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{item.dependency}:</span> {item.signal}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RiskFlowNode({ item, isLast }: { item: RiskFlowItem; isLast: boolean }) {
  return (
    <div className="grid gap-0 bg-card sm:grid-cols-[minmax(0,1fr)_24px] sm:items-center">
      <Link to={item.href} className="p-3 transition-colors hover:bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`size-2 rounded-full ${statusDotClass(item.status, 'quiet')}`} />
            <span className="truncate text-sm font-semibold">{item.stage}</span>
          </div>
          <StatusBadge status={item.status} tone="quiet" />
        </div>
        <p className="mt-2 line-clamp-2 text-sm font-medium">{item.signal}</p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
          <span>{item.owner}</span>
          <span>{item.entity}</span>
        </div>
      </Link>
      {!isLast ? (
        <div className="flex items-center justify-center text-muted-foreground">
          <ArrowRight className="size-4 rotate-90 sm:rotate-0" />
        </div>
      ) : null}
    </div>
  );
}

function SecondarySignalsPanel({
  mode,
  showAreaStatus,
  showProofTimeline,
  showLegacyEvidence,
  areaStatus,
  evidenceItems,
  activityItems,
  proofTimelineItems,
}: {
  mode: OperatingMode;
  showAreaStatus: boolean;
  showProofTimeline: boolean;
  showLegacyEvidence: boolean;
  areaStatus: AreaStatusItem[];
  evidenceItems: EvidenceItem[];
  activityItems: ActivityItem[];
  proofTimelineItems: ProofTimelineItem[];
}) {
  if (mode === 'command') return null;

  return (
    <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      {showAreaStatus ? (
        <Card className="rounded-lg border shadow-sm">
          <CardHeader className="border-b pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4" />
              Area Status Map
              <InfoHint label="Area Status Map info">Suite readiness, blocker, and owner-module route for investigation mode.</InfoHint>
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {areaStatus.map((area) => (
              <AreaStatusRow key={area.area} {...area} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {showProofTimeline ? (
        <Card className="rounded-lg border shadow-sm">
          <CardHeader className="border-b pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4" />
                  Operating Proof Timeline
                  <InfoHint label="Operating Proof Timeline info">Evidence, events, decisions, and owner actions in one audit-ready lane.</InfoHint>
                </CardTitle>
              </div>
              <Badge variant="outline" className="w-fit">{proofTimelineItems.length} proof points</Badge>
            </div>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {proofTimelineItems.map((item) => (
              <ProofTimelineRow key={item.id} {...item} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {showLegacyEvidence ? (
        <>
          <Card className="rounded-lg border shadow-sm">
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4" />
                Evidence Stack
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 md:grid-cols-2">
              {evidenceItems.map((item) => (
                <EvidenceCard key={item.label} {...item} />
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border shadow-sm">
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock3 className="size-4" />
                Recent Operating Events
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {activityItems.map((item) => (
                <div key={item.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full">{item.source}</Badge>
                        <span className="truncate text-sm font-medium">{item.object}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.detail}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}

function AreaStatusRow({
  area,
  status,
  summary,
  metric,
  blocker,
  readiness,
  href,
  action,
  icon: Icon,
  risks,
}: {
  area: string;
  status: OperatingStatus;
  summary: string;
  metric: string;
  blocker: string;
  readiness: number;
  href: string;
  action: string;
  icon: LucideIcon;
  risks: number;
}) {
  return (
    <Link to={href} className="block p-3 transition-colors hover:bg-muted/20">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border bg-background p-2 text-muted-foreground">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">{area}</div>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{metric}</span>
            <span>{riskLabel(risks)}</span>
            <span>{blocker}</span>
          </div>
          <Progress value={readiness} className="mt-3 h-1.5" />
          <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
            {action}
            <ArrowRight className="size-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProofTimelineRow({
  type,
  source,
  object,
  detail,
  time,
  status,
  href,
}: {
  type: ProofTimelineType;
  source: string;
  object: string;
  detail: string;
  time: string;
  status: OperatingStatus;
  href?: string;
}) {
  const content = (
    <div className="grid gap-3 p-4 transition-colors hover:bg-muted/20 md:grid-cols-[150px_minmax(0,1fr)_auto] md:items-start">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="rounded-full">{type}</Badge>
        <span className={`size-2 rounded-full ${statusDotClass(status)}`} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{source}</span>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="truncate text-sm text-muted-foreground">{object}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{detail}</p>
      </div>
      <div className="text-xs text-muted-foreground md:text-right">{time}</div>
    </div>
  );

  return href ? <Link to={href} className="block">{content}</Link> : content;
}

function EvidenceCard({
  label,
  value,
  detail,
  status,
}: {
  label: string;
  value: string;
  detail: string;
  status: OperatingStatus;
}) {
  return (
    <div className="rounded-lg border bg-muted/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-2 line-clamp-1 font-semibold">{value}</div>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function StatusBadge({ status, tone = 'normal' }: { status: OperatingStatus; tone?: StatusTone }) {
  const Icon = status === 'Ready' ? CheckCircle2 : status === 'Watch' ? AlertTriangle : AlertTriangle;

  return (
    <Badge variant="outline" className={`gap-1 rounded-full ${statusClass(status, tone)}`}>
      <Icon className="size-3" />
      {status}
    </Badge>
  );
}
