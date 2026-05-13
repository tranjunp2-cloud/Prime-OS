import { describe, expect, it } from 'vitest';
import { buildMdecSeedData } from './mdec-seed-data';
import { getPrimeSnapshot } from './prime-data';

describe('MDEC seed data linkage', () => {
  it('derives MDEC posts and queues from PrimeOS COS/Demand snapshot entities', () => {
    const snapshot = getPrimeSnapshot();
    const seed = buildMdecSeedData(snapshot);
    const campaignIds = new Set(snapshot.campaigns.map((campaign) => campaign.id));
    const productIds = new Set(snapshot.products.map((product) => product.id));
    const leadIds = new Set(snapshot.leads.map((lead) => lead.id));
    const customerIds = new Set(snapshot.customers.map((customer) => customer.id));

    expect(seed.scheduledPosts.length).toBeGreaterThan(0);
    expect(seed.scheduledPosts.every((post) => campaignIds.has(post.campaignId))).toBe(true);
    expect(seed.scheduledPosts.every((post) => productIds.has(post.productId))).toBe(true);
    expect(seed.approvals.every((approval) => campaignIds.has(approval.campaignId))).toBe(true);
    expect(seed.inbound.every((item) => leadIds.has(item.leadId))).toBe(true);
    expect(seed.inbound.every((item) => customerIds.has(item.customerId))).toBe(true);
    expect(seed.clusters.every((cluster) => campaignIds.has(cluster.campaignId))).toBe(true);
  });

  it('keeps MDEC metrics consistent with the generated linked records', () => {
    const seed = buildMdecSeedData(getPrimeSnapshot());

    expect(seed.metrics.scheduled).toBe(seed.scheduledPosts.filter((post) => post.status === 'Scheduled').length);
    expect(seed.metrics.pendingReview).toBe(seed.approvals.length);
    expect(seed.metrics.highSeverity).toBe(seed.severeItems.length);
    expect(seed.metrics.unreadEngagement).toBeGreaterThanOrEqual(seed.inbound.length);
    expect(seed.metrics.reach).toBeGreaterThan(0);
    expect(seed.metrics.clicks).toBeGreaterThan(0);
  });
});
