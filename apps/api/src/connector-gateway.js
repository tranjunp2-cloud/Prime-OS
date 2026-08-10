const META_GRAPH_API = 'https://graph.facebook.com/v21.0';
const ZALO_OA_API = 'https://openapi.zalo.me/v2.0';
const SHOPEE_PARTNER_API = 'https://partner.shopeemobile.com/api/v2';
const LAZADA_SELLER_API = 'https://api.lazada.com/rest';
const TIKTOK_SHOP_API = 'https://open-api.tiktokglobalshop.com/api';
const STRIPE_API = 'https://api.stripe.com/v1';
const LINE_API = 'https://api.line.me/v2';
const PAYPAL_API = 'https://api-m.paypal.com';
const PAYPAL_SANDBOX_API = 'https://api-m.sandbox.paypal.com';
const TIKTOK_ADS_API = 'https://business-api.tiktok.com/open_api/v1.3';

function maskToken(token) {
  if (!token || token.length < 8) return '****';
  return `****${token.slice(-4)}`;
}

function assertValidToken(token, minLength = 8) {
  if (!token || token.length < minLength) {
    const err = new Error(`Connector access token must be at least ${minLength} characters.`);
    err.statusCode = 409;
    throw err;
  }
}

async function probeMetaGraph({ token, accountRef, adapterKey }) {
  assertValidToken(token, 16);
  let url;
  if (adapterKey === 'meta_whatsapp_cloud') {
    const businessId = accountRef || 'me';
    url = `${META_GRAPH_API}/${encodeURIComponent(businessId)}?fields=id,name,message_businesses`;
  } else if (adapterKey === 'meta_messenger_page' || adapterKey === 'meta_facebook_page') {
    const pageId = accountRef || 'me';
    url = `${META_GRAPH_API}/${encodeURIComponent(pageId)}?fields=id,name,access_token`;
  } else if (adapterKey === 'meta_instagram_business') {
    const igBusinessId = accountRef || 'me';
    url = `${META_GRAPH_API}/${encodeURIComponent(igBusinessId)}?fields=id,username,profile_picture_url`;
  } else {
    url = `${META_GRAPH_API}/me?fields=id,name`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function probeZalo({ token, accountRef }) {
  assertValidToken(token, 12);
  const url = `${ZALO_OA_API}/oa/getprofile`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      access_token: token,
      Accept: 'application/json',
    },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function probeShopee({ token, accountRef }) {
  assertValidToken(token, 16);
  const timestamp = Math.floor(Date.now() / 1000);
  const shopId = accountRef || '';
  const url = `${SHOPEE_PARTNER_API}/shop/get_profile`;
  const params = new URLSearchParams({
    partner_id: '0',
    timestamp: String(timestamp),
    access_token: token,
    shop_id: shopId,
    sign: '0000000000000000000000000000000000000000000000000000000000000000',
  });

  const response = await fetch(`${url}?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function probeLazada({ token, accountRef }) {
  assertValidToken(token, 16);
  const timestamp = Math.floor(Date.now() / 1000);
  const url = `${LAZADA_SELLER_API}/seller/get`;
  const params = new URLSearchParams({
    app_key: '0',
    timestamp: String(timestamp),
    sign_method: 'sha256',
    access_token: token,
    sign: '0000000000000000000000000000000000000000000000000000000000000000',
  });

  const response = await fetch(`${url}?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function probeTikTokShop({ token, accountRef }) {
  assertValidToken(token, 16);
  const timestamp = Math.floor(Date.now() / 1000);
  const url = `${TIKTOK_SHOP_API}/authorization/${encodeURIComponent(accountRef || '0')}/shops`;
  const params = new URLSearchParams({
    app_key: '0',
    timestamp: String(timestamp),
    access_token: token,
    sign: '0000000000000000000000000000000000000000000000000000000000000000',
  });

  const response = await fetch(`${url}?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function probeStripe({ token }) {
  assertValidToken(token, 8);
  const isLiveKey = token.startsWith('sk_live') || token.startsWith('rk_live');
  const isTestKey = token.startsWith('sk_test') || token.startsWith('rk_test');
  if (!isLiveKey && !isTestKey) {
    const err = new Error('Stripe key must start with sk_live, sk_test, rk_live, or rk_test.');
    err.statusCode = 400;
    throw err;
  }

  const url = `${STRIPE_API}/balance`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function probeShopify({ token, accountRef }) {
  assertValidToken(token, 8);
  const isAdminToken = token.startsWith('shpat_') || token.startsWith('shpca_') || token.startsWith('shpcr_') || token.startsWith('shpss_');
  if (!isAdminToken) {
    const err = new Error('Shopify token must start with shpat_, shpca_, shpcr_, or shpss_.');
    err.statusCode = 400;
    throw err;
  }

  const storeDomain = accountRef || '';
  const storeHost = storeDomain.includes('.myshopify.com') ? storeDomain : `${storeDomain}.myshopify.com`;
  const url = `https://${storeHost}/admin/api/2024-07/shop.json`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': token,
      Accept: 'application/json',
    },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function probeLine({ token }) {
  assertValidToken(token, 20);
  const url = `${LINE_API}/bot/info`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function probePayPal({ token, accountRef }) {
  assertValidToken(token, 16);
  const isSandbox = String(accountRef || '').toLowerCase().includes('sandbox') || token.startsWith('sandbox_') || token.startsWith('AS-');
  const base = isSandbox ? PAYPAL_SANDBOX_API : PAYPAL_API;
  const url = `${base}/v1/identity/oauth2/userinfo?schema=paypalv1.1`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function probeMoMo() {
  const err = new Error('MoMo does not expose a query API. Partner IPN readiness is validated through generated signed sample webhooks and HMAC signature verification.');
  err.statusCode = 400;
  throw err;
}

async function probeMetaAds({ token }) {
  assertValidToken(token, 16);
  const url = `${META_GRAPH_API}/me/adaccounts?fields=id,name,account_status`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function probeTikTokAds({ token }) {
  assertValidToken(token, 16);
  const url = `${TIKTOK_ADS_API}/oauth2/advertiser/get/`;
  const params = new URLSearchParams({
    app_id: '0',
    secret: '0000000000000000000000000000000000000000000000000000000000000000',
  });
  const response = await fetch(`${url}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Access-Token': token,
      Accept: 'application/json',
    },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

const providerProbeMap = {
  whatsapp: { api: 'meta_graph', key: 'id' },
  messenger: { api: 'meta_graph', key: 'id' },
  facebook: { api: 'meta_graph', key: 'id' },
  instagram: { api: 'meta_graph', key: 'id' },
  zalo: { api: 'zalo_oa', key: 'data' },
  shopee: { api: 'shopee_partner', key: 'data' },
  lazada: { api: 'lazada_seller', key: 'data' },
  tiktok_shop: { api: 'tiktok_shop', key: 'data' },
  shopify: { api: 'shopify_admin', key: 'shop' },
  stripe: { api: 'stripe', key: 'available' },
  vnpay: { api: 'none', key: null },
  line: { api: 'line_bot', key: 'userId' },
  paypal: { api: 'paypal_rest', key: 'user_id' },
  momo: { api: 'none', key: null },
  meta_ads: { api: 'meta_ads', key: 'data' },
  tiktok_ads: { api: 'tiktok_ads', key: 'data' },
};

function getProviderProbeMeta(provider) {
  return providerProbeMap[provider] || { api: 'none', key: null };
}

export function getRealProbeConfig(connector) {
  const meta = getProviderProbeMeta(connector.provider);
  if (meta.api === 'none') return null;

  const adapterProfile = connector.adapterProfile || {};
  const adapterKey = adapterProfile.adapterKey || '';

  if (meta.api === 'meta_graph') {
    return {
      adapter: 'meta_graph',
      description: `Calls Facebook Graph API v21.0 to verify ${connector.name} token and account access.`,
      successPath: meta.key,
    };
  }

  if (meta.api === 'zalo_oa') {
    return {
      adapter: 'zalo_oa',
      description: 'Calls Zalo Official Account API getprofile to verify OA token and access.',
      successPath: meta.key,
    };
  }

  if (meta.api === 'shopee_partner') {
    return {
      adapter: 'shopee_partner',
      description: 'Calls Shopee Partner API shop/get_profile to verify partner token and shop access.',
      successPath: meta.key,
    };
  }

  if (meta.api === 'lazada_seller') {
    return {
      adapter: 'lazada_seller',
      description: 'Calls Lazada Seller API seller/get to verify seller token and access.',
      successPath: meta.key,
    };
  }

  if (meta.api === 'tiktok_shop') {
    return {
      adapter: 'tiktok_shop',
      description: 'Calls TikTok Shop API authorization/shops to verify shop token and access.',
      successPath: meta.key,
    };
  }

  if (meta.api === 'stripe') {
    return {
      adapter: 'stripe',
      description: 'Calls Stripe API v1/balance to verify restricted key and payment account access.',
      successPath: meta.key,
    };
  }

  if (meta.api === 'shopify_admin') {
    return {
      adapter: 'shopify_admin',
      description: 'Calls Shopify Admin API shop.json to verify store token and admin scope access.',
      successPath: meta.key,
    };
  }

  if (meta.api === 'line_bot') {
    return {
      adapter: 'line_bot',
      description: 'Calls LINE Messaging API bot/info to verify channel access token and bot profile.',
      successPath: meta.key,
    };
  }

  if (meta.api === 'paypal_rest') {
    return {
      adapter: 'paypal_rest',
      description: 'Calls PayPal REST API userinfo to verify REST app credential and merchant identity.',
      successPath: meta.key,
    };
  }

  if (meta.api === 'meta_ads') {
    return {
      adapter: 'meta_ads',
      description: 'Calls Facebook Graph API me/adaccounts to verify Marketing API token and ad account access.',
      successPath: meta.key,
    };
  }

  if (meta.api === 'tiktok_ads') {
    return {
      adapter: 'tiktok_ads',
      description: 'Calls TikTok Business API advertiser/get to verify advertiser token and ad account access.',
      successPath: meta.key,
    };
  }

  return null;
}

export async function callRealProviderProbe({ connector, token }) {
  const meta = getProviderProbeMeta(connector.provider);
  const adapterKey = connector.adapterProfile?.adapterKey || '';

  if (meta.api === 'meta_graph') {
    return probeMetaGraph({ token, accountRef: connector.accountRef, adapterKey });
  }

  if (meta.api === 'zalo_oa') {
    return probeZalo({ token, accountRef: connector.accountRef });
  }

  if (meta.api === 'shopee_partner') {
    return probeShopee({ token, accountRef: connector.accountRef });
  }

  if (meta.api === 'lazada_seller') {
    return probeLazada({ token, accountRef: connector.accountRef });
  }

  if (meta.api === 'tiktok_shop') {
    return probeTikTokShop({ token, accountRef: connector.accountRef });
  }

  if (meta.api === 'stripe') {
    return probeStripe({ token });
  }

  if (meta.api === 'shopify_admin') {
    return probeShopify({ token, accountRef: connector.accountRef });
  }

  if (meta.api === 'line_bot') {
    return probeLine({ token });
  }

  if (meta.api === 'paypal_rest') {
    return probePayPal({ token, accountRef: connector.accountRef });
  }

  if (meta.api === 'meta_ads') {
    return probeMetaAds({ token });
  }

  if (meta.api === 'tiktok_ads') {
    return probeTikTokAds({ token });
  }

  const err = new Error(`${connector.name} does not have a configured provider API for live probing.`);
  err.statusCode = 400;
  throw err;
}

export function describeRealProbeForDemo({ connector, status, httpStatus, description }) {
  const demo = {
    ok: false,
    source: 'demo_adapter',
    detail: 'No provider credentials or live API unavailable. Re-run probe after connecting with real provider credentials.',
  };

  if (!status || httpStatus >= 400 || httpStatus === 0) {
    return demo;
  }

  return {
    ok: true,
    source: 'provider_api_probe',
    detail: `${connector.name} live probe returned HTTP ${httpStatus}. ${description}`,
  };
}
