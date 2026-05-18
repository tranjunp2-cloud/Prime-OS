// return-detail-utils — referenced by ReturnReviewQueue

export type ReturnQueueFilter = 'pending' | 'reviewed' | 'all';

export interface ReturnReviewStats {
  total: number;
  pending: number;
  reviewed: number;
  passCount: number;
  failCount: number;
}

export function getReturnReviewStats(items: Array<{ qc_outcome?: string | null }>): ReturnReviewStats {
  const total = items.length;
  const pending = items.filter(i => !i.qc_outcome).length;
  const reviewed = total - pending;
  const passCount = items.filter(i => i.qc_outcome === 'pass').length;
  const failCount = items.filter(i => i.qc_outcome === 'fail').length;
  return { total, pending, reviewed, passCount, failCount };
}
