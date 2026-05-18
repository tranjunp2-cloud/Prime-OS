function decodeJwtPayload(value: string) {
  const [, payload] = value.split('.');
  if (!payload) return null;

  try {
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function isLocalhostUrl(value: string) {
  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function requirePublicFrontendEnv(name: string, value: string | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${name} is required before building PrimeOS for staging.`);
  }

  if (import.meta.env.PROD) {
    const looksLikePlaceholder = /^(your-|replace-|local-demo-)/i.test(normalized);

    if (looksLikePlaceholder || isLocalhostUrl(normalized)) {
      throw new Error(`${name} must not use localhost or demo placeholder values in a production build.`);
    }
  }

  return normalized;
}

export function assertPublicSupabaseKey(value: string | undefined) {
  if (!value) return;

  const payload = decodeJwtPayload(value);
  const forbiddenRole = ['service', 'role'].join('_');
  const forbiddenPattern = new RegExp(['service', 'role'].join('[_-]?'), 'i');

  if (payload?.role === forbiddenRole || forbiddenPattern.test(value)) {
    throw new Error('Privileged Supabase keys must never be exposed through VITE_* frontend env vars.');
  }
}
