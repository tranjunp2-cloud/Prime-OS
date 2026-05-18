import { getPrimeSnapshot, type PrimeSnapshot } from './prime-data';

export interface MdecScheduledPost {
  id: string;
  title: string;
  when: string;
  campaign: string;
  campaignId: string;
  productId: string;
  skuId: string;
  status: 'Scheduled' | 'Approved' | 'Review' | 'Blocked';
  channels: string[];
}

export interface MdecSevereItem {
  id: string;
  tone: 'Critical' | 'High' | 'Medium';
  sentiment: 'Negative' | 'Neutral';
  title: string;
  source: string;
  owner: string;
  campaignId: string;
  productId: string;
  linkedEntityId: string;
}

export interface MdecInboundItem {
  id: string;
  channel: string;
  name: string;
  tone: 'Positive' | 'Neutral' | 'Negative';
  body: string;
  leadId: string;
  customerId: string;
  campaignId: string;
  action: 'Create RFQ' | 'Create Lead' | 'Escalate' | 'Assign reply';
}

export interface MdecTrendCluster {
  id: string;
  title: string;
  volume: string;
  body: string;
  pos: number;
  neu: number;
  neg: number;
  sourceId: string;
  campaignId: string;
}

export interface MdecApprovalItem {
  id: string;
  title: string;
  owner: string;
  risk: 'Low' | 'Medium' | 'High';
  next: string;
  campaignId: string;
  productId: string;
}

export interface MdecReportItem {
  id: string;
  title: string;
  status: 'ready' | 'draft';
  campaignId: string;
}

export interface MdecSeedData {
  scheduledPosts: MdecScheduledPost[];
  severeItems: MdecSevereItem[];
  inbound: MdecInboundItem[];
  clusters: MdecTrendCluster[];
  approvals: MdecApprovalItem[];
  reports: MdecReportItem[];
  metrics: {
    scheduled: number;
    pendingReview: number;
    highSeverity: number;
    unreadEngagement: number;
    reach: number;
    impressions: number;
    engagementRate: number;
    clicks: number;
  };
}

const postStatuses: MdecScheduledPost['status'][] = ['Scheduled', 'Scheduled', 'Review', 'Blocked'];
const channelSets = [['IG', 'FB', 'IN'], ['IN', 'FB', 'IG'], ['X', 'IG'], ['FB', 'WA']];
const owners = ['Demand Ops', 'Creator Desk', 'Sales Ops', 'Service Recovery'];

function formatPostTitle(campaignName: string, index: number) {
  return [
    `${campaignName} announcement`,
    `Creator proof: ${campaignName}`,
    `RFQ fast quote intake`,
    `Trust recovery note`,
  ][index] || `${campaignName} update`;
}

function riskFromIndex(index: number): MdecApprovalItem['risk'] {
  if (index === 0) return 'Low';
  if (index === 1) return 'Medium';
  return 'High';
}

function sentimentTone(sentiment: string): MdecInboundItem['tone'] {
  if (sentiment === 'positive') return 'Positive';
  if (sentiment === 'negative') return 'Negative';
  return 'Neutral';
}

