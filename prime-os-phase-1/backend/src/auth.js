import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const defaultSessionSecret = 'prime-os-local-dev-session-secret-change-me';
const defaultAdminEmail = 'admin@primeos.local';
const defaultUserEmail = 'user@primeos.local';
const defaultAdminPassword = 'Admin@PrimeOS2026!';
const defaultUserPassword = 'User@PrimeOS2026!';
const localBypassToken = 'prime-local-bypass-token';
const demoCredentialsEnabled = process.env.PRIME_ALLOW_DEMO_CREDENTIALS === 'true';
const sessionSecret = process.env.PRIME_SESSION_SECRET || (demoCredentialsEnabled ? defaultSessionSecret : '');
const sessionTtlMs = Number(process.env.PRIME_SESSION_TTL_MS || 1000 * 60 * 60 * 8);
const revokedSessionIds = new Map();

if (!sessionSecret) {
  throw new Error('PRIME_SESSION_SECRET is required unless PRIME_ALLOW_DEMO_CREDENTIALS=true.');
}

if (!demoCredentialsEnabled && sessionSecret === defaultSessionSecret) {
  throw new Error('PRIME_SESSION_SECRET must be changed before exposing the backend.');
}

if (!demoCredentialsEnabled && sessionSecret.length < 32) {
  throw new Error('PRIME_SESSION_SECRET must be at least 32 characters.');
}

if (!Number.isFinite(sessionTtlMs) || sessionTtlMs <= 0) {
  throw new Error('PRIME_SESSION_TTL_MS must be a positive number.');
}

function requirePassword(envKey, fallback) {
  const configured = process.env[envKey];
  if (configured) {
    if (!demoCredentialsEnabled && configured === fallback) {
      throw new Error(`${envKey} must be changed before exposing the backend.`);
    }

    if (!demoCredentialsEnabled && configured.length < 12) {
      throw new Error(`${envKey} must be at least 12 characters.`);
    }

    return configured;
  }

  if (demoCredentialsEnabled) {
    return fallback;
  }

  throw new Error(`${envKey} is required when PRIME_ALLOW_DEMO_CREDENTIALS is not enabled.`);
}

function base64UrlJson(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function signPayload(encodedPayload) {
  return createHmac('sha256', sessionSecret).update(encodedPayload).digest('base64url');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function hashPassword(password, salt = randomBytes(16).toString('base64url')) {
  return {
    salt,
    hash: scryptSync(String(password), salt, 32).toString('base64url')
  };
}

function createAccount({ id, role, fullName, email, workspace, seatType, password }) {
  const passwordDigest = hashPassword(password);

  return {
    id,
    role,
    fullName,
    email: String(email).trim().toLowerCase(),
    workspace,
    seatType,
    passwordSalt: passwordDigest.salt,
    passwordHash: passwordDigest.hash
  };
}

const identityAccounts = [
  createAccount({
    id: 'login_admin_001',
    role: 'admin',
    fullName: process.env.PRIME_ADMIN_NAME || 'PrimeOS Admin',
    email: process.env.PRIME_ADMIN_EMAIL || defaultAdminEmail,
    workspace: 'Global control room',
    password: requirePassword('PRIME_ADMIN_PASSWORD', defaultAdminPassword)
  }),
  createAccount({
    id: 'login_user_001',
    role: 'user',
    fullName: process.env.PRIME_USER_NAME || 'PrimeOS User',
    email: process.env.PRIME_USER_EMAIL || defaultUserEmail,
    seatType: 'seller_viewer',
    password: requirePassword('PRIME_USER_PASSWORD', defaultUserPassword)
  })
];

export function toSafeAccount(account) {
  if (!account) return null;

  return {
    id: account.id,
    role: account.role,
    fullName: account.fullName,
    email: account.email,
    workspace: account.workspace,
    seatType: account.seatType
  };
}

export function getLoginAccountsForSeed() {
  return identityAccounts.map(toSafeAccount);
}

export function listIdentityAccounts() {
  return identityAccounts.map(toSafeAccount);
}

export function updateIdentityAccount(accountId, updates = {}) {
  const account = identityAccounts.find((candidate) => candidate.id === accountId);
  if (!account) return null;

  if (typeof updates.fullName === 'string' && updates.fullName.trim()) {
    account.fullName = updates.fullName.trim().slice(0, 120);
  }

  return toSafeAccount(account);
}

export function authenticatePassword(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const account = identityAccounts.find((candidate) => candidate.email === normalizedEmail);

  if (!account || !password) {
    return null;
  }

  const attemptedHash = hashPassword(password, account.passwordSalt).hash;
  if (!safeEqual(attemptedHash, account.passwordHash)) {
    return null;
  }

  return account;
}

export function createSessionToken(account) {
  const now = Date.now();
  const expiresAt = now + sessionTtlMs;
  const sessionId = randomBytes(18).toString('base64url');
  const encodedPayload = base64UrlJson({
    jti: sessionId,
    sub: account.id,
    email: account.email,
    role: account.role,
    iat: now,
    exp: expiresAt
  });
  const signature = signPayload(encodedPayload);

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(expiresAt).toISOString()
  };
}

function pruneRevokedSessions() {
  const now = Date.now();
  for (const [sessionId, expiresAt] of revokedSessionIds.entries()) {
    if (now > expiresAt) {
      revokedSessionIds.delete(sessionId);
    }
  }
}

export function revokeSessionToken(token) {
  try {
    const [encodedPayload, signature, extra] = String(token || '').split('.');
    if (!encodedPayload || !signature || extra !== undefined) return false;
    if (!safeEqual(signature, signPayload(encodedPayload))) return false;

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (!payload?.jti || !payload?.exp) return false;

    pruneRevokedSessions();
    revokedSessionIds.set(String(payload.jti), Number(payload.exp));
    return true;
  } catch {
    return false;
  }
}

export function verifySessionToken(token) {
  if (demoCredentialsEnabled && token === localBypassToken) {
    return identityAccounts.find((account) => account.role === 'admin') ?? null;
  }

  const [encodedPayload, signature, extra] = String(token || '').split('.');
  if (!encodedPayload || !signature || extra !== undefined) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (!payload?.jti || !payload?.sub || !payload?.email || !payload?.role || Date.now() > Number(payload.exp)) {
      return null;
    }

    pruneRevokedSessions();
    if (revokedSessionIds.has(String(payload.jti))) {
      return null;
    }

    const account = identityAccounts.find((candidate) => (
      candidate.id === payload.sub
      && candidate.email === payload.email
      && candidate.role === payload.role
    ));

    return account ?? null;
  } catch {
    return null;
  }
}
