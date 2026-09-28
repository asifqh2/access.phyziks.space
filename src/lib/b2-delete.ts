// src/lib/b2-delete.ts
//
// Utility to delete all objects under a B2 prefix (i.e. a "folder").
//
// B2 uses the S3-compatible API — virtual-hosted style:
//   https://<bucket>.s3.<region>.backblazeb2.com/
//
// Flow:
//   1. ListObjectsV2 with prefix=<b2Prefix>/ → get all object keys
//   2. DELETE each key individually via signed S3 requests
//
// All signing uses AWS4-HMAC-SHA256, same as the upload route.
// Reads credentials from the same env vars as the upload route.

import { createHash, createHmac } from 'node:crypto';
import { request as nodeHttpsRequest } from 'node:https';

const B2_KEY_ID  = () => process.env.B2_UPLOAD_KEY_ID  ?? process.env.B2_ACCESS_KEY_ID  ?? '';
const B2_APP_KEY = () => process.env.B2_UPLOAD_APP_KEY ?? process.env.B2_SECRET_ACCESS_KEY ?? '';
const B2_BUCKET  = () => process.env.B2_BUCKET_NAME    ?? 'phyziks-videos';
const B2_REGION  = () => process.env.B2_REGION         ?? 'eu-central-003';
const B2_HOST    = () => `${B2_BUCKET()}.s3.${B2_REGION()}.backblazeb2.com`;

// ─────────────────────────────────────────────────────────────────────────────
// Signing helpers
// ─────────────────────────────────────────────────────────────────────────────

function sha256hex(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmacBytes(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function getSigningKey(dateStamp: string): Buffer {
  const appKey   = B2_APP_KEY();
  const region   = B2_REGION();
  const kDate    = hmacBytes(`AWS4${appKey}`, dateStamp);
  const kRegion  = hmacBytes(kDate, region);
  const kService = hmacBytes(kRegion, 's3');
  return hmacBytes(kService, 'aws4_request');
}

function buildAuthHeader(opts: {
  method:         string;
  path:           string;
  query:          string;
  canonicalHeaders: string;
  signedHeaders:  string;
  bodyHash:       string;
  dateStamp:      string;
  timeStamp:      string;
}): string {
  const { method, path, query, canonicalHeaders, signedHeaders, bodyHash, dateStamp, timeStamp } = opts;
  const region    = B2_REGION();
  const keyId     = B2_KEY_ID();
  const canonical = [method, path, query, canonicalHeaders, signedHeaders, bodyHash].join('\n');
  const credScope = `${dateStamp}/${region}/s3/aws4_request`;
  const strToSign = ['AWS4-HMAC-SHA256', timeStamp, credScope, sha256hex(canonical)].join('\n');
  const sig       = hmacBytes(getSigningKey(dateStamp), strToSign).toString('hex');
  return `AWS4-HMAC-SHA256 Credential=${keyId}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${sig}`;
}

function nowStamps(): { dateStamp: string; timeStamp: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`;
  const timeStamp = `${dateStamp}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  return { dateStamp, timeStamp };
}

// ─────────────────────────────────────────────────────────────────────────────
// httpsGet — signed GET request, returns response body as string
// ─────────────────────────────────────────────────────────────────────────────

function signedRequest(method: string, path: string, query = '', body = ''): Promise<{ status: number; body: string }> {
  const host                = B2_HOST();
  const { dateStamp, timeStamp } = nowStamps();
  const bodyHash            = sha256hex(body);
  const canonicalHeaders    = `host:${host}\nx-amz-content-sha256:${bodyHash}\nx-amz-date:${timeStamp}\n`;
  const signedHeaders       = 'host;x-amz-content-sha256;x-amz-date';
  const auth                = buildAuthHeader({ method, path, query, canonicalHeaders, signedHeaders, bodyHash, dateStamp, timeStamp });

  return new Promise((resolve, reject) => {
    const fullPath = query ? `${path}?${query}` : path;
    const req = nodeHttpsRequest(
      {
        hostname: host,
        path:     fullPath,
        method,
        headers: {
          'x-amz-date':           timeStamp,
          'x-amz-content-sha256': bodyHash,
          'Authorization':        auth,
          ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
      },
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// listB2Prefix — list all object keys under a given prefix
// ─────────────────────────────────────────────────────────────────────────────

async function listB2Prefix(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const query = new URLSearchParams({ 'list-type': '2', prefix });
    if (continuationToken) query.set('continuation-token', continuationToken);

    const { status, body } = await signedRequest('GET', '/', query.toString());
    if (status !== 200) {
      console.warn(`[b2-delete] ListObjectsV2 returned ${status}: ${body.slice(0, 200)}`);
      break;
    }

    // Parse <Key> tags from the XML response — no external parser needed
    const keyMatches = body.matchAll(/<Key>([^<]+)<\/Key>/g);
    for (const match of keyMatches) {
      keys.push(match[1]);
    }

    // Check if there are more pages
    const truncated = /<IsTruncated>true<\/IsTruncated>/.test(body);
    if (truncated) {
      const tokenMatch = body.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
      continuationToken = tokenMatch?.[1];
    } else {
      continuationToken = undefined;
    }
  } while (continuationToken);

  return keys;
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteB2Object — delete a single B2 object by key
// ─────────────────────────────────────────────────────────────────────────────

async function deleteB2Object(key: string): Promise<void> {
  const objectPath = `/${key.split('/').map(encodeURIComponent).join('/')}`;
  const { status, body } = await signedRequest('DELETE', objectPath);
  if (status !== 204 && status !== 200) {
    throw new Error(`B2 DELETE ${key} failed (${status}): ${body.slice(0, 200)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteB2Folder — public API
//
// Deletes all objects under the given b2 prefix (the "folder").
//
// Usage:
//   // b2VideoKey = "videos/cmXXX/master.m3u8"
//   const prefix = dirname(b2VideoKey); // "videos/cmXXX"
//   await deleteB2Folder(prefix);
//
// Returns the number of objects deleted.
// Logs warnings but does not throw on individual delete failures.
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteB2Folder(prefix: string): Promise<number> {
  if (!prefix || prefix === '.' || prefix === '/') {
    throw new Error(`deleteB2Folder: refusing to delete with unsafe prefix "${prefix}"`);
  }

  // Normalise — strip leading slash, ensure no trailing slash (we add / in the listing)
  const cleanPrefix = prefix.replace(/^\//, '').replace(/\/$/, '');

  let keys: string[];
  try {
    keys = await listB2Prefix(`${cleanPrefix}/`);
  } catch (err) {
    console.error(`[b2-delete] Failed to list prefix "${cleanPrefix}":`, err);
    return 0;
  }

  if (keys.length === 0) return 0;

  let deleted = 0;
  for (const key of keys) {
    try {
      await deleteB2Object(key);
      deleted++;
    } catch (err) {
      console.error(`[b2-delete] Failed to delete "${key}":`, err);
    }
  }

  console.info(`[b2-delete] Deleted ${deleted}/${keys.length} objects under "${cleanPrefix}/"`);
  return deleted;
}
