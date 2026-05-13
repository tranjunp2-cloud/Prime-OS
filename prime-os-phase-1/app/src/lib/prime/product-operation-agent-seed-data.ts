import type { PrimeAlert, PrimeCampaign, PrimeForecast, PrimeRecommendation, PrimeSnapshot, PrimeTicket } from './prime-data'

export type ProductOperationViewId = 'command' | 'kanban' | 'queue' | 'audit'

export type OperatingLaneId =
  | 'signal'
  | 'triage'
  | 'decision'
  | 'in_progress'
  | 'waiting'
  | 'done'
  | 'learning'

export type OperatingSuite = 'Intelligence' | 'Ecom/COS' | 'Demand' | 'Finance' | 'Customer'
export type OperatingSeverity = 'low' | 'medium' | 'high'
export type OperatingApprovalState = 'not_required' | 'pending' | 'approved' | 'rejected'
export type OperatingProposalStatus = 'ready' | 'needs_approval' | 'approved' | 'rejected' | 'executed'
export type OperatingCommandId = 'approval_sweep' | 'risk_packet' | 'blocked_work' | 'audit_summary'
export type OperatingChatIntent = OperatingCommandId | 'greeting' | 'clarify' | 'unsafe_mutation'

export interface OperatingLane {
  id: OperatingLaneId
  label: string
  description: string
  wipLimit: number
}

export interface OperatingPolicyCheck {
  label: string
  passed: boolean
}

export interface OperatingCard {
  id: string
  title: string
  laneId: OperatingLaneId
  sourceSuite: OperatingSuite
  sourceRoute: string
  sourceEntityId: string
  sourceOwner: string
  severity: OperatingSeverity
  owner: string
  dueLabel: string
  ageHours: number
  wipClass: 'expedite' | 'standard' | 'learning'
  metricLabel: string
  businessImpact: string
  recommendedAction: string
  approvalRequired: boolean
  approvalState: OperatingApprovalState
  evidence: string[]
  policyChecklist: OperatingPolicyCheck[]
  auditTrail: string[]
}

export interface OperatingAgentProposal {
  id: string
  cardId: string
  agentName: string
  title: string
  summary: string
  actionType: 'prepare' | 'route' | 'approve' | 'learn'
  status: OperatingProposalStatus
  route: string
  requiresApproval: boolean
}

export interface OperatingAuditEvent {
  id: string
  cardId: string
  label: string
  actor: string
  timestampLabel: string
}

export interface OperatingCommandPrompt {
  id: OperatingCommandId
  label: string
  prompt: string
  description: string
}

export interface OperatingCommandAction {
  label: string
  route: string
  intent: 'prepare' | 'queue' | 'route' | 'inspect' | 'audit'
}

export interface OperatingCommandResponse {
  id: string
  commandId: OperatingCommandId
  title: string
  summary: string
  statusLabel: string
  focusCardId?: string
  focusProposalId?: string
  sourceSuite?: OperatingSuite
  owner?: string
  approvalState?: OperatingApprovalState
  evidence: string[]
  policyChecks: OperatingPolicyCheck[]
  actions: OperatingCommandAction[]
  auditImplication: string
}

export interface OperatingChatResolution {
  intent: OperatingChatIntent
  commandId?: OperatingCommandId
  title: string
  summary: string
  statusLabel: string
  evidence: string[]
  policyChecks: OperatingPolicyCheck[]
  actions: OperatingCommandAction[]
  auditImplication: string
  response?: OperatingCommandResponse
}

export interface ProductOperationAgentSeedData {
  lanes: OperatingLane[]
  cards: OperatingCard[]
  proposals: OperatingAgentProposal[]
  auditEvents: OperatingAuditEvent[]
  metrics: {
    totalCards: number
    pendingApprovals: number
    highRisk: number
    waiting: number
    suitesCovered: number
  }
}

