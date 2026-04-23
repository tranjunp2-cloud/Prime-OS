export interface IntelligenceCreatorRecord {
  id: string;
  creatorName: string;
  imageUrl?: string;
  market: string;
  primaryChannel: string;
  fitScore: number;
  linkedSku: string;
  audienceFit?: string;
  marketFit?: string;
  recentProof?: string;
  status: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface IntelligenceCustomerRecord {
  id: string;
  segmentName: string;
  lifecycle: string;
  market: string;
  recommendedProduct: string;
  potentialScore: number;
  segmentSize?: number;
  recentIntent?: string;
  bestChannel?: string;
  nextMove?: string;
  benefit?: string;
  status: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface IntelligenceLaunchDecisionRecord {
  id: string;
  decisionName: string;
  skuCode: string;
  customerSegment: string;
  creatorName: string;
  approvalStatus: string;
  confidence: number;
  whyThisLaunch?: string;
  blocker?: string;
  owner?: string;
  expectedResponse?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface IntelligenceControlPlaneSnapshot {
  creators: IntelligenceCreatorRecord[];
  customers: IntelligenceCustomerRecord[];
  launchDecisions: IntelligenceLaunchDecisionRecord[];
}

const defaultControlPlaneBase = 'http://127.0.0.1:8180';

function resolveControlPlaneBase() {
  const configured = import.meta.env.VITE_PRIME_ADMIN_API_BASE?.trim();
  return (configured || defaultControlPlaneBase).replace(/\/$/, '');
}

async function fetchControlResource<T>(resource: string): Promise<T[]> {
  const response = await fetch(`${resolveControlPlaneBase()}/api/${resource}`, {
    headers: {
      'x-prime-role': 'user',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load intelligence control plane resource: ${resource}`);
  }

  return response.json() as Promise<T[]>;
}

export async function fetchIntelligenceControlPlane(): Promise<IntelligenceControlPlaneSnapshot> {
  const [creators, customers, launchDecisions] = await Promise.all([
    fetchControlResource<IntelligenceCreatorRecord>('intelligenceCreators'),
    fetchControlResource<IntelligenceCustomerRecord>('intelligenceCustomers'),
    fetchControlResource<IntelligenceLaunchDecisionRecord>('launchDecisions'),
  ]);

  return {
    creators,
    customers,
    launchDecisions,
  };
}
