/**
 * Tests the full token generation + HLS fetch flow locally,
 * bypassing the HTTP layer entirely.
 *
 * Run: npx tsx scripts/test-token-flow.ts
 */
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg }     from '@prisma/adapter-pg';
import { generateVideoToken } from '../src/lib/video-token';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

// Patch the prisma import used inside video-token.ts
// (it imports from @/lib/prisma which resolves differently in tsx)
// We test the crypto part directly here instead.

async function main() {
  const chapterId = 'cmtafsmbb0006ngvfqu75vson';

  console.log('\n── Env vars ─────────────────────────────────────────');
  console.log('VIDEO_TOKEN_SECRET length :', (process.env.VIDEO_TOKEN_SECRET ?? '').length);
  console.log('NEXT_PUBLIC_CDN_URL       :', process.env.NEXT_PUBLIC_CDN_URL);
  console.log('VIDEO_TOKEN_TTL_SECONDS   :', process.env.VIDEO_TOKEN_TTL_SECONDS ?? '(default 900)');

  console.log('\n── DB lookup ────────────────────────────────────────');
  const chapter = await prisma.chapter.findUnique({
    where:  { id: chapterId },
    select: { id: true, name: true, isFree: true, isActive: true, b2VideoKey: true },
  });
  console.log(JSON.stringify(chapter, null, 2));

  if (!chapter?.b2VideoKey) {
    console.error('❌ b2VideoKey is null — chapter has no B2 video');
    return;
  }

  console.log('\n── Token generation ─────────────────────────────────');
  try {
    const result = await generateVideoToken({
      clerkUserId: 'test-user-id',
      chapterId,
      b2VideoKey: chapter.b2VideoKey,
    });
    console.log('✅ Token generated successfully');
    console.log('hlsUrl   :', result.hlsUrl);
    console.log('expiresAt:', result.expiresAt.toISOString());
    console.log('token len:', result.token.length);

    console.log('\n── Testing CDN fetch (no token expected to work for Worker auth) ─');
    const masterUrl = result.hlsUrl;
    console.log('Fetching:', masterUrl.slice(0, 80) + '...');
    const res = await fetch(masterUrl);
    console.log('CDN status:', res.status);
    const body = await res.text();
    console.log('CDN response (first 300 chars):', body.slice(0, 300));
  } catch (err: unknown) {
    console.error('❌ generateVideoToken threw:', err);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
