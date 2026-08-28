export const PRODUCT_SLUG = 'invoice-approval-gate';
export const PRICE_LABEL = '$29 once';
const API_BASE = import.meta.env.VITE_BILLING_API_BASE || 'https://api.sociobot.in/api/v1';
const LICENSE_KEY = `sb_license:${PRODUCT_SLUG}`;
const VERDICT_KEY = `sb_license_verdict:${PRODUCT_SLUG}`;
const DAY = 86_400_000;

interface Verdict {
  valid: boolean;
  checkedAt: number;
  reason?: string;
}

function cachedVerdict(): Verdict | null {
  try {
    const value = JSON.parse(localStorage.getItem(VERDICT_KEY) || 'null') as Verdict | null;
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

export function storeReturnedLicense(): boolean {
  const url = new URL(location.href);
  const license = url.searchParams.get('license');
  if (license === null) return false;
  const token = license.trim();
  if (token) {
    localStorage.setItem(LICENSE_KEY, token);
    localStorage.removeItem(VERDICT_KEY);
  }
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  return Boolean(token);
}

export function saveLicense(license: string): void {
  localStorage.setItem(LICENSE_KEY, license.trim());
  localStorage.removeItem(VERDICT_KEY);
}

export function removeLicense(): void {
  localStorage.removeItem(LICENSE_KEY);
  localStorage.removeItem(VERDICT_KEY);
}

export function hasLicense(): boolean {
  return Boolean(localStorage.getItem(LICENSE_KEY));
}

export function isProFromCache(): boolean {
  const verdict = cachedVerdict();
  return Boolean(localStorage.getItem(LICENSE_KEY) && verdict?.valid);
}

export async function verifyLicense(force = false): Promise<{ valid: boolean; reason?: string; offline?: boolean }> {
  const license = localStorage.getItem(LICENSE_KEY);
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
    localStorage.setItem(VERDICT_KEY, JSON.stringify(verdict));
    return verdict;
  } catch {
    return { valid: Boolean(cached?.valid), reason: cached?.reason, offline: true };
  }
}
