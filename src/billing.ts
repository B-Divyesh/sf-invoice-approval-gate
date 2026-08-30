export const PRODUCT_SLUG = 'invoice-approval-gate';
export const PRICE_LABEL = '$29 once';
const API_BASE = import.meta.env.VITE_BILLING_API_BASE || 'https://api.sociobot.in/api/v1';
const REAL_LICENSE_KEY = `sb_license:${PRODUCT_SLUG}`;
const REAL_VERDICT_KEY = `sb_license_verdict:${PRODUCT_SLUG}`;
const DAY = 86_400_000;
let licenseKey = REAL_LICENSE_KEY;
let verdictKey = REAL_VERDICT_KEY;

interface Verdict {
  valid: boolean;
  checkedAt: number;
  reason?: string;
}

export function configureBillingNamespace(namespace?: string): void {
  const prefix = namespace ? `${namespace}:` : '';
  licenseKey = `${prefix}${REAL_LICENSE_KEY}`;
  verdictKey = `${prefix}${REAL_VERDICT_KEY}`;
}

function cachedVerdict(): Verdict | null {
  try {
    const value = JSON.parse(localStorage.getItem(verdictKey) || 'null') as Verdict | null;
    return value && typeof value.valid === 'boolean' ? value : null;
  } catch {
    return null;
  }
}

export function checkoutUrl(email = ''): string {
  const url = new URL(`${API_BASE}/products/${PRODUCT_SLUG}/checkout`);
  if (email) url.searchParams.set('email', email);
  return url.toString();
}

/**
 * Check that the hosted checkout is reachable before leaving the local app.
 * The redirect itself is deliberately still handled by the billing host; a
 * 404, 500, offline connection, or CORS failure leaves the free desk intact.
 */
export async function beginCheckout(): Promise<'redirecting' | 'offline' | 'unavailable'> {
  if (!navigator.onLine) return 'offline';
  const url = checkoutUrl();
  try {
    const response = await fetch(url, {
      headers: { Accept: 'text/html,application/json;q=0.9' },
      redirect: 'manual',
    });
    const isRedirect = response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400);
    if (!isRedirect) return 'unavailable';
    location.assign(url);
    return 'redirecting';
  } catch {
    return 'unavailable';
  }
}

export function storeReturnedLicense(): boolean {
  const url = new URL(location.href);
  const license = url.searchParams.get('license');
  if (license === null) return false;
  const token = license.trim();
  if (token) {
    localStorage.setItem(licenseKey, token);
    localStorage.removeItem(verdictKey);
  }
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  return Boolean(token);
}

export function saveLicense(license: string): void {
  localStorage.setItem(licenseKey, license.trim());
  localStorage.removeItem(verdictKey);
}

export function removeLicense(): void {
  localStorage.removeItem(licenseKey);
  localStorage.removeItem(verdictKey);
}

export function hasLicense(): boolean {
  return Boolean(localStorage.getItem(licenseKey));
}

export function isProFromCache(): boolean {
  const verdict = cachedVerdict();
  return Boolean(localStorage.getItem(licenseKey) && verdict?.valid);
}

export async function verifyLicense(force = false): Promise<{ valid: boolean; reason?: string; offline?: boolean }> {
  const license = localStorage.getItem(licenseKey);
  if (!license) return { valid: false, reason: 'missing' };
  const cached = cachedVerdict();
  if (!force && cached && Date.now() - cached.checkedAt < DAY) return cached;
  if (!navigator.onLine) return { valid: Boolean(cached?.valid), reason: cached?.reason, offline: true };
  try {
    const url = new URL(`${API_BASE}/products/${PRODUCT_SLUG}/verify`);
    url.searchParams.set('license', license);
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('verify unavailable');
    const result = await response.json() as { valid: boolean; reason?: string };
    const verdict: Verdict = { valid: Boolean(result.valid), reason: result.reason, checkedAt: Date.now() };
    localStorage.setItem(verdictKey, JSON.stringify(verdict));
    return verdict;
  } catch {
    return { valid: Boolean(cached?.valid), reason: cached?.reason, offline: true };
  }
}
