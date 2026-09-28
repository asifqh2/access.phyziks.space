// src/app/api/videos/[id]/token/route.ts
//
// POST /api/videos/:chapterId/token
//
// Issues a short-lived signed token that the Cloudflare Worker uses to
// authenticate HLS requests against Backblaze B2.
//
// Request body (optional JSON):
//   { topicId?: string, subtopicId?: string }
//
//   - Omit both  → chapter-level video  (Chapter.b2VideoKey)
//   - topicId    → topic-level video    (Topic.b2VideoKey)
//   - subtopicId → subtopic-level video (Subtopic.b2VideoKey)
//
// Success response:
//   {
//     token:      string,       // the HMAC-signed JWT
//     hlsUrl:     string,       // full CDN URL the client passes to hls.js
//     expiresAt:  string,       // ISO-8601 expiry timestamp
//   }
//
// Security guarantees:
//   - User identity from Clerk auth(), never from request body.
//   - Entitlement checked for the parent chapter before any token is issued.
//   - The b2VideoKey (B2 object path) is NEVER sent to the client.
//   - Token is HMAC-SHA256 signed with VIDEO_TOKEN_SECRET.
//   - Token is bound to the chapterId — Worker rejects mismatched paths.
//   - Token TTL: VIDEO_TOKEN_TTL_SECONDS (default 900 s / 15 min).

import { NextResponse }          from 'next/server';
import { prisma }                from '@/lib/prisma';
import { requireUser }           from '@/lib/auth-helpers';
import { checkEntitlement }      from '@/lib/entitlement';
import { generateVideoToken }    from '@/lib/video-token';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: chapterId } = await params;

  // ── 1. Authenticate ────────────────────────────────────────────────────────
  const { userId, error: authError } = await requireUser();
  if (authError) return authError;

  // ── 2. Parse optional body ─────────────────────────────────────────────────
  let topicId:    string | undefined;
  let subtopicId: string | undefined;

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    if (typeof body.topicId    === 'string') topicId    = body.topicId;
    if (typeof body.subtopicId === 'string') subtopicId = body.subtopicId;
  } catch {
    // Body is optional — ignore parse errors
  }

  // ── 3. Verify entitlement for the chapter ─────────────────────────────────
  // The chapter is always the entitlement boundary, even for topic/subtopic videos.
  const authResult = await checkEntitlement(userId, 'CHAPTER', chapterId);
  if (!authResult.allowed) {
    return NextResponse.json(
      { error: reasonToMessage(authResult.reason), reason: authResult.reason },
      { status: authResult.reason === 'UNAUTHENTICATED' ? 401 : 403 },
    );
  }

  // ── 4. Resolve the B2 video key ────────────────────────────────────────────
  let b2VideoKey: string | null = null;

  if (subtopicId) {
    // Subtopic-level video
    const subtopic = await prisma.subtopic.findUnique({
      where: { id: subtopicId },
      select: { b2VideoKey: true, topic: { select: { chapterId: true } } },
    });
    // Guard: subtopic must belong to this chapter
    if (!subtopic || subtopic.topic.chapterId !== chapterId) {
      return NextResponse.json({ error: 'Subtopic not found.' }, { status: 404 });
    }
    b2VideoKey = subtopic.b2VideoKey;

  } else if (topicId) {
    // Topic-level video
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      select: { b2VideoKey: true, chapterId: true },
    });
    // Guard: topic must belong to this chapter
    if (!topic || topic.chapterId !== chapterId) {
      return NextResponse.json({ error: 'Topic not found.' }, { status: 404 });
    }
    b2VideoKey = topic.b2VideoKey;

  } else {
    // Chapter-level video (default)
    const chapter = await prisma.chapter.findUnique({
      where:  { id: chapterId },
      select: { b2VideoKey: true, isActive: true },
    });
    if (!chapter || !chapter.isActive) {
      return NextResponse.json({ error: 'Chapter not found.' }, { status: 404 });
    }
    b2VideoKey = chapter.b2VideoKey;
  }

  if (!b2VideoKey) {
    return NextResponse.json(
      { error: 'No B2 HLS video configured for this content.' },
      { status: 404 },
    );
  }

  // ── 5. Generate the signed token ──────────────────────────────────────────
  // Reuse an existing valid token for the same user+chapter if one exists,
  // so switching videos and coming back doesn't create a new token every time.
  let result: { token: string; hlsUrl: string; expiresAt: Date };
  try {
    result = await generateVideoToken({
      clerkUserId: userId,
      chapterId,
      b2VideoKey,
      topicId,
      subtopicId,
    });
  } catch (err) {
    console.error('[videos/token] generateVideoToken failed:', err);
    return NextResponse.json(
      { error: 'Unable to generate video token. Please try again.' },
      { status: 503 },
    );
  }

  // ── 6. Return token data — b2VideoKey is NEVER included ───────────────────
  return NextResponse.json({
    token:     result.token,
    hlsUrl:    result.hlsUrl,
    expiresAt: result.expiresAt.toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function reasonToMessage(reason: string): string {
  switch (reason) {
    case 'UNAUTHENTICATED':     return 'Please sign in to watch this video.';
    case 'NO_ENTITLEMENT':      return 'This video requires a purchase.';
    case 'ENTITLEMENT_EXPIRED': return 'Your access to this content has expired.';
    case 'ENTITLEMENT_REVOKED': return 'Your access to this content has been revoked.';
    default:                    return 'Access denied.';
  }
}
