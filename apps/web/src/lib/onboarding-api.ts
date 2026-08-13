import { createPrimeAuthHeaders, resolvePrimeBackendBase } from '@/lib/prime/backend-auth';

export type OnboardingStepStatus = 'COMPLETED' | 'PENDING';

export interface OnboardingStep {
  key: 'create_warehouse' | 'connect_first_channel' | 'map_warehouse' | 'connect_second_channel';
  title: string;
  description: string;
  target_url: string;
  status: OnboardingStepStatus;
}

export interface OnboardingStatus {
  total_steps: number;
  completed_steps: number;
  is_completed: boolean;
  is_collapsed: boolean;
  is_dismissed: boolean;
  celebration_active: boolean;
  celebration_expires_at: string | null;
  next_step: OnboardingStep | null;
  steps: OnboardingStep[];
}

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Unable to load onboarding status.');
  return body;
}

export async function fetchOnboardingStatus() {
  const response = await fetch(`${resolvePrimeBackendBase()}/api/v1/onboarding/status`, {
    headers: createPrimeAuthHeaders(),
  });
  return readJson(response) as Promise<OnboardingStatus>;
}

export async function updateOnboardingPreferences(preferences: Partial<Pick<OnboardingStatus, 'is_collapsed' | 'is_dismissed'>>) {
  const headers = createPrimeAuthHeaders();
  headers.set('Content-Type', 'application/json');
  const response = await fetch(`${resolvePrimeBackendBase()}/api/v1/onboarding/preferences`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(preferences),
  });
  await readJson(response);
  return preferences;
}
