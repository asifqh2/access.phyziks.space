/**
 * Tests path-style vs virtual-hosted-style B2 access with key 004
 */
import { createHmac, createHash } from 'crypto';

const KEY_ID  = '003f9d2140141aa0000000004';
const APP_KEY = 'K003x5W4f90vDALyBZVMe/uFEv00O3Q';
const BUCKET  = 'phyziks-videos';
const REGION  = 'eu-central-003';
const OBJ_KEY = 'videos/cmtafsmbb0006ngvfqu75vson/master.m3u8';

function sha256hex(data) { return createHash('sha256').update(data).digest('hex'); }
function hmac(key, data) { return createHmac('sha256', key).update(data).digest(); }
function hmacHex(key, data) { return createHmac('sha256', key).update(data).digest('hex'); }

function sign({ host, canonicalUri }) {
  const now       = new Date();
  const dateStamp = now.toISOString().slice(0,10).replace(/-/g,'');
  const timeStamp = now.toISOString().replace(/[:\-]/g,'').replace(/\.\d+Z/,'Z');

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${timeStamp}\n`;
  const signedHeaders    = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['GET', canonicalUri, '', canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n');

  const credScope = `${dateStamp}/${REGION}/s3/aws4_request`;
  const strToSign = ['AWS4-HMAC-SHA256', timeStamp, credScope, sha256hex(canonicalRequest)].join('\n');

  const kDate = hmac(`AWS4${APP_KEY}`, dateStamp);
  const kReg  = hmac(kDate, REGION);
  const kSvc  = hmac(kReg, 's3');
  const kSign = hmac(kSvc, 'aws4_request');
  const sig   = hmacHex(kSign, strToSign);

  return {
    auth: `AWS4-HMAC-SHA256 Credential=${KEY_ID}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${sig}`,
    timeStamp,
  };
}

async function test(label, url, host, canonicalUri) {
  const { auth, timeStamp } = sign({ host, canonicalUri });
  const res  = await fetch(url, {
    headers: {
      Authorization: auth,
      'x-amz-date': timeStamp,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    },
  });
  const body = await res.text();
  console.log(`\n[${label}]`);
  console.log(`  URL: ${url}`);
  console.log(`  Status: ${res.status}`);
  console.log(`  Body: ${body.slice(0, 150)}`);
}

// Style 1: virtual-hosted  (bucket in subdomain, key only in path)
const vHost = `${BUCKET}.s3.${REGION}.backblazeb2.com`;
const vUri  = '/' + OBJ_KEY.split('/').map(encodeURIComponent).join('/');
await test('virtual-hosted', `https://${vHost}/${OBJ_KEY}`, vHost, vUri);

// Style 2: path-style  (bucket in path)
const pHost = `s3.${REGION}.backblazeb2.com`;
const pUri  = `/${BUCKET}/` + OBJ_KEY.split('/').map(encodeURIComponent).join('/');
await test('path-style', `https://${pHost}/${BUCKET}/${OBJ_KEY}`, pHost, pUri);

// Style 3: path-style, no encodeURIComponent on key
const pUri2 = `/${BUCKET}/${OBJ_KEY}`;
await test('path-style (no encoding)', `https://${pHost}/${BUCKET}/${OBJ_KEY}`, pHost, pUri2);
