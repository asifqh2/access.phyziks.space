// src/app/api/videos/[id]/play/route.ts
//
// GET /api/videos/:chapterId/play
//
// Returns video playback data for a chapter. Three content modes:
//
//   1. Paid B2/HLS video (Chapter.b2VideoKey is set)
//      → Entitlement check → redirect to /api/videos/:id/token
//        which generates a short-lived signed token for the Cloudflare Worker.
//        Response: { type:'b2-hls', tokenUrl }
//        Client POSTs tokenUrl to get { token, hlsUrl, expiresAt } and feeds
//        hlsUrl to hls.js.
//
//   2. Paid R2/S3 video (Chapter.videoKey is set)
//      → Entitlement check → 15-min signed URL (never the raw key)
//
//   3. YouTube video (Chapter.youtubeUrl is set)
//      → Returns { type:'youtube', youtubeVideoId } — the bare 11-char ID only.
//         The full YouTube URL is NEVER sent to the client; the client builds
//         the embed URL itself (youtube-nocookie.com/embed/<id>).
//
//   4. Chapter has no video yet → 404
//
// Security guarantees:
//   - User identity from Clerk auth(), never from URL params or body.
//   - Chapter fetched from DB — client cannot inject a different chapter.
//   - Entitlement checked before any video data is returned.
//   - Raw B2 key / R2 key / bucket name never sent to the client.
//   - Full YouTube URL never sent to the client — only the bare video ID.
//   - B2 HLS tokens expire in VIDEO_TOKEN_TTL_SECONDS (default 15 min).
//   - R2 signed URLs expire in VIDEO_URL_TTL_SECONDS (default 15 min).

import { NextResponse }     from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl }     from '@aws-sdk/s3-request-presigner';
import { S3Client }         from '@aws-sdk/client-s3';
import { prisma }           from '@/lib/prisma';
import { getCurrentUser }   from '@/lib/auth-helpers';
import { checkEntitlement } from '@/lib/entitlement';

// ── R2/S3 client (module-level singleton) ────────────────────────────────────
const s3 = new S3Client({
  region:   process.env.AWS_REGION ?? 'auto',
  endpoint: process.env.R2_ENDPOINT ?? process.env.AWS_ENDPOINT_URL,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID     ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
});

const BUCKET  = process.env.AWS_S3_BUCKET ?? process.env.R2_BUCKET ?? '';
const TTL_SEC = parseInt(process.env.VIDEO_URL_TTL_SECONDS ?? '900', 10);

// ── Extract the bare 11-char video ID from any YouTube URL format ─────────────
function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: chapterId } = await params;

  // ── 1. Load chapter ────────────────────────────────────────────────────────
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id:         true,
      name:       true,
      isFree:     true,
      isActive:   true,
      subjectId:  true,
      b2VideoKey: true,   // Backblaze B2 HLS path — for secure HLS streaming
      videoKey:   true,   // R2 object key — for paid protected videos
      youtubeUrl: true,   // YouTube URL — stored server-side only, never forwarded
    },
  });

  if (!chapter || !chapter.isActive) {
    return NextResponse.json({ error: 'Content not found.' }, { status: 404 });
  }

  if (!chapter.b2VideoKey && !chapter.videoKey && !chapter.youtubeUrl) {
    return NextResponse.json(
      { error: 'No video has been added to this chapter yet.' },
      { status: 404 },
    );
  }

  // ── 2. Free YouTube content — no entitlement needed ───────────────────────
  if (chapter.isFree && chapter.youtubeUrl) {
    const videoId = extractYouTubeId(chapter.youtubeUrl);
    if (!videoId) {
      return NextResponse.json({ error: 'Content not found.' }, { status: 404 });
    }
    return NextResponse.json({
      type:            'youtube',
      youtubeVideoId:  videoId,   // bare ID only — no full URL exposed
      isPermanent:     true,
      accessExpiresAt: null,
    });
  }

  // ── 3. Paid content — require authentication + valid entitlement ──────────
  const userId = await getCurrentUser();
  const authResult = await checkEntitlement(userId, 'CHAPTER', chapterId);

  if (!authResult.allowed) {
    return NextResponse.json(
      {
        error:  reasonToMessage(authResult.reason),
        reason: authResult.reason,
      },
      {
        status: authResult.reason === 'UNAUTHENTICATED' ? 401 : 403,
      },
    );
  }

  // ── 4. B2 HLS video (priority over R2 and YouTube) ───────────────────────
  // Return a tokenUrl — the client POSTs to it to get the actual HLS URL.
  // The B2 key is NEVER sent to the client.
  if (chapter.b2VideoKey) {
    return NextResponse.json({
      type:            'b2-hls',
      // Relative URL — client calls POST /api/videos/<id>/token to get the token
      tokenUrl:        `/api/videos/${chapterId}/token`,
      isPermanent:     authResult.isPermanent,
      accessExpiresAt: authResult.expiresAt?.toISOString() ?? null,
    });
  }

  // ── 5. Paid chapter with YouTube video (no R2/B2 key) ────────────────────
  if (chapter.youtubeUrl && !chapter.videoKey) {
    const videoId = extractYouTubeId(chapter.youtubeUrl);
    if (!videoId) {
      return NextResponse.json({ error: 'Content not found.' }, { status: 404 });
    }
    return NextResponse.json({
      type:            'youtube',
      youtubeVideoId:  videoId,   // bare ID only — no full URL exposed
      isPermanent:     authResult.isPermanent,
      accessExpiresAt: authResult.expiresAt?.toISOString() ?? null,
    });
  }

  // ── 6. Generate signed R2/S3 URL ──────────────────────────────────────────
  if (!BUCKET) {
    console.error('[videos/play] R2_BUCKET / AWS_S3_BUCKET env var not set.');
    return NextResponse.json(
      { error: 'Video storage is not configured.' },
      { status: 503 },
    );
  }

  const objectKey = chapter.videoKey!;

  let signedUrl: string;
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key:    objectKey,
      ResponseContentDisposition: 'inline',
      ResponseContentType:        'video/mp4',
    });
    signedUrl = await getSignedUrl(s3, command, { expiresIn: TTL_SEC });
  } catch (err) {
    console.error(`[videos/play] Failed to generate signed URL for key "${objectKey}":`, err);
    return NextResponse.json(
      { error: 'Unable to generate video URL. Please try again.' },
      { status: 502 },
    );
  }

  // ── 6. Return signed URL — raw key never included ─────────────────────────
  return NextResponse.json({
    type:            'r2',
    url:             signedUrl,
    expiresIn:       TTL_SEC,
    isPermanent:     authResult.isPermanent,
    accessExpiresAt: authResult.expiresAt?.toISOString() ?? null,
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
