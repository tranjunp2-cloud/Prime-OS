import type {
  CopilotConfidenceBucket,
  CopilotContextSummary,
  CopilotGroundingMeta,
  CopilotGroundingSource,
  CopilotResponse,
} from '@/components/copilot/types';

export interface CopilotContextSnapshot {
  domain: CopilotContextSummary['domain'];
  title: string;
  description: string;
  insight?: string;
  citations: string[];
  retrievedAt: string;
  freshness: CopilotGroundingMeta['freshness'];
  policyTags: string[];
}

export function readContextSnapshot(context: CopilotContextSummary): CopilotContextSnapshot {
  return {
    domain: context.domain,
    title: context.title,
    description: context.description,
    insight: context.insight,
    citations: context.citations,
    retrievedAt: new Date().toISOString(),
    freshness: inferContextFreshness(context.citations),
    policyTags: ['context-read-only', 'frontend-read-only-default'],
  };
}

export function buildResponseGrounding(
  response: CopilotResponse,
  snapshot: CopilotContextSnapshot,
): CopilotGroundingMeta {
  const sources = inferGroundingSources(response);
  const citations = response.citations?.length ? response.citations : snapshot.citations;
  const confidence = response.debug?.confidenceBucket ?? 'medium';

  return {
    sources,
    citations,
    retrievedAt: snapshot.retrievedAt,
    freshness: inferResponseFreshness(sources, snapshot.freshness),
    confidence,
    policyTags: [
      ...snapshot.policyTags,
      response.intent === 'write_draft' ? 'draft-before-commit' : 'no-mutation',
    ],
  };
}

function inferGroundingSources(response: CopilotResponse): CopilotGroundingSource[] {
  const sources = new Set<CopilotGroundingSource>();

  if (response.entityRef) sources.add('local_store');
  if (response.intent === 'write_draft') sources.add('draft_prefill');
  if (response.debug?.usedConversationMemory) sources.add('session_memory');
  if (response.citations?.some((citation) => /knowledge|plan|pricing|boundary/i.test(citation))) sources.add('knowledge_base');
  if (!sources.size) sources.add('route_context');

  return [...sources];
}

function inferContextFreshness(citations: string[]): CopilotGroundingMeta['freshness'] {
  if (citations.some((citation) => /boundary|knowledge|pricing/i.test(citation))) return 'static_knowledge';
  if (citations.length) return 'live_session';
  return 'unknown';
}

function inferResponseFreshness(
  sources: CopilotGroundingSource[],
  fallback: CopilotGroundingMeta['freshness'],
): CopilotGroundingMeta['freshness'] {
  if (sources.includes('knowledge_base')) return 'static_knowledge';
  if (sources.includes('local_store') || sources.includes('route_context') || sources.includes('session_memory')) return 'live_session';
  return fallback;
}

export function confidenceFromGrounding(grounding: CopilotGroundingMeta): CopilotConfidenceBucket {
  if (grounding.sources.includes('local_store')) return 'high';
  return grounding.confidence;
}
