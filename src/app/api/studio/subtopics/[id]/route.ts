// src/app/api/studio/subtopics/[id]/route.ts
//
// PATCH /api/studio/subtopics/:id  — update a subtopic's content fields
//
// Security: admin-only via requireAdmin().
//
// Writable fields (all optional):
//   title          — subtopic title
//   description    — short description
//   youtubeVideoId — YouTube video ID (e.g. "dQw4w9WgXcQ", NOT a full URL)
//   duration       — video duration in seconds
//   sortOrder      — display order within the topic
//   isActive       — publish / draft
//   isFree         — freely accessible without entitlement

import { NextResponse } from 'next/server';
import { prisma }       from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';

interface SubtopicPatchBody {
  title?:          string;
  description?:    string | null;
  youtubeVideoId?: string | null;
  duration?:       number | null;
  sortOrder?:      number;
  isActive?:       boolean;
  isFree?:         boolean;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  let body: SubtopicPatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const existing = await prisma.subtopic.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Subtopic not found.' }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.title          != null) data.title         = String(body.title).trim();
  if ('description'    in body)    data.description    = body.description   ? String(body.description).trim()   : null;
  if ('youtubeVideoId' in body)    data.youtubeVideoId = body.youtubeVideoId ? String(body.youtubeVideoId).trim() : null;
  if ('duration'       in body)    data.duration       = body.duration ?? null;
  if (body.sortOrder   != null)    data.sortOrder      = Number(body.sortOrder);
  if (body.isActive    != null)    data.isActive       = Boolean(body.isActive);
  if (body.isFree      != null)    data.isFree         = Boolean(body.isFree);

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });

  const updated = await prisma.subtopic.update({ where: { id }, data });

  return NextResponse.json({
    id:             updated.id,
    title:          updated.title,
    description:    updated.description,
    youtubeVideoId: updated.youtubeVideoId,
    duration:       updated.duration,
    sortOrder:      updated.sortOrder,
    isActive:       updated.isActive,
    isFree:         updated.isFree,
  });
}