export interface QueueOperatingApprovalResult {
  cards: OperatingCard[]
  proposals: OperatingAgentProposal[]
  status: 'queued' | 'already_queued' | 'blocked'
  proposalId?: string
  changed: boolean
  auditLabel?: string
  message: string
}

export const OPERATING_LANES: OperatingLane[] = [
  {
    id: 'signal',
    label: 'Signal',
    description: 'Raw cross-suite events that need operating context.',
    wipLimit: 5,
  },
  {
    id: 'triage',
    label: 'Triage',
    description: 'Classified work with owner, evidence, and policy checks.',
    wipLimit: 4,
  },
  {
    id: 'decision',
    label: 'Decision',
    description: 'Needs operator or manager approval before execution.',
    wipLimit: 3,
  },
  {
    id: 'in_progress',
    label: 'In progress',
    description: 'Approved actions currently being prepared or executed.',
    wipLimit: 4,
  },
  {
    id: 'waiting',
    label: 'Waiting',
    description: 'Blocked on customer, vendor, finance, or support response.',
    wipLimit: 4,
  },
  {
    id: 'done',
    label: 'Done',
    description: 'Completed work ready for outcome capture.',
    wipLimit: 8,
  },
  {
    id: 'learning',
    label: 'Learning',
    description: 'Post-action feedback that should improve future playbooks.',
    wipLimit: 6,
  },
]

export const OPERATING_COMMAND_PROMPTS: OperatingCommandPrompt[] = [
  {
    id: 'approval_sweep',
    label: 'Review pending approvals',
    prompt: 'Review pending approvals',
    description: 'Find pending approvals and explain the safest next action.',
  },
  {
    id: 'risk_packet',
    label: 'Prepare approval packet',
    prompt: 'Prepare approval packet',
    description: 'Ground the top risk in evidence, policy checks, and source route.',
  },
  {
    id: 'blocked_work',
    label: 'Find high-risk cards',
    prompt: 'Find blocked high-risk cards',
    description: 'Identify waiting or high-risk work that needs an owner response.',
  },
  {
    id: 'audit_summary',
    label: 'Summarize audit changes',
    prompt: 'Summarize audit changes',
    description: 'Explain recent agent activity without implying source mutation.',
  },
]

const severityRank: Record<OperatingSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
}

const pickAlert = (snapshot: PrimeSnapshot): PrimeAlert | undefined =>
  [...snapshot.alerts].sort((left, right) => severityRank[right.severity] - severityRank[left.severity])[0]

const pickForecast = (snapshot: PrimeSnapshot): PrimeForecast | undefined =>
  [...snapshot.forecasts].sort((left, right) => severityRank[right.risk] - severityRank[left.risk])[0]

const pickCampaign = (snapshot: PrimeSnapshot): PrimeCampaign | undefined =>
  snapshot.campaigns.find((campaign) => campaign.status === 'testing') ?? snapshot.campaigns[0]

const pickTicket = (snapshot: PrimeSnapshot): PrimeTicket | undefined =>
  snapshot.tickets.find((ticket) => ticket.priority === 'high') ?? snapshot.tickets[0]

const pickRecommendation = (snapshot: PrimeSnapshot): PrimeRecommendation | undefined => snapshot.recommendations[0]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const basePolicy = (labels: string[], passing = true): OperatingPolicyCheck[] =>
  labels.map((label, index) => ({
    label,
    passed: index === labels.length - 1 ? passing : true,
  }))

