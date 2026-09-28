import crypto from 'node:crypto';
import Razorpay from 'razorpay';

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID ?? '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? '';
  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set.');
  }
  return { keyId, keySecret };
}

function getWebhookSecret() {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
  if (!webhookSecret) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET must be set — an empty secret allows forged webhooks.');
  }
  return webhookSecret;
}

let razorpayClient: Razorpay | undefined;

export function getRazorpayClient() {
  if (razorpayClient) return razorpayClient;

  const { keyId, keySecret } = getRazorpayCredentials();
  razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return razorpayClient;
}

export function verifyWebhookSignature(body: string, signature: string) {
  const expected = crypto
    .createHmac('sha256', getWebhookSecret())
    .update(body)
    .digest('hex');
  const actual         = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(expectedBuffer, actual);
}

export function verifyPaymentSignature(subscriptionId: string, paymentId: string, signature: string) {
  const expected = crypto
    .createHmac('sha256', getRazorpayCredentials().keySecret)
    .update(`${subscriptionId}|${paymentId}`)
    .digest('hex');
  const actual         = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(expectedBuffer, actual);
}

export function verifyOrderSignature(orderId: string, paymentId: string, signature: string) {
  const expected = crypto
    .createHmac('sha256', getRazorpayCredentials().keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const actual         = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(expectedBuffer, actual);
}
