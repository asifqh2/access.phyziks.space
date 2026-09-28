/**
 * Cloudflare Worker — phyziks.space HLS Video Proxy
 * ==========================================================
 *
 * Architecture:
 *   Student browser  →  cdn.phyziks.space/videos/*  →  this Worker
 *   Worker validates ?token=<jwt>  →  fetches from Backblaze B2 (private bucket)
 *   →  streams HLS master playlist, sub-playlists, and .ts segments back
 *
 * ABR structure expected in B2:
 *   videos/<chapterId>/master.m3u8
 *   videos/<chapterId>/stream_0/index.m3u8   (1080p)
 *   videos/<chapterId>/stream_0/seg000.ts
 *   videos/<chapterId>/stream_1/index.m3u8   (720p)
 *   ...
 *
 * Cloudflare Worker vars (wrangler.toml [vars]):
 *   TOKEN_SECRET   — shared with Next.js VIDEO_TOKEN_SECRET
 *   B2_APP_KEY_ID  — Backblaze application key ID
 *   B2_APP_KEY     — Backblaze application key secret
 *   B2_ENDPOINT    — https://s3.<region>.backblazeb2.com
 *   B2_BUCKET_NAME — your private B2 bucket name
 *   ALLOWED_ORIGIN — https://phyziks.space
 * ==========================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// B2 auth token cache — shared across requests within the same Worker instance.
// b2_authorize_account is called at most once every 23 hours instead of
// once per segment request.
// ─────────────────────────────────────────────────────────────────────────────
let b2AuthCache = {
  token:       /** @type {string|null} */ (null),
  downloadUrl: /** @type {string|null} */ (null),
  expiresAt:   0,   // Unix ms — refresh 1 hour before real expiry
};

async function getB2Auth(keyId, appKey) {
  const now = Date.now();
  if (b2AuthCache.token && b2AuthCache.expiresAt > now) {
    return { token: b2AuthCache.token, downloadUrl: b2AuthCache.downloadUrl };
  }

  const authString = btoa(`${keyId}:${appKey}`);
  const res = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    headers: { Authorization: `Basic ${authString}` },
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`B2 authorize failed ${res.status}: ${t.slice(0, 200)}`);
  }

  const data     = await res.json();
  const dlUrl    = data.apiInfo?.storageApi?.downloadUrl;
  const authTok  = data.authorizationToken;

  if (!dlUrl || !authTok) throw new Error('B2 authorize: missing downloadUrl or token');

  // B2 auth tokens are valid for 24 hours; refresh after 23 hours
  b2AuthCache = {
    token:       authTok,
    downloadUrl: dlUrl,
    expiresAt:   now + 23 * 60 * 60 * 1000,
  };

  return { token: authTok, downloadUrl: dlUrl };
}

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN ?? 'https://phyziks.space';

    // ── CORS pre-flight ──────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return errorResponse(405, 'Method Not Allowed', allowedOrigin);
    }

    const url = new URL(request.url);

    // ── 1. Extract token ─────────────────────────────────────────────────────
    const token = url.searchParams.get('token');
    if (!token) return errorResponse(401, 'Missing token.', allowedOrigin);

    // ── 2. Validate token ────────────────────────────────────────────────────
    let payload;
    try {
      payload = await verifyToken(token, env.TOKEN_SECRET);
    } catch (err) {
      return errorResponse(403, err.message ?? 'Invalid token.', allowedOrigin);
    }

    // ── 3. Validate path structure ───────────────────────────────────────────
    // Expected: /videos/<chapterId>/...anything...
    const pathParts = url.pathname.split('/').filter(Boolean);
    // pathParts[0] = 'videos', pathParts[1] = chapterId
    if (pathParts.length < 2 || pathParts[0] !== 'videos') {
      return errorResponse(400, 'Invalid path.', allowedOrigin);
    }
    if (pathParts[1] !== payload.chapterId) {
      return errorResponse(403, 'Token does not match requested resource.', allowedOrigin);
    }

    // ── 4. Build B2 object key from path ─────────────────────────────────────
    // Strip leading slash — the full path IS the B2 key
    // e.g. /videos/clxyz123/stream_0/seg000.ts → videos/clxyz123/stream_0/seg000.ts
    const b2Key = pathParts.join('/');

    // ── 5. Fetch from B2 using AWS SigV4 ─────────────────────────────────────
    const b2Bucket    = env.B2_BUCKET_NAME ?? '';

    let b2Response;
    try {
      b2Response = await fetchFromB2({
        keyId:     env.B2_APP_KEY_ID,
        appKey:    env.B2_APP_KEY,
        bucket:    b2Bucket,
        objectKey: b2Key,
      });
    } catch (err) {
      console.error('[worker] B2 fetch error:', err?.message ?? err);
      return errorResponse(502, 'Failed to reach video storage.', allowedOrigin);
    }

    if (b2Response.status === 404) {
      return errorResponse(404, 'Video segment not found.', allowedOrigin);
    }
    if (!b2Response.ok) {
      const b2Body = await b2Response.text();
      console.error('[worker] B2 error', b2Response.status, b2Key, b2Body.slice(0, 500));
      return errorResponse(502, `B2:${b2Response.status} ${b2Body.slice(0,200)}`, allowedOrigin);
    }

    // ── 6. HLS manifest — rewrite URIs to route through this Worker ──────────
    const contentType = b2Response.headers.get('content-type') ?? '';
    const isManifest  = url.pathname.endsWith('.m3u8') || contentType.includes('mpegurl');

    if (isManifest) {
      const body      = await b2Response.text();
      const rewritten = rewriteManifest(body, token, url);
      return new Response(rewritten, {
        status: 200,
        headers: {
          'Content-Type':  'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-store',
          ...corsHeaders(allowedOrigin),
        },
      });
    }

    // ── 7. Segment / binary file — stream directly ───────────────────────────
    const respHeaders = new Headers({
      'Content-Type':  contentType || 'video/mp2t',
      'Cache-Control': 'private, max-age=900',
      ...corsHeaders(allowedOrigin),
    });
    const cl = b2Response.headers.get('content-length');
    if (cl) respHeaders.set('Content-Length', cl);

    return new Response(b2Response.body, { status: 200, headers: respHeaders });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AWS Signature V4 — required for Backblaze B2 S3-compatible API