export const buildProductOperationAgentSeedData = (snapshot: PrimeSnapshot): ProductOperationAgentSeedData => {
  const alert = pickAlert(snapshot)
  const forecast = pickForecast(snapshot)
  const campaign = pickCampaign(snapshot)
  const ticket = pickTicket(snapshot)
  const recommendation = pickRecommendation(snapshot)

  const cards: OperatingCard[] = []

  if (alert || forecast) {
    cards.push({
      id: 'opa-inventory-risk',
      title: alert?.title ?? `${forecast?.skuCode ?? 'SKU'} demand risk needs review`,
      laneId: alert?.severity === 'high' || forecast?.risk === 'high' ? 'decision' : 'triage',
      sourceSuite: 'Ecom/COS',
      sourceRoute: '/ecom/cos/inventory-brain',
      sourceEntityId: forecast?.skuId ?? alert?.id ?? 'inventory-risk',
      sourceOwner: 'Inventory Brain',
      severity: alert?.severity ?? forecast?.risk ?? 'medium',
      owner: 'Operations lead',
      dueLabel: 'Today',
      ageHours: 4,
      wipClass: 'expedite',
      metricLabel: forecast ? `${forecast.ats} ATS / ${forecast.demand7d} 7d demand` : 'High risk alert',
      businessImpact: 'Stock, listing, and fulfillment decisions can diverge if this is not resolved.',
      recommendedAction: forecast?.suggestedAction ?? 'Review alert and route the next action to the owner.',
      approvalRequired: true,
      approvalState: 'pending',
      evidence: [
        alert ? `Alert: ${alert.title}` : 'Forecast generated an operating signal.',
        forecast ? `Forecast risk: ${forecast.risk} for ${forecast.skuCode}` : `Linked entity: ${alert?.linkedEntity ?? 'inventory'}`,
        `Recommendation link: ${alert?.recommendationId ?? recommendation?.id ?? 'manual-review'}`,
      ],
      policyChecklist: basePolicy(['Owner assigned', 'Evidence linked', 'Manager approval required'], false),
      auditTrail: [
        'Signal created from Prime snapshot.',
        'Agent classified inventory risk as approval-gated operating work.',
      ],
    })
  }

  if (campaign) {
    cards.push({
      id: 'opa-demand-campaign',
      title: `${campaign.name} campaign scale review`,
      laneId: campaign.status === 'testing' ? 'in_progress' : 'triage',
      sourceSuite: 'Demand',
      sourceRoute: '/demand/mdec?view=composer',
      sourceEntityId: campaign.id,
      sourceOwner: 'MDEC',
      severity: campaign.status === 'paused' ? 'medium' : 'low',
      owner: 'Growth operator',
      dueLabel: '24h',
      ageHours: 18,
      wipClass: 'standard',
      metricLabel: `${campaign.leads} leads / ${campaign.rfqs} RFQs`,
      businessImpact: `${formatCurrency(campaign.revenue)} tracked revenue from ${campaign.channel}.`,
      recommendedAction: 'Prepare scale, pause, or retarget decision with spend and conversion evidence.',
      approvalRequired: campaign.spend > 1000,
      approvalState: campaign.spend > 1000 ? 'pending' : 'not_required',
      evidence: [
        `Channel: ${campaign.channel}`,
        `Spend: ${formatCurrency(campaign.spend)}`,
        `Orders: ${campaign.orders} from ${campaign.traffic} visits`,
      ],
      policyChecklist: basePolicy(['Campaign metrics linked', 'Audience segment present', 'Budget guard checked'], campaign.spend <= 1000),
      auditTrail: ['Campaign status imported from Demand Suite.', 'Agent prepared campaign decision packet.'],
    })
  }

  if (ticket) {
    cards.push({
      id: 'opa-customer-blocker',
      title: ticket.subject,
      laneId: ticket.status === 'waiting_ops' ? 'waiting' : 'triage',
      sourceSuite: 'Customer',
      sourceRoute: '/customer/crm-compact?floor=account',
      sourceEntityId: ticket.id,
      sourceOwner: 'CRM',
      severity: ticket.priority === 'high' ? 'high' : 'medium',
      owner: 'Customer operations',
      dueLabel: ticket.sla,
      ageHours: 9,
      wipClass: ticket.priority === 'high' ? 'expedite' : 'standard',
      metricLabel: `${ticket.status.replace('_', ' ')} / ${ticket.priority}`,
      businessImpact: 'Customer promise risk can block launch, renewal, or support recovery.',
      recommendedAction: 'Route blocker to the accountable suite and prepare customer-facing recovery note.',
      approvalRequired: ticket.priority === 'high',
      approvalState: ticket.priority === 'high' ? 'pending' : 'not_required',
      evidence: [
        `Ticket: ${ticket.id}`,
        `Order: ${ticket.orderId ?? 'not linked'}`,
        `Linked entity: ${ticket.linkedEntity}`,
      ],
      policyChecklist: basePolicy(['Customer impact captured', 'Linked order checked', 'Recovery owner assigned'], ticket.priority !== 'high'),
      auditTrail: ['Customer issue linked to operating board.', 'Agent requested owner confirmation.'],
    })
  }

  cards.push({
    id: 'opa-finance-readiness',
    title: 'Launch and margin readiness check',
    laneId: snapshot.metrics.highRiskAlerts > 0 ? 'decision' : 'done',
    sourceSuite: 'Finance',
    sourceRoute: '/finance/fin-support',
    sourceEntityId: 'finance-readiness',
    sourceOwner: 'Fin Support',
    severity: snapshot.metrics.highRiskAlerts > 0 ? 'medium' : 'low',
    owner: 'Finance partner',
    dueLabel: '48h',
    ageHours: 13,
    wipClass: 'standard',
    metricLabel: `${snapshot.metrics.openIssues} open issues`,
    businessImpact: 'Margin, refund, and payment exceptions need visible sign-off before launch motion.',
    recommendedAction: 'Prepare finance readiness packet and attach blockers to the launch decision.',
    approvalRequired: snapshot.metrics.highRiskAlerts > 0,
    approvalState: snapshot.metrics.highRiskAlerts > 0 ? 'pending' : 'not_required',
    evidence: [
      `Revenue: ${snapshot.metrics.revenue}`,
      `Returns: ${snapshot.returnsCount}`,
      `High risk alerts: ${snapshot.metrics.highRiskAlerts}`,
    ],
    policyChecklist: basePolicy(['Finance route linked', 'Open issues counted', 'Launch blocker decision ready'], snapshot.metrics.highRiskAlerts === 0),
    auditTrail: ['Finance readiness generated from Prime metrics.', 'Agent linked readiness to launch decision workflow.'],
  })

  if (recommendation) {
    cards.push({
      id: 'opa-intelligence-recommendation',
      title: recommendation.action,
      laneId: recommendation.confidence >= 0.8 ? 'in_progress' : 'triage',
      sourceSuite: 'Intelligence',
      sourceRoute: '/intelligence/consulting-agent?tab=signals',
      sourceEntityId: recommendation.id,
      sourceOwner: recommendation.operator,
      severity: recommendation.confidence >= 0.85 ? 'medium' : 'low',
      owner: 'Product operations',
      dueLabel: 'Next standup',
      ageHours: 6,
      wipClass: 'standard',
      metricLabel: `${Math.round(recommendation.confidence * 100)}% confidence`,
      businessImpact: recommendation.reasoning,
      recommendedAction: `Prepare next action for ${recommendation.target}.`,
      approvalRequired: false,
      approvalState: 'not_required',
      evidence: [
        `Target: ${recommendation.target}`,
        `Operator: ${recommendation.operator}`,
        `Reasoning: ${recommendation.reasoning}`,
      ],
      policyChecklist: basePolicy(['Reasoning present', 'Target linked', 'No approval gate required']),
      auditTrail: ['Consulting Agent recommendation imported.', 'Agent converted recommendation into operating commitment.'],
    })
  }

  cards.push({
    id: 'opa-learning-loop',
    title: 'Capture operating lesson from completed flow',
    laneId: 'learning',
    sourceSuite: 'Intelligence',
    sourceRoute: '/overview',
    sourceEntityId: snapshot.demoFlows[0]?.id ?? 'learning-loop',
    sourceOwner: 'Prime OS',
    severity: 'low',
    owner: 'Ops enablement',
    dueLabel: 'This week',
    ageHours: 36,
    wipClass: 'learning',
    metricLabel: `${snapshot.demoFlows.length} demo flows`,
    businessImpact: 'Completed work should update playbooks, prompts, and routing heuristics.',
    recommendedAction: 'Summarize what changed and attach the lesson to the next operating review.',
    approvalRequired: false,
    approvalState: 'not_required',
    evidence: [
      `Demo flow: ${snapshot.demoFlows[0]?.name ?? 'overview'}`,
      `Activation plays: ${snapshot.activationPlays.length}`,
      `Insight models: ${snapshot.insightModels.length}`,
    ],
    policyChecklist: basePolicy(['Outcome captured', 'Learning owner assigned', 'Next review linked']),
    auditTrail: ['Learning card created for closed-loop improvement.', 'Agent queued lesson for review.'],
  })

  const proposals: OperatingAgentProposal[] = cards.slice(0, 5).map((card) => ({
    id: `${card.id}-proposal`,
    cardId: card.id,
    agentName: `${card.sourceSuite} operator`,
    title: card.approvalRequired ? `Prepare approval for ${card.title}` : `Prepare execution for ${card.title}`,
    summary: card.recommendedAction,
    actionType: card.approvalRequired ? 'approve' : card.laneId === 'learning' ? 'learn' : 'prepare',
    status: card.approvalRequired ? 'needs_approval' : 'ready',
    route: card.sourceRoute,
    requiresApproval: card.approvalRequired,
  }))

  const auditEvents: OperatingAuditEvent[] = cards.flatMap((card) =>
    card.auditTrail.map((label, index) => ({
      id: `${card.id}-${index}`,
      cardId: card.id,
      label,
      actor: index === 0 ? card.sourceOwner : 'Operation Agent',
      timestampLabel: index === 0 ? `${card.ageHours}h ago` : 'Now',
    })),
  )

  return {
    lanes: OPERATING_LANES,
    cards,
    proposals,
    auditEvents,
    metrics: {
      totalCards: cards.length,
      pendingApprovals: cards.filter((card) => card.approvalState === 'pending').length,
      highRisk: cards.filter((card) => card.severity === 'high').length,
      waiting: cards.filter((card) => card.laneId === 'waiting').length,
      suitesCovered: new Set(cards.map((card) => card.sourceSuite)).size,
    },
  }
}

