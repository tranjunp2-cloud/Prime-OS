import type { ConnectedChannelRecord } from './channel-integrations-api';

export type SalesSetupIntent = 'later' | 'manual' | 'channel';
export type SalesSetupStepState = 'pending' | 'complete' | 'running' | 'attention';
export interface SalesSetupStep {
  key: string;
  title: string;
  description: string;
  action: string;
  target_url: string;
  status: SalesSetupStepState;
}
export interface SalesSetupFacts {
  productCount: number;
  warehouseIds: string[];
  channels: ConnectedChannelRecord[];
}
export interface SalesSetupStatus {
  intent: SalesSetupIntent;
  steps: SalesSetupStep[];
  completed: number;
  complete: boolean;
  next: SalesSetupStep | null;
}

/** Saved onboarding answers select a path; only saved resources finish its tasks. */
export function buildSalesSetup(intent: SalesSetupIntent, stockNeeded: boolean, facts: SalesSetupFacts): SalesSetupStatus {
  const steps: SalesSetupStep[] = [];
  const connected = facts.channels.filter(channel => channel.status !== 'EXPIRED');
  const synced = connected.filter(channel => channel.status === 'CONNECTED' && channel.sync_progress === 100 && Boolean(channel.last_sync_at));
  const channelsUrl = '/sales-channels/connected-channels';
  if (intent === 'manual') {
    steps.push({ key: 'product', title: 'Add your first product', description: 'Create a Product Master to start building your catalog.', action: 'Add product', target_url: '/products/new', status: facts.productCount > 0 ? 'complete' : 'pending' });
  }
  if (intent === 'channel') {
    steps.push({ key: 'channel', title: 'Connect your first sales channel', description: 'Connect a shop to bring its catalog into your workspace.', action: 'Connect channel', target_url: channelsUrl, status: connected.length ? 'complete' : facts.channels.length ? 'attention' : 'pending' });
    const syncing = connected.some(channel => channel.status === 'INITIAL_SYNCING');
    const failed = connected.some(channel => channel.status === 'SYNC_ERROR');
    steps.push({ key: 'sync', title: 'Check your first sync', description: synced.length ? 'Your first shop sync finished successfully.' : syncing ? 'Your shop is syncing. You can keep exploring while it runs.' : failed ? 'A sync needs attention. Open your channel to review and retry it.' : 'After connecting a shop, check that its initial sync finishes successfully.', action: syncing ? 'View sync' : failed ? 'Review sync' : 'Check sync', target_url: channelsUrl, status: synced.length ? 'complete' : syncing ? 'running' : failed ? 'attention' : 'pending' });
  }
  // Stock setup is only relevant when the seller chose to manage stock.
  if (stockNeeded && intent !== 'later') {
    steps.push({ key: 'warehouse', title: 'Set up your stock location', description: 'Save an active warehouse for the stock you manage.', action: 'Set up warehouse', target_url: '/warehouses', status: facts.warehouseIds.length ? 'complete' : 'pending' });
    if (intent === 'channel') {
      steps.push({ key: 'mapping', title: 'Link your shop to a warehouse', description: 'Choose the warehouse that will fulfill orders for your connected shop.', action: 'Link warehouse', target_url: channelsUrl, status: synced.some(channel => channel.warehouse && facts.warehouseIds.includes(channel.warehouse.id)) ? 'complete' : 'pending' });
    }
  }
  const completed = steps.filter(step => step.status === 'complete').length;
  return { intent, steps, completed, complete: steps.length > 0 && completed === steps.length, next: steps.find(step => step.status !== 'complete') ?? null };
}