// Uses virtual-hosted style: https://<bucket>.s3.<region>.backblazeb2.com/<key>
// ─────────────────────────────────────────────────────────────────────────────

async function fetchFromB2({ keyId, appKey, bucket, objectKey }) {
  // Use cached auth token — avoids b2_authorize_account on every segment request
  const { token, downloadUrl } = await getB2Auth(keyId, appKey);
  const fileUrl = `${downloadUrl}/file/${bucket}/${objectKey}`;
  return fetch(fileUrl, {
    headers: { Authorization: token },
    cf: { cacheEverything: false, cacheTtl: 0 },
  });
}

// Extract region from B2 endpoint, e.g. "https://s3.eu-central-003.backblazeb2.com" → "eu-central-003"
function extractRegion(endpoint) {
  const m = endpoint.match(/s3\.([^.]+)\.backblazeb2\.com/);
  return m ? m[1] : 'us-west-004';
}

// ─────────────────────────────────────────────────────────────────────────────
// HLS manifest rewriter — ABR aware
//
// Handles two manifest types:
//   A. Master playlist  (master.m3u8)
//      URIs are sub-playlist paths like "stream_0/index.m3u8"
//      Base = directory containing master.m3u8
//
//   B. Sub-playlist  (stream_N/index.m3u8)
//      URIs are segment paths like "seg000.ts"
//      Base = directory containing this sub-playlist (stream_N/)
//
// In both cases we resolve relative URIs against the current file's directory,
// then prepend the Worker origin and append ?token=<jwt>.
// ─────────────────────────────────────────────────────────────────────────────

function rewriteManifest(body, token, requestUrl) {
  // Directory of the current manifest file
  // e.g. /videos/clxyz123/master.m3u8      → /videos/clxyz123/
  //      /videos/clxyz123/stream_0/index.m3u8 → /videos/clxyz123/stream_0/
  const pathParts = requestUrl.pathname.split('/');            // [..., 'stream_0', 'index.m3u8']
  const dirParts  = pathParts.slice(0, pathParts.length - 1); // [..., 'stream_0']
  const baseDir   = `${requestUrl.origin}${dirParts.join('/')}/`;

  const lines = body.split('\n');

  const rewritten = lines.map((line) => {
    const trimmed = line.trim();

    // Skip blank lines and comment/tag lines
    if (trimmed === '' || trimmed.startsWith('#')) return line;

    // URI line — segment (.ts, .m4s, fmp4) or sub-playlist (.m3u8)
    if (!trimmed.match(/\.(ts|m4s|aac|mp4|fmp4|m3u8)(\?.*)?$/i)) return line;

    let resolved;
    if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
      // Already absolute — just add / replace token
      const u = new URL(trimmed);
      u.searchParams.set('token', token);
      resolved = u.toString();
    } else if (trimmed.startsWith('/')) {
      // Root-relative
      resolved = `${requestUrl.origin}${trimmed}?token=${encodeURIComponent(token)}`;
    } else {
      // Relative to current directory — most common case
      // e.g. "seg000.ts"      from stream_0/index.m3u8 → /videos/clxyz123/stream_0/seg000.ts
      //      "stream_0/index.m3u8" from master.m3u8    → /videos/clxyz123/stream_0/index.m3u8
      resolved = `${baseDir}${trimmed}?token=${encodeURIComponent(token)}`;
    }

    return resolved;
  });

  return rewritten.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// JWT verification (HMAC-SHA256 — matches src/lib/video-token.ts)
// ─────────────────────────────────────────────────────────────────────────────

async function verifyToken(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token.');

  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;

  const keyData   = new TextEncoder().encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
  );

  const signature = base64urlToBytes(sigB64);
  const valid     = await crypto.subtle.verify('HMAC', cryptoKey, signature, new TextEncoder().encode(data));
  if (!valid) throw new Error('Invalid token signature.');

  const payload = JSON.parse(new TextDecoder().decode(base64urlToBytes(payloadB64)));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token has expired.');
  if (!payload.chapterId) throw new Error('Token missing chapterId.');

  return payload;
}

// ─────────────────────────────────────────────────────────────────────────────
// Crypto helpers
// ─────────────────────────────────────────────────────────────────────────────

async function sha256hex(message) {
  const data   = new TextEncoder().encode(message);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(digest));
}

async function hmacSha256(key, message) {
  return new Uint8Array(await hmacSha256Raw(
    typeof key === 'string' ? new TextEncoder().encode(key) : key,
    message,
  ));
}

async function hmacSha256Raw(keyBytes, message) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function base64urlToBytes(b64url) {
  const b64    = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
  const binary = atob(padded);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function corsHeaders(allowedOrigin) {
  return {
    'Access-Control-Allow-Origin':  allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Access-Control-Max-Age':       '86400',
  };
}

function errorResponse(status, message, allowedOrigin) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(allowedOrigin) },
  });
}