export const moveOperatingCard = (
  cards: OperatingCard[],
  cardId: string,
  laneId: OperatingLaneId,
  actor = 'Operation Agent operator',
): OperatingCard[] =>
  cards.map((card) =>
    card.id === cardId
      ? {
          ...card,
          laneId,
          auditTrail: [`${actor} moved card to ${OPERATING_LANES.find((lane) => lane.id === laneId)?.label ?? laneId}.`, ...card.auditTrail],
        }
      : card,
  )

export const resolveOperatingCommandId = (input: string): OperatingCommandId => {
  const normalized = input.toLowerCase()

  if (normalized.includes('audit') || normalized.includes('log')) return 'audit_summary'
  if (normalized.includes('block') || normalized.includes('waiting')) return 'blocked_work'
  if (normalized.includes('inventory') || normalized.includes('risk') || normalized.includes('packet')) return 'risk_packet'
  return 'approval_sweep'
}

const unsafeMutationPatterns = [
  /\bapprove\s+(all|everything)\b/,
  /^approve\b/,
  /\bapprove\s+(this|the|proposal|card|item|inventory|risk)\b/,
  /\bauto[-\s]?approve\b/,
  /\bexecute\b/,
  /\bdelete\b/,
  /\bapply\b/,
  /\bupdate\s+source\b/,
  /\bwrite\s+to\s+source\b/,
  /\bmutate\b/,
]

