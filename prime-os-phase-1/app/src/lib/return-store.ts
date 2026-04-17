// Return Store — singleton in-memory for local mockup

export type ReturnStatus = 'authorized' | 'in_transit' | 'received' | 'qc' | 'dispositioned' | 'completed';
export type QCGrade = 'A' | 'B' | 'C' | 'D';
export type Disposition = 'restock' | 'unfulfillable' | 'refurbish' | 'liquidation' | 'destroy';

export interface ReturnItem {
  id: string;
  order_id: string | null;
  rma_number: string | null;
  reason: string | null;
  status: ReturnStatus;
  qc_grade: QCGrade | null;
  disposition: Disposition | null;
  refund_amount: number | null;
  qc_notes: string | null;
  created_at: string;
  received_at: string | null;
  completed_at: string | null;
}

let _returns: ReturnItem[] = [];

export function getReturns(): ReturnItem[] {
  return _returns;
}

export function getReturnById(id: string): ReturnItem | undefined {
  return _returns.find((item) => item.id === id);
}

export function addReturnItem(r: ReturnItem): void {
  _returns = [r, ..._returns];
}

export function clearReturnStore(): void {
  _returns = [];
}

export function updateReturn(id: string, updates: Partial<ReturnItem>): void {
  _returns = _returns.map(r => r.id === id ? { ...r, ...updates } : r);
}
