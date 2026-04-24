function fail(message) {
  console.error(`[PrimeOS frontend env] ${message}`);
  process.exit(1);
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    fail(`${name} is required for a staging/production build.`);
  }
  return value;
}

function isLocalhostUrl(value) {
  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

function decodeJwtPayload(value) {
  const [, payload] = value.split('.');
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function rejectPlaceholder(name, value) {
  if (/^(your-|replace-|local-demo-)/i.test(value) || isLocalhostUrl(value)) {
    fail(`${name} must not use localhost or demo placeholder values.`);
  }
}

const supabaseUrl = requireEnv('VITE_SUPABASE_URL');
const supabaseKey = requireEnv('VITE_SUPABASE_PUBLISHABLE_KEY');
const apiBase = process.env.VITE_PRIME_ADMIN_API_BASE?.trim();

rejectPlaceholder('VITE_SUPABASE_URL', supabaseUrl);
rejectPlaceholder('VITE_SUPABASE_PUBLISHABLE_KEY', supabaseKey);

const privilegedRole = ['service', 'role'].join('_');
const payload = decodeJwtPayload(supabaseKey);
if (payload?.role === privilegedRole || new RegExp(['service', 'role'].join('[_-]?'), 'i').test(supabaseKey)) {
  fail('VITE_SUPABASE_PUBLISHABLE_KEY must be an anon/publishable key, not a privileged key.');
}

if (apiBase) {
  if (isLocalhostUrl(apiBase)) {
    fail('VITE_PRIME_ADMIN_API_BASE must not point to localhost in a staging/production build.');
  }

  if (!apiBase.startsWith('https://')) {
    fail('VITE_PRIME_ADMIN_API_BASE must be HTTPS when it is not empty. Prefer leaving it empty for same-origin /api.');
  }
}