const greetingPatterns = [
  /^(hello|hi|hey|yo|helo)$/i,
  /^(xin\s+chào|chào|chao|alo)$/i,
]

export const resolveOperatingChatIntent = (input: string): OperatingChatIntent => {
  const normalized = input.trim().toLowerCase()
  if (!normalized) return 'clarify'

  if (unsafeMutationPatterns.some((pattern) => pattern.test(normalized))) return 'unsafe_mutation'
  if (greetingPatterns.some((pattern) => pattern.test(normalized))) return 'greeting'
  if (normalized.includes('audit') || normalized.includes('log')) return 'audit_summary'
  if (normalized.includes('block') || normalized.includes('waiting')) return 'blocked_work'
  if (normalized.includes('inventory') || normalized.includes('risk') || normalized.includes('packet')) return 'risk_packet'
  if (normalized.includes('approval') || normalized.includes('approve') || normalized.includes('sign-off') || normalized.includes('sign off')) return 'approval_sweep'

  return 'clarify'
}

export const buildOperatingChatResolution = (
  cards: OperatingCard[],
  proposals: OperatingAgentProposal[],
  input: string,
): OperatingChatResolution => {
  const intent = resolveOperatingChatIntent(input)

  if (intent === 'greeting') {
    return {
      intent,
      title: 'Operation Agent is ready',
      summary: 'Ask me to prepare approval packets, surface blocked work, review inventory risk, or summarize audit changes.',
      statusLabel: 'Ready',
      evidence: ['Session-local chat is active.', 'No source system has been changed.'],
      policyChecks: [{ label: 'No source mutation', passed: true }],
      actions: [{ label: 'Open audit', route: '/intelligence/product-operation-agent?view=audit', intent: 'audit' }],
      auditImplication: 'Greeting only. Nothing is queued or changed.',
    }
  }

  if (intent === 'unsafe_mutation') {
    return {
      intent,
      title: 'I cannot run that action directly',
      summary: 'This command looks like a direct mutation. I can prepare the packet, route it to Agent Queue, or open Audit so an operator can approve it explicitly.',
      statusLabel: 'Blocked',
      evidence: ['Operator approval is required before source-impacting work.', 'Agent Queue is the only approval surface in this MVP.'],
      policyChecks: [
        { label: 'Direct mutation blocked', passed: true },
        { label: 'Approval remains operator-controlled', passed: true },
      ],
      actions: [
        { label: 'Open Agent Queue', route: '/intelligence/product-operation-agent?view=queue', intent: 'route' },
        { label: 'Open audit', route: '/intelligence/product-operation-agent?view=audit', intent: 'audit' },
      ],
      auditImplication: 'Unsafe direct execution was blocked. No source system or approval state changed.',
    }
  }

  if (intent === 'clarify') {
    return {
      intent,
      title: 'Choose an operating command',
      summary: 'I need a clearer operating intent. Use a suggested command or ask for approvals, blocked work, inventory risk, or audit changes.',
      statusLabel: 'Needs clarification',
      evidence: ['The prompt did not match a governed Operation Agent workflow.'],
      policyChecks: [{ label: 'No action prepared until intent is clear', passed: true }],
      actions: [{ label: 'Open in Kanban', route: '/intelligence/product-operation-agent?view=kanban', intent: 'route' }],
      auditImplication: 'Clarification only. No packet, queue item, or source change was created.',
    }
  }

  const response = buildOperatingCommandResponse(cards, proposals, intent)

  return {
    intent,
    commandId: intent,
    title: response.title,
    summary: response.summary,
    statusLabel: response.statusLabel,
    evidence: response.evidence,
    policyChecks: response.policyChecks,
    actions: response.actions,
    auditImplication: response.auditImplication,
    response,
  }
}

