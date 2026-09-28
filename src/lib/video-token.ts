// src/lib/video-token.ts
//
// Short-lived HMAC-SHA256 signed tokens for HLS video access.
//
// Architecture:
//   phyziks.space API generates a token  →  client passes it to Cloudflare Worker
//   Worker validates the SAME token using the SAME TOKEN_SECRET
//
// Token format: base64url(header).base64url(payload).base64url(hmac-sha256-sig)
//
// Payload fields:
//   chapterId  — the chapter this token is scoped to (Worker enforces path match)
//   userId     — the Clerk userId who requested the token
//   exp        — Unix timestamp (seconds) after which the token is invalid
//
// Security:
//   - Token is bound to a specific chapterId.  Using a token from Chapter A to
//     access Chapter B's HLS stream will be rejected by the Worker.
//   - All validation happens server-side (Worker) — the client cannot forge or
//     extend a token.
//   - Tokens are stored in the VideoToken DB table so they can be audited /
//     revoked; the Worker validates the cryptographic signature independently
//     (no DB round-trip in the Worker).
//   - VIDEO_TOKEN_SECRET must be at least 32 characters and must be set as
//     TOKEN_SECRET in the Cloudflare Worker environment (wrangler secret put).
//
// Environment:
//   VIDEO_TOKEN_SECRET     — 32+ char random string, shared with the Worker
//   VIDEO_TOKEN_TTL_SECONDS — token lifetime in seconds (default: 900 = 15 min)
//   NEXT_PUBLIC_CDN_URL    — base URL of the Cloudflare Worker CDN,
//                            e.g. https://cdn.phyziks.space

import { prisma } from '@/lib/prisma';

const TTL_SEC      = parseInt(process.env.VIDEO_TOKEN_TTL_SECONDS ?? '900', 10);
const CDN_URL      = (process.env.NEXT_PUBLIC_CDN_URL ?? '').replace(/\/$/, '');

function getTokenSecret() {
  const tokenSecret = process.env.VIDEO_TOKEN_SECRET;
  if (!tokenSecret) {
    throw new Error('VIDEO_TOKEN_SECRET must be set — an empty secret allows forged video tokens.');
  }
  return tokenSecret;
}

// ─────────────────────────────────────────────────────────────────────────────
// generateVideoToken
// ─────────────────────────────────────────────────────────────────────────────
// Creates a signed JWT-style token, persists it in VideoToken, and returns:
//   { token, hlsUrl, expiresAt }
//
// hlsUrl is the full URL the client should pass to hls.js, e.g.:
//   https://cdn.phyziks.space/videos/clxyz123/master.m3u8?token=<token>
//
// The b2VideoKey stored on the chapter/topic/subtopic is the B2 object path,
// e.g. "videos/clxyz123/master.m3u8".  We build the CDN URL from it.

export async function generateVideoToken(opts: {
  clerkUserId: string;
  chapterId:   string;
  b2VideoKey:  string;
  topicId?:    string;
  subtopicId?: string;
}): Promise<{ token: string; hlsUrl: string; expiresAt: Date }> {
  const tokenSecret = getTokenSecret();
  if (!CDN_URL) throw new Error('NEXT_PUBLIC_CDN_URL is not configured.');

  // ── Reuse an existing valid token if one exists (at least 5 min remaining) ─
  // This prevents "unable to generate token" when the user switches videos and
  // comes back within the same session.
  const minTtl    = 5 * 60; // don't reuse tokens with less than 5 min left
  const threshold = new Date(Date.now() + minTtl * 1000);

  const existing = await prisma.videoToken.findFirst({
    where: {
      clerkUserId: opts.clerkUserId,
      chapterId:   opts.chapterId,
      topicId:     opts.topicId    ?? null,
      subtopicId:  opts.subtopicId ?? null,
      expiresAt:   { gt: threshold },
    },
    orderBy: { expiresAt: 'desc' },
  });

  if (existing) {
    const cleanKey = opts.b2VideoKey.replace(/^\//, '');
    const hlsUrl   = `${CDN_URL}/${cleanKey}?token=${encodeURIComponent(existing.token)}`;
    return { token: existing.token, hlsUrl, expiresAt: existing.expiresAt };
  }

  // ── No valid token found — create a new one ───────────────────────────────
  const now       = Math.floor(Date.now() / 1000);
  const exp       = now + TTL_SEC;
  const expiresAt = new Date(exp * 1000);

  // Build the token
  const header  = jsonToBase64url({ alg: 'HS256', typ: 'VTK' }); // VTK = Video Token
  const payload = jsonToBase64url({
    chapterId: opts.chapterId,
    userId:    opts.clerkUserId,
    exp,
  });
  const signature = await hmacSign(`${header}.${payload}`, tokenSecret);
  const token     = `${header}.${payload}.${signature}`;

  // Persist — allows audit / future revocation
  await prisma.videoToken.create({
    data: {
      token,
      clerkUserId: opts.clerkUserId,
      chapterId:   opts.chapterId,
      topicId:     opts.topicId    ?? null,
      subtopicId:  opts.subtopicId ?? null,
      expiresAt,
    },
  });

  // Build the CDN URL.
  // b2VideoKey is already the full path under the /videos/ prefix,
  // e.g. "videos/clxyz123/master.m3u8"
  // We strip a leading slash if present.
  const cleanKey = opts.b2VideoKey.replace(/^\//, '');
  const hlsUrl   = `${CDN_URL}/${cleanKey}?token=${encodeURIComponent(token)}`;

  return { token, hlsUrl, expiresAt };
}

// ─────────────────────────────────────────────────────────────────────────────
// verifyVideoToken  (server-side check — NOT used by the Worker)
// ─────────────────────────────────────────────────────────────────────────────
// Used if the Next.js app needs to validate a token itself (e.g. for analytics
// or future server-side streaming).  The Worker does its own verification.

export async function verifyVideoToken(token: string): Promise<{
  valid: boolean;
  chapterId?: string;
  userId?:    string;
  exp?:       number;
}> {
  const tokenSecret = process.env.VIDEO_TOKEN_SECRET;
  if (!tokenSecret) return { valid: false };

  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false };

  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;

  // Verify signature
  const expectedSig = await hmacSign(data, tokenSecret);
  if (!timingSafeEqual(expectedSig, sigB64)) return { valid: false };

  // Decode payload
  let payload: { chapterId?: string; userId?: string; exp?: number };
  try {
    payload = JSON.parse(base64urlDecode(payloadB64));
  } catch {
    return { valid: false };
  }

  // Check expiry
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false };
  }

  return { valid: true, ...payload };
}

// ─────────────────────────────────────────────────────────────────────────────
// Crypto helpers (Node.js WebCrypto — available in Next.js Edge and Node runtimes)
// ─────────────────────────────────────────────────────────────────────────────

async function hmacSign(data: string, secret: string): Promise<string> {
  const keyData   = new TextEncoder().encode(secret);
  const msgData   = new TextEncoder().encode(data);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig    = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return uint8ArrayToBase64url(new Uint8Array(sig));
}

function jsonToBase64url(obj: object): string {
  return strToBase64url(JSON.stringify(obj));
}

function strToBase64url(str: string): string {
  return uint8ArrayToBase64url(new TextEncoder().encode(str));
}

function uint8ArrayToBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(b64url: string): string {
  const b64     = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded  = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return atob(padded);
}

/** Constant-time string comparison to prevent timing attacks */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
