import crypto from 'node:crypto';
import Razorpay from 'razorpay';

// ── Fail fast if required secrets are missing ────────────────────────────────
// An empty string secret would allow attackers to forge valid HMAC signatures.
const RAZORPAY_KEY_ID      = process.env.RAZORPAY_KEY_ID      ?? '';
const RAZORPAY_KEY_SECRET  = process.env.RAZORPAY_KEY_SECRET  ?? '';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set.');
}
if (!RAZORPAY_WEBHOOK_SECRET) {
  throw new Error('RAZORPAY_WEBHOOK_SECRET must be set — an empty secret allows forged webhooks.');
}

export const razorpay = new Razorpay({
  key_id:     RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

export function verifyWebhookSignature(body: string, signature: string) {
  const expected = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  const actual         = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(expectedBuffer, actual);
}

export function verifyPaymentSignature(subscriptionId: string, paymentId: string, signature: string) {
  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${subscriptionId}|${paymentId}`)
    .digest('hex');
  const actual         = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(expectedBuffer, actual);
}

export function verifyOrderSignature(orderId: string, paymentId: string, signature: string) {
  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const actual         = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(expectedBuffer, actual);
}
