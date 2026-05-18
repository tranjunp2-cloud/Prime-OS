// Product State Machine — ECH Product Workflow
// Dựa trên state-machine-designer skill
// SSOT: Product Master owns this state machine
//
// Flow: DRAFT → IN_REVIEW → APPROVED → PUBLISHED → ARCHIVED
//                       ↓
//                 REJECTED
//                                         ↓
//                                    UNPUBLISHED

export type ProductState =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED'
  | 'REJECTED'
  | 'UNPUBLISHED';

export type ProductEvent =
  | { type: 'SUBMIT_FOR_REVIEW' }
  | { type: 'APPROVE' }
  | { type: 'REJECT'; reason: string }
  | { type: 'PUBLISH' }
  | { type: 'UNPUBLISH' }
  | { type: 'ARCHIVE' };

// Transition table
const transitions: Record<ProductState, Partial<Record<ProductEvent['type'], ProductState>>> = {
  DRAFT: { SUBMIT_FOR_REVIEW: 'IN_REVIEW' },
  IN_REVIEW: { APPROVE: 'APPROVED', REJECT: 'REJECTED' },
  APPROVED: { PUBLISH: 'PUBLISHED' },
  PUBLISHED: { UNPUBLISH: 'UNPUBLISHED', ARCHIVE: 'ARCHIVED' },
  ARCHIVED: {},
  REJECTED: { SUBMIT_FOR_REVIEW: 'IN_REVIEW' },
  UNPUBLISHED: { PUBLISH: 'PUBLISHED', ARCHIVE: 'ARCHIVED' },
};

export interface TransitionResult {
  success: boolean;
  nextState?: ProductState;
  error?: string;
}

/**
 * Attempt a state transition. Returns null if invalid.
 */
export function transitionProduct(
  current: ProductState,
  event: ProductEvent
): ProductState | null {
  return transitions[current]?.[event.type] ?? null;
}

/**
 * Check if a transition is valid without applying it.
 */
export function canTransition(current: ProductState, event: ProductEvent): boolean {
  return transitions[current]?.[event.type] !== undefined;
}

/**
 * Get all valid next states from current state.
 */
export function getValidNextStates(current: ProductState): ProductState[] {
  const valid = transitions[current];
  if (!valid) return [];
  return Object.values(valid) as ProductState[];
}

/**
 * Apply a transition with result封装.
 */
export function applyTransition(
  current: ProductState,
  event: ProductEvent
): TransitionResult {
  const next = transitionProduct(current, event);
  if (!next) {
    return {
      success: false,
      error: `Invalid transition: ${current} --(${event.type})--> ?`,
    };
  }
  return { success: true, nextState: next };
}

/**
 * State display metadata
 */
export const PRODUCT_STATE_META: Record<ProductState, { label: string; color: string; description: string }> = {
  DRAFT: {
    label: 'Draft',
    color: 'bg-muted text-muted-foreground',
    description: 'Product is being prepared, not visible to channels.',
  },
  IN_REVIEW: {
    label: 'In Review',
    color: 'bg-amber-500/14 text-amber-800 dark:bg-amber-500/18 dark:text-amber-300',
    description: 'Pending review before publishing.',
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-sky-500/14 text-sky-700 dark:bg-sky-500/18 dark:text-sky-300',
    description: 'Approved but not yet published.',
  },
  PUBLISHED: {
    label: 'Published',
    color: 'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    description: 'Live on selected channels.',
  },
  ARCHIVED: {
    label: 'Archived',
    color: 'bg-rose-500/14 text-rose-700 dark:bg-rose-500/18 dark:text-rose-300',
    description: 'Archived and no longer active.',
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-orange-500/14 text-orange-700 dark:bg-orange-500/18 dark:text-orange-300',
    description: 'Rejected during review.',
  },
  UNPUBLISHED: {
    label: 'Unpublished',
    color: 'bg-violet-500/14 text-violet-700 dark:bg-violet-500/18 dark:text-violet-300',
    description: 'Was published but taken offline.',
  },
};