export const queueOperatingApproval = (
  cards: OperatingCard[],
  proposals: OperatingAgentProposal[],
  response: OperatingCommandResponse,
  actor = 'Operation Agent chat',
): QueueOperatingApprovalResult => {
  const focusCard = response.focusCardId ? cards.find((card) => card.id === response.focusCardId) : undefined
  if (!focusCard) {
    return {
      cards,
      proposals,
      status: 'blocked',
      changed: false,
      message: 'No focus card was available, so no approval packet was queued.',
    }
  }

  const proposalId = response.focusProposalId ?? `chat-${focusCard.id}`
  const existingProposal = proposals.find((proposal) => proposal.id === proposalId || proposal.cardId === focusCard.id)
  const isTerminal = existingProposal ? ['approved', 'executed', 'rejected'].includes(existingProposal.status) : false
  if (isTerminal) {
    return {
      cards,
      proposals,
      status: 'blocked',
      proposalId: existingProposal?.id,
      changed: false,
      message: `${focusCard.title} already has a terminal queue decision. Open Agent Queue or Audit before preparing a new approval packet.`,
    }
  }

  const auditLabel = `${actor} queued ${focusCard.title} for Agent Queue review.`
  const shouldAppendAudit = !isTerminal && !focusCard.auditTrail.includes(auditLabel)
  const cardsWithAudit = cards.map((card) =>
    card.id === focusCard.id && shouldAppendAudit
      ? { ...card, auditTrail: [auditLabel, ...card.auditTrail] }
      : card,
  )

  if (existingProposal) {
    return {
      cards: cardsWithAudit,
      proposals,
      status: shouldAppendAudit ? 'queued' : 'already_queued',
      proposalId: existingProposal.id,
      changed: shouldAppendAudit,
      auditLabel,
      message: shouldAppendAudit ? auditLabel : `${focusCard.title} is already queued for approval. No duplicate queue item was created.`,
    }
  }

  const nextProposal: OperatingAgentProposal = {
    id: proposalId,
    cardId: focusCard.id,
    agentName: 'Operation Agent',
    title: `Review ${focusCard.title}`,
    summary: response.summary,
    actionType: 'prepare',
    status: 'needs_approval',
    route: '/intelligence/product-operation-agent?view=queue',
    requiresApproval: true,
  }

  return {
    cards: cardsWithAudit,
    proposals: [nextProposal, ...proposals],
    status: 'queued',
    proposalId,
    changed: true,
    auditLabel,
    message: auditLabel,
  }
}

