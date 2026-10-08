export type WorkflowAction = 'prepare' | 'record-shipment' | 'pack' | 'handover' | 'delivery';
export interface WorkflowOrder {
  source: string;
  canonicalStatus: string;
  hold?: { active: boolean };
  payment: {state:string;method:string};
  metadata: {handlingType?:string;shippingMode?:string;warehouse?:string};
  lines: unknown[];
  exceptions: {status:string}[];
  returnRequests: {status:string}[];
  shipments: {tracking?:string;deliveryOutcome?:string;pickedUpAt?:string}[];
  operations?: {work?:{preparedAt?:string;packedAt?:string}};
  readyForPickup?: boolean;
}
export const workflowLabels: Record<WorkflowAction, string>;
export const workflowActions: WorkflowAction[];
export function activeReturn(order:WorkflowOrder):boolean;
export function paymentAllowsPreparation(order:WorkflowOrder):boolean;
export function completionBlocker(order:WorkflowOrder):string|null;
export function workflowBlocker(order:WorkflowOrder,action:WorkflowAction):string|null;
export function nextWorkflowAction(order:WorkflowOrder):{key:WorkflowAction;label:string;blocker:string|null}|null;
