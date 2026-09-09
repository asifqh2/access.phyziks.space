// src/lib/currency.ts (re-exported as region.ts for backwards compatibility)
//
// AED currency helpers. This site operates in AED (UAE dirhams) only.
// 1 AED = 100 fils — the pricePaise field stores fils.

/** ISO 4217 currency code */
export const CURRENCY = 'AED';

/** Display symbol prefix */
export const CURRENCY_SYMBOL = 'AED ';

/** Smallest unit divisor (fils) */
export const SUBUNIT_DIVISOR = 100;

/** Payment note shown on pricing page and checkout */
export const PAYMENT_NOTE = '🔒 Secure payments · Cards accepted';

/**
 * Format a fils amount to a display string.
 * e.g. formatPrice(1000) → "AED 10"
 *      formatPrice(2550) → "AED 25.50"
 * Returns "AED —" for NaN or negative inputs to avoid displaying garbage to users.
 */
export function formatPrice(filsAmount: number): string {
  if (!Number.isFinite(filsAmount) || filsAmount < 0) return `${CURRENCY_SYMBOL}—`;
  const major = filsAmount / SUBUNIT_DIVISOR;
  const formatted = Number.isInteger(major) ? major.toString() : major.toFixed(2);
  return `${CURRENCY_SYMBOL}${formatted}`;
}
