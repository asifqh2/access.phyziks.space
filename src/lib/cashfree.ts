// src/lib/cashfree.ts
//
// Cashfree Payments utility — server-side only.
//
// Uses Cashfree Orders API v2022-09-01 directly via fetch (no SDK needed).
// Environment is controlled by CASHFREE_ENVIRONMENT:
//   "TEST"  → https://sandbox.cashfree.com  (default for dev)
//   "PROD"  → https://api.cashfree.com
//
// Required env vars:
//   CASHFREE_APP_ID      — from Cashfree dashboard
//   CASHFREE_SECRET_KEY  — from Cashfree dashboard
//   CASHFREE_ENVIRONMENT — "TEST" | "PROD" (defaults to "TEST")

import crypto from 'node:crypto';

function getCashfreeCredentials() {
  const appId     = process.env.CASHFREE_APP_ID     ?? '';
  const secretKey = process.env.CASHFREE_SECRET_KEY ?? '';
  if (!appId || !secretKey) {
    throw new Error('CASHFREE_APP_ID and CASHFREE_SECRET_KEY must be set.');
  }
  return { appId, secretKey };
}

function getCashfreeBaseUrl(): string {
  const env = (process.env.CASHFREE_ENVIRONMENT ?? 'TEST').toUpperCase();
  return env === 'PROD'
    ? 'https://api.cashfree.com'
    : 'https://sandbox.cashfree.com';
}

// ─────────────────────────────────────────────────────────────────────────────
// createCashfreeOrder
//
// Creates an order on Cashfree and returns the payment_session_id that the
// client-side JS SDK uses to open the checkout.
//
// Returns: { cfOrderId, paymentSessionId, orderId }
// ─────────────────────────────────────────────────────────────────────────────

export interface CashfreeOrderResult {
  cfOrderId:        string;   // Cashfree's own order ID (cf_order_id)
  paymentSessionId: string;   // Passed to Cashfree JS SDK to open checkout
  orderId:          string;   // The order_id we sent (our internal receipt/ref)
}

export async function createCashfreeOrder(opts: {
  orderId:      string;   // unique receipt / reference we generate
  amountPaise:  number;   // amount in paise (smallest unit); Cashfree expects rupees
  currency:     string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl:    string;   // redirect after payment
}): Promise<CashfreeOrderResult> {
  const { appId, secretKey } = getCashfreeCredentials();
  const baseUrl = getCashfreeBaseUrl();

  // Cashfree expects amount in rupees (float), not paise
  const amountRupees = (opts.amountPaise / 100).toFixed(2);

  const body = {
    order_id:     opts.orderId,
    order_amount: parseFloat(amountRupees),
    order_currency: opts.currency || 'INR',
    customer_details: {
      customer_id:    opts.orderId,          // required; use orderId as stable id
      customer_name:  opts.customerName  || 'Customer',
      customer_email: opts.customerEmail || '',
      customer_phone: opts.customerPhone || '9999999999',
    },
    order_meta: {
      return_url: opts.returnUrl,
    },
  };

  const res = await fetch(`${baseUrl}/pg/orders`, {
    method:  'POST',
    headers: {
      'Content-Type':    'application/json',
      'x-api-version':   '2022-09-01',
      'x-client-id':     appId,
      'x-client-secret': secretKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cashfree order creation failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json() as {
    cf_order_id:        string;
    order_id:           string;
    payment_session_id: string;
  };

  return {
    cfOrderId:        data.cf_order_id,
    paymentSessionId: data.payment_session_id,
    orderId:          data.order_id,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// verifyCashfreeWebhookSignature
//
// Cashfree sends a signature in the x-webhook-signature header.
// The signature is HMAC-SHA256 of (timestamp + raw_body) using the secret key.
// Header x-webhook-timestamp contains the timestamp.
// ─────────────────────────────────────────────────────────────────────────────

export function verifyCashfreeWebhookSignature(
  rawBody:   string,
  signature: string,
  timestamp: string,
): boolean {
  const { secretKey } = getCashfreeCredentials();
  const message  = timestamp + rawBody;
  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64');

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchCashfreeOrder
//
// Fetches order details from Cashfree API to verify amount server-side.
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCashfreeOrder(orderId: string): Promise<{
  status:       string;   // PAID | ACTIVE | EXPIRED | CANCELLED
  amountRupees: number;
  currency:     string;
}> {
  const { appId, secretKey } = getCashfreeCredentials();
  const baseUrl = getCashfreeBaseUrl();

  const res = await fetch(`${baseUrl}/pg/orders/${orderId}`, {
    headers: {
      'x-api-version':   '2022-09-01',
      'x-client-id':     appId,
      'x-client-secret': secretKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cashfree order fetch failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json() as {
    order_status:   string;
    order_amount:   number;
    order_currency: string;
  };

  return {
    status:       data.order_status,
    amountRupees: data.order_amount,
    currency:     data.order_currency,
  };
}