const findCommandCard = (cards: OperatingCard[], commandId: OperatingCommandId) => {
  if (commandId === 'blocked_work') {
    return cards.find((card) => card.laneId === 'waiting') ?? cards.find((card) => card.severity === 'high') ?? cards[0]
  }

  if (commandId === 'risk_packet') {
    return cards.find((card) => card.sourceSuite === 'Ecom/COS' && card.severity !== 'low') ?? cards.find((card) => card.severity === 'high') ?? cards[0]
  }

  if (commandId === 'audit_summary') {
    return cards.find((card) => card.auditTrail.length > 0) ?? cards[0]
  }

  return cards.find((card) => card.approvalState === 'pending') ?? cards.find((card) => card.approvalRequired) ?? cards[0]
}

export const buildOperatingCommandResponse = (
  cards: OperatingCard[],
  proposals: OperatingAgentProposal[],
  commandId: OperatingCommandId,
): OperatingCommandResponse => {
  const focusCard = findCommandCard(cards, commandId)
  const focusProposal = focusCard ? proposals.find((proposal) => proposal.cardId === focusCard.id) : undefined
  const pendingApprovals = cards.filter((card) => card.approvalState === 'pending')
  const blockedCards = cards.filter((card) => card.laneId === 'waiting' || card.severity === 'high')
  const auditEntries = cards.flatMap((card) => card.auditTrail.map((entry) => ({ card, entry })))

  if (!focusCard) {
    return {
      id: `${commandId}-empty`,
      commandId,
      title: 'No operating work needs action',
      summary: 'The agent did not find a matching card for this command.',
      statusLabel: 'Audit-only',
      evidence: ['No card matched the current command.'],
      policyChecks: [],
      actions: [{ label: 'Open audit', route: '/intelligence/product-operation-agent?view=audit', intent: 'audit' }],
      auditImplication: 'No source data changes were prepared.',
    }
  }

  const baseActions: OperatingCommandAction[] = [
    { label: 'Open source route', route: focusCard.sourceRoute, intent: 'inspect' },
    { label: 'Open in Kanban', route: '/intelligence/product-operation-agent?view=kanban', intent: 'route' },
  ]

  if (commandId === 'audit_summary') {
    return {
      id: `${commandId}-${focusCard.id}`,
      commandId,
      title: 'Audit summary is ready',
      summary: `I found ${auditEntries.length} audit events across ${cards.length} operating cards. The latest relevant card is ${focusCard.title}.`,
      statusLabel: 'Audit-only',
      focusCardId: focusCard.id,
      focusProposalId: focusProposal?.id,
      sourceSuite: focusCard.sourceSuite,
      owner: focusCard.owner,
      approvalState: focusCard.approvalState,
      evidence: auditEntries.slice(0, 3).map(({ card, entry }) => `${card.sourceSuite}: ${entry}`),
      policyChecks: focusCard.policyChecklist,
      actions: [...baseActions, { label: 'Open audit', route: '/intelligence/product-operation-agent?view=audit', intent: 'audit' }],
      auditImplication: 'This summarizes trace state only. It does not mutate source systems.',
    }
  }

  if (commandId === 'blocked_work') {
    return {
      id: `${commandId}-${focusCard.id}`,
      commandId,
      title: `${blockedCards.length} blocked or high-risk items need owner response`,
      summary: `${focusCard.title} is the first item to review. Owner is ${focusCard.owner}, source is ${focusCard.sourceOwner}, due ${focusCard.dueLabel}.`,
      statusLabel: focusCard.approvalRequired ? 'Needs approval' : 'Needs owner response',
      focusCardId: focusCard.id,
      focusProposalId: focusProposal?.id,
      sourceSuite: focusCard.sourceSuite,
      owner: focusCard.owner,
      approvalState: focusCard.approvalState,
      evidence: focusCard.evidence,
      policyChecks: focusCard.policyChecklist,
      actions: [...baseActions, { label: 'Prepare owner handoff', route: focusCard.sourceRoute, intent: 'prepare' }],
      auditImplication: 'Preparing the handoff adds trace context only after operator confirmation.',
    }
  }

  if (commandId === 'risk_packet') {
    return {
      id: `${commandId}-${focusCard.id}`,
      commandId,
      title: `Risk packet prepared for ${focusCard.title}`,
      summary: `${focusCard.businessImpact} Recommended safe next action: ${focusCard.recommendedAction}`,
      statusLabel: focusCard.approvalRequired ? 'Approval required' : 'Ready to route',
      focusCardId: focusCard.id,
      focusProposalId: focusProposal?.id,
      sourceSuite: focusCard.sourceSuite,
      owner: focusCard.owner,
      approvalState: focusCard.approvalState,
      evidence: focusCard.evidence,
      policyChecks: focusCard.policyChecklist,
      actions: [
        ...baseActions,
        {
          label: focusCard.approvalRequired ? 'Queue approval' : 'Prepare packet',
          route: '/intelligence/product-operation-agent?view=queue',
          intent: focusCard.approvalRequired ? 'queue' : 'prepare',
        },
      ],
      auditImplication: 'The packet is prepared for review; no inventory or finance source data is changed.',
    }
  }

  return {
    id: `${commandId}-${focusCard.id}`,
    commandId,
    title: `${pendingApprovals.length} approvals need operator attention`,
    summary: `${focusCard.title} is the first approval candidate. The agent can prepare the packet and route it to Agent Queue.`,
    statusLabel: 'Needs approval',
    focusCardId: focusCard.id,
    focusProposalId: focusProposal?.id,
    sourceSuite: focusCard.sourceSuite,
    owner: focusCard.owner,
    approvalState: focusCard.approvalState,
    evidence: focusCard.evidence,
    policyChecks: focusCard.policyChecklist,
    actions: [...baseActions, { label: 'Queue approval', route: '/intelligence/product-operation-agent?view=queue', intent: 'queue' }],
    auditImplication: 'Approval queue routing is explicit and reversible in this MVP.',
  }
}
