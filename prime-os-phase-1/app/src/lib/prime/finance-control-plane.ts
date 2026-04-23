export interface CapitalReadinessRecord {
  id: string;
  programName: string;
  market: string;
  owner: string;
  linkedLaunch?: string;
  linkedSku?: string;
  fundingNeed?: number;
  readinessScore: number;
  readinessReason?: string;
  nextReview?: string;
  status: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface CapitalOffersRecord {
  id: string;
  offerName: string;
  providerName: string;
  capitalType: string;
  market: string;
  owner: string;
  linkedLaunch?: string;
  amount?: number;
  feeRate?: number;
  termDays?: number;
  repaymentModel?: string;
  status: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface RiskTrustRecord {
  id: string;
  profileName: string;
  signalSource?: string;
  trustScore: number;
  severity: string;
  owner: string;
  topRisk?: string;
  recommendedFix?: string;
  status: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface SettlementRepaymentRecord {
  id: string;
  facilityName: string;
  market: string;
  disbursementTarget?: string;
  repaymentSource?: string;
  outstandingBalance?: number;
  nextDueAmount?: number;
  nextDueDate?: string;
  collectionMode?: string;
  status: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface FinanceControlPlaneSnapshot {
  capitalReadiness: CapitalReadinessRecord[];
  capitalOffers: CapitalOffersRecord[];
  riskTrust: RiskTrustRecord[];
  settlementRepayment: SettlementRepaymentRecord[];
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
    throw new Error(`Failed to load finance control plane resource: ${resource}`);
  }

  return response.json() as Promise<T[]>;
}

export async function fetchFinanceControlPlane(): Promise<FinanceControlPlaneSnapshot> {
  const [capitalReadiness, capitalOffers, riskTrust, settlementRepayment] = await Promise.all([
    fetchControlResource<CapitalReadinessRecord>('capitalReadiness'),
    fetchControlResource<CapitalOffersRecord>('capitalOffers'),
    fetchControlResource<RiskTrustRecord>('riskTrust'),
    fetchControlResource<SettlementRepaymentRecord>('settlementRepayment'),
  ]);

  return {
    capitalReadiness,
    capitalOffers,
    riskTrust,
    settlementRepayment,
  };
}
