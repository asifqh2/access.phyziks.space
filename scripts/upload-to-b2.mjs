/**
 * scripts/upload-to-b2.mjs
 * Uploads a folder to Backblaze B2 via S3-compatible API (AWS SigV4).
 *
 * Usage:
 *   node scripts/upload-to-b2.mjs <localFolder> <b2Prefix>
 */

import { readdir, readFile } from 'fs/promises';
import { join, relative, basename } from 'path';
import { createHmac, createHash } from 'crypto';

// ── Config ────────────────────────────────────────────────────────────────────
const KEY_ID  = '003f9d2140141aa0000000004';
const APP_KEY = 'K003x5W4f90vDALyBZVMe/uFEv00O3Q';
const BUCKET  = 'phyziks-videos';
const REGION  = 'eu-central-003';
// B2 path-style endpoint (most reliable for SigV4)
const HOST    = `s3.${REGION}.backblazeb2.com`;

// ── Args ──────────────────────────────────────────────────────────────────────
const [,, localFolder, b2Prefix] = process.argv;
if (!localFolder || !b2Prefix) {
  console.error('Usage: node upload-to-b2.mjs <localFolder> <b2Prefix>');
  process.exit(1);
}

// ── Crypto helpers ────────────────────────────────────────────────────────────

function hmacBytes(key, data) {
  return createHmac('sha256', key).update(data).digest();
}
function hmacHex(key, data) {
  return createHmac('sha256', key).update(data).digest('hex');
}
function sha256hex(data) {
  return createHash('sha256').update(data).digest('hex');
}

function getSigningKey(dateStamp) {
  const kDate    = hmacBytes(`AWS4${APP_KEY}`, dateStamp);
  const kRegion  = hmacBytes(kDate, REGION);
  const kService = hmacBytes(kRegion, 's3');
  return hmacBytes(kService, 'aws4_request');
}

// URI-encode a path segment (each component separately, forward slashes preserved)
function uriEncodePath(path) {
  return path.split('/').map(s => encodeURIComponent(s)).join('/');
}

function mimeType(name) {
  if (name.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (name.endsWith('.ts'))   return 'video/mp2t';
  if (name.endsWith('.mp4'))  return 'video/mp4';
  return 'application/octet-stream';
}

// ── Upload one file ───────────────────────────────────────────────────────────

async function uploadFile(localPath, b2Key) {
  const body     = await readFile(localPath);
  const bodyHash = sha256hex(body);
  const mime     = mimeType(basename(localPath));

  const now       = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStamp = now.toISOString().replace(/[:\-]/g, '').replace(/\.\d+/, '') ;

  // Path-style: /<bucket>/<key>
  const encodedPath    = `/${BUCKET}/${uriEncodePath(b2Key)}`;
  const canonicalQuery = '';

  const canonicalHeaders =
    `content-type:${mime}\n` +
    `host:${HOST}\n` +
    `x-amz-content-sha256:${bodyHash}\n` +
    `x-amz-date:${timeStamp}\n`;

  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    'PUT',
    encodedPath,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join('\n');

  const credScope = `${dateStamp}/${REGION}/s3/aws4_request`;
  const strToSign = [
    'AWS4-HMAC-SHA256',
    timeStamp,
    credScope,
    sha256hex(canonicalRequest),
  ].join('\n');

  const signature = hmacHex(getSigningKey(dateStamp), strToSign);
  const auth      = `AWS4-HMAC-SHA256 Credential=${KEY_ID}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const url = `https://${HOST}/${BUCKET}/${b2Key}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type':         mime,
      'Host':                 HOST,
      'x-amz-date':           timeStamp,
      'x-amz-content-sha256': bodyHash,
      'Authorization':        auth,
      'Content-Length':       String(body.length),
    },
    body,
    // @ts-ignore — disable compression for binary uploads
    duplex: 'half',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
}

async function uploadFileWithRetry(localPath, b2Key, retries = 4) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await uploadFile(localPath, b2Key);
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = attempt * 2000; // 2s, 4s, 6s backoff
      process.stdout.write(` retry ${attempt}...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

// ── Walk folder ───────────────────────────────────────────────────────────────

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const files = [];
  for await (const f of walk(localFolder)) files.push(f);

  console.log(`\n📦 Uploading ${files.length} files to b2://${BUCKET}/${b2Prefix}/\n`);

  let done = 0;
  for (const localPath of files) {
    const rel   = relative(localFolder, localPath).replace(/\\/g, '/');
    const b2Key = `${b2Prefix}/${rel}`;

    process.stdout.write(`  [${++done}/${files.length}] ${rel} ... `);
    try {
      await uploadFileWithRetry(localPath, b2Key);
      console.log('✅');
    } catch (err) {
      console.log(`❌  ${err.message}`);
      process.exit(1);
    }
  }

  console.log(`\n🎉 Done! All ${files.length} files uploaded.`);
  console.log(`\nSet in DB:  b2VideoKey = "${b2Prefix}/master.m3u8"\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
