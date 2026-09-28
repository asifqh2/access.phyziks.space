// src/app/api/studio/chapters/[id]/route.ts
//
// GET   /api/studio/chapters/:id  — fetch chapter with its topics and subtopics
// PATCH /api/studio/chapters/:id  — update chapter content fields
//
// Security: admin-only via requireAdmin().

import { NextResponse } from 'next/server';
import { prisma }       from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';

interface ChapterPatchBody {
  name?:             string;
  description?:      string;
  isFree?:           boolean;
  youtubeUrl?:       string | null;
  videoKey?:         string | null;
  isActive?:         boolean;
  testPanelEnabled?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — chapter + topics + subtopics
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const chapter = await prisma.chapter.findUnique({
    where: { id },
    include: {
      topics: {
        orderBy: { sortOrder: 'asc' },
        include: {
          subtopics: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });

  if (!chapter) return NextResponse.json({ error: 'Chapter not found.' }, { status: 404 });

  // Strip videoKey — never send to client
  const { videoKey: _vk, ...chapterSafe } = chapter;
  return NextResponse.json(chapterSafe);
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — update chapter content fields
// ─────────────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  let body: ChapterPatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const existing = await prisma.chapter.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Chapter not found.' }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.name        != null) data.name             = String(body.name).trim();
  if (body.description != null) data.description      = String(body.description).trim() || null;
  if (body.isFree      != null) data.isFree           = Boolean(body.isFree);
  if (body.isActive    != null) data.isActive         = Boolean(body.isActive);
  if (body.testPanelEnabled != null) data.testPanelEnabled = Boolean(body.testPanelEnabled);
  if ('youtubeUrl' in body)     data.youtubeUrl       = body.youtubeUrl ?? null;
  if ('videoKey'   in body)     data.videoKey         = body.videoKey   ?? null;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });

  const updated = await prisma.chapter.update({ where: { id }, data });

  return NextResponse.json({
    id:               updated.id,
    name:             updated.name,
    description:      updated.description,
    isFree:           updated.isFree,
    youtubeUrl:       updated.youtubeUrl,
    hasVideo:         !!updated.videoKey,
    isActive:         updated.isActive,
    testPanelEnabled: updated.testPanelEnabled,
  });
}
