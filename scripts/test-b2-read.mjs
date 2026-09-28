/**
 * Tests reading from B2 using both keys to find which one works.
 */
import { createHmac, createHash } from 'crypto';

const BUCKET = 'phyziks-videos';
const REGION = 'eu-central-003';
const B2HOST = `${BUCKET}.s3.${REGION}.backblazeb2.com`;
const TEST_KEY = 'videos/cmtafsmbb0006ngvfqu75vson/master.m3u8';

const KEYS = [
  { id: '003f9d2140141aa0000000003', secret: 'K003QffigCma5011WML0PrM5aeBf75E:', label: 'read-only key (003)' },
  { id: '003f9d2140141aa0000000004', secret: 'K003x5W4f90vDALyBZVMe/uFEv00O3Q',  label: 'read-write key (004)' },
];

function sha256hex(data) {
  return createHash('sha256').update(data).digest('hex');
}
function hmac(key, data) {
  return createHmac('sha256', key).update(data).digest();
}
function hmacHex(key, data) {
  return createHmac('sha256', key).update(data).digest('hex');
}

async function testKey({ id, secret, label }) {
  const now       = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStamp = now.toISOString().replace(/[:\-]/g, '').replace(/\.\d+Z/, 'Z');

  const canonicalUri   = '/' + TEST_KEY.split('/').map(encodeURIComponent).join('/');
  const canonicalHeaders =
    `host:${B2HOST}\n` +
    `x-amz-content-sha256:UNSIGNED-PAYLOAD\n` +
    `x-amz-date:${timeStamp}\n`;
  const signedHeaders  = 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = ['GET', canonicalUri, '', canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n');

  const credScope = `${dateStamp}/${REGION}/s3/aws4_request`;
  const strToSign = ['AWS4-HMAC-SHA256', timeStamp, credScope, sha256hex(canonicalRequest)].join('\n');

  const kDate    = hmac(`AWS4${secret}`, dateStamp);
  const kRegion  = hmac(kDate, REGION);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const sig      = hmacHex(kSigning, strToSign);

  const auth = `AWS4-HMAC-SHA256 Credential=${id}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${sig}`;
  const url  = `https://${B2HOST}/${TEST_KEY}`;

  try {
    const res  = await fetch(url, {
      headers: {
        'Authorization':        auth,
        'x-amz-date':           timeStamp,
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      },
    });
    const body = await res.text();
    console.log(`[${label}] status=${res.status} body_preview=${body.slice(0,120)}`);
  } catch (e) {
    console.log(`[${label}] fetch error: ${e.message}`);
  }
}

for (const k of KEYS) await testKey(k);