export function buildMdecSeedData(snapshot: PrimeSnapshot): MdecSeedData {
  const campaigns = snapshot.campaigns.length ? snapshot.campaigns : [];
  const firstCampaign = campaigns[0];
  const scheduledPosts = campaigns.slice(0, 4).map((campaign, index) => ({
    id: `mdec_post_${index + 1}_${campaign.id}`,
    title: formatPostTitle(campaign.name, index),
    when: `${14 + index} May 2026, ${index % 2 === 0 ? '09:00' : '16:00'}`,
    campaign: campaign.name,
    campaignId: campaign.id,
    productId: campaign.productId,
    skuId: campaign.skuId,
    status: postStatuses[index] || 'Scheduled',
    channels: channelSets[index] || ['IN', 'FB'],
  }));

  const approvals = scheduledPosts.slice(1, 4).map((post, index) => ({
    id: `mdec_approval_${index + 1}_${post.campaignId}`,
    title: post.title,
    owner: owners[index + 1] || 'Demand Ops',
    risk: riskFromIndex(index),
    next: ['Approve before 16:00', 'Add legal note', 'Route to escalation'][index] || 'Review content',
    campaignId: post.campaignId,
    productId: post.productId,
  }));

  const severeItems = snapshot.alerts.slice(0, 3).map((alert, index) => {
    const campaign = campaigns[index % Math.max(campaigns.length, 1)] || firstCampaign;
    const ticket = snapshot.tickets[index % Math.max(snapshot.tickets.length, 1)];
    return {
      id: `mdec_escalation_${alert.id}`,
      tone: index === 0 ? 'Critical' : 'High',
      sentiment: 'Negative',
      title: alert.title,
      source: `${ticket?.linkedEntity || alert.linkedEntity} · “${ticket?.subject || alert.title}”`,
      owner: ['Service Recovery', 'COS Ops', 'Finance Trust'][index] || 'Demand Ops',
      campaignId: campaign?.id || 'missing-campaign',
      productId: campaign?.productId || 'missing-product',
      linkedEntityId: alert.linkedEntity,
    };
  });

  const inbound = snapshot.leads.slice(0, 5).map((lead, index) => {
    const customer = snapshot.customers.find((item) => item.id === lead.customerId);
    const voc = snapshot.vocInsights.find((item) => item.customerId === lead.customerId) || snapshot.vocInsights[index % Math.max(snapshot.vocInsights.length, 1)];
    return {
      id: `mdec_inbound_${lead.id}`,
      channel: ['FB', 'IG', 'IN', 'X', 'FB'][index] || 'FB',
      name: customer?.name || lead.contact,
      tone: sentimentTone(voc?.sentiment || (index === 0 ? 'neutral' : 'positive')),
      body: voc?.summary || `${lead.company} asked about ${lead.source} and ${lead.lastTouch}.`,
      leadId: lead.id,
      customerId: lead.customerId,
      campaignId: lead.campaignId,
      action: index === 0 ? 'Create RFQ' : index === 1 ? 'Create Lead' : index === 2 ? 'Escalate' : 'Assign reply',
    };
  });

  const clusters = snapshot.socialStreams.slice(0, 3).map((stream, index) => {
    const campaign = campaigns[index % Math.max(campaigns.length, 1)] || firstCampaign;
    const negativeCount = snapshot.vocInsights.filter((item) => item.sentiment === 'negative').length;
    return {
      id: `mdec_cluster_${stream.id}`,
      title: [
        `${campaign?.targetSegment || 'Demand'} reception`,
        `${campaign?.name || 'Campaign'} transparency`,
        'Founder testimonials',
      ][index] || stream.source,
      volume: String(Math.max(1, Math.round(stream.eventVolume / 1000))).padStart(2, '0'),
      body: stream.audienceSignal,
      pos: snapshot.vocInsights.filter((item) => item.sentiment === 'positive').length || 1,
      neu: snapshot.vocInsights.filter((item) => item.sentiment === 'neutral').length,
      neg: index === 1 ? Math.max(1, negativeCount) : 0,
      sourceId: stream.id,
      campaignId: campaign?.id || 'missing-campaign',
    };
  });

  const reports: MdecReportItem[] = [
    { id: `mdec_report_monthly_${firstCampaign?.id || 'seed'}`, title: 'Monthly Performance', status: 'ready', campaignId: firstCampaign?.id || 'missing-campaign' },
    { id: `mdec_report_weekly_${campaigns[1]?.id || firstCampaign?.id || 'seed'}`, title: 'Weekly Performance', status: 'draft', campaignId: campaigns[1]?.id || firstCampaign?.id || 'missing-campaign' },
  ];

  const reach = snapshot.socialStreams.reduce((sum, stream) => sum + stream.eventVolume, 0);
  const impressions = reach * 7;

  return {
    scheduledPosts,
    severeItems,
    inbound,
    clusters,
    approvals,
    reports,
    metrics: {
      scheduled: scheduledPosts.filter((post) => post.status === 'Scheduled').length,
      pendingReview: approvals.length,
      highSeverity: severeItems.filter((item) => item.tone === 'Critical' || item.tone === 'High').length,
      unreadEngagement: inbound.length + snapshot.vocInsights.length,
      reach,
      impressions,
      engagementRate: campaigns.length ? Number((snapshot.leads.length / Math.max(reach / 1000, 1)).toFixed(1)) : 0,
      clicks: snapshot.campaigns.reduce((sum, campaign) => sum + campaign.leads + campaign.rfqs + campaign.orders, 0),
    },
  };
}

export const mdecSeedData = buildMdecSeedData(getPrimeSnapshot());
