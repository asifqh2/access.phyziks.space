// src/app/api/admin/lms/route.ts
//
// Manages the full LMS content hierarchy.
//
// Resources (via ?resource= query param):
//   classes    — LmsClass
//   subjects   — Subject
//   chapters   — Chapter
//   topics     — Topic (belongs to a chapter)
//   subtopics  — Subtopic (belongs to a topic)
//   worksheets — Worksheet (belongs to a topic OR subtopic)
//
// GET    /api/admin/lms                        — full hierarchy with topic counts
// POST   /api/admin/lms?resource=classes       — create class
// POST   /api/admin/lms?resource=subjects      — create subject
// POST   /api/admin/lms?resource=chapters      — create chapter
// POST   /api/admin/lms?resource=topics        — create topic
// POST   /api/admin/lms?resource=subtopics     — create subtopic
// PUT    /api/admin/lms?resource=X&id=Y        — update any resource
// DELETE /api/admin/lms?resource=topics&id=Y   — delete topic (cascades subtopics)
// DELETE /api/admin/lms?resource=subtopics&id=Y— delete subtopic

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseBody(request: Request): Promise<Record<string, unknown>> {
  return request.json().catch(() => { throw new Error('Invalid JSON body.'); });
}

/** Slugify a title for auto-fill */
function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — full hierarchy (includes topic/subtopic counts per chapter)
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get('resource');

  // ── worksheets — list for a specific chapter, topic or subtopic ────────────
  if (resource === 'worksheets') {
    const chapterId  = searchParams.get('chapterId')  ?? undefined;
    const topicId    = searchParams.get('topicId')    ?? undefined;
    const subtopicId = searchParams.get('subtopicId') ?? undefined;
    if (!chapterId && !topicId && !subtopicId)
      return NextResponse.json({ error: 'chapterId, topicId or subtopicId is required.' }, { status: 400 });

    const where = chapterId ? { chapterId } : topicId ? { topicId } : { subtopicId };
    const worksheets = await prisma.worksheet.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(worksheets);
  }

  // ── default — full hierarchy (unchanged) ─────────────────────────────────
  const classes = await prisma.lmsClass.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      subjects: {
        orderBy: { sortOrder: 'asc' },
        include: {
          chapters: {
            orderBy: { sortOrder: 'asc' },
            include: {
              _count: { select: { topics: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(classes);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — create resource
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get('resource');

  let body: Record<string, unknown>;
  try { body = await parseBody(request); }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }

  // ── classes ────────────────────────────────────────────────────────────────
  if (resource === 'classes') {
    const { name, slug, sortOrder } = body as { name?: string; slug?: string; sortOrder?: number };
    if (!name || !slug) return NextResponse.json({ error: 'name and slug are required.' }, { status: 400 });
    if (await prisma.lmsClass.findUnique({ where: { slug } }))
      return NextResponse.json({ error: 'Slug already in use.' }, { status: 409 });
    return NextResponse.json(
      await prisma.lmsClass.create({ data: { name, slug, sortOrder: sortOrder ?? 0 } }),
      { status: 201 },
    );
  }

  // ── subjects ───────────────────────────────────────────────────────────────
  if (resource === 'subjects') {
    const { classId, name, slug, sortOrder } = body as { classId?: string; name?: string; slug?: string; sortOrder?: number };
    if (!classId || !name || !slug) return NextResponse.json({ error: 'classId, name and slug are required.' }, { status: 400 });
    if (!await prisma.lmsClass.findUnique({ where: { id: classId } }))
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
    return NextResponse.json(
      await prisma.subject.create({ data: { classId, name, slug, sortOrder: sortOrder ?? 0 } }),
      { status: 201 },
    );
  }

  // ── chapters ───────────────────────────────────────────────────────────────
  if (resource === 'chapters') {
    const { subjectId, name, slug, sortOrder, isFree } = body as { subjectId?: string; name?: string; slug?: string; sortOrder?: number; isFree?: boolean };
    if (!subjectId || !name || !slug) return NextResponse.json({ error: 'subjectId, name and slug are required.' }, { status: 400 });
    if (!await prisma.subject.findUnique({ where: { id: subjectId } }))
      return NextResponse.json({ error: 'Subject not found.' }, { status: 404 });
    return NextResponse.json(
      await prisma.chapter.create({ data: { subjectId, name, slug, sortOrder: sortOrder ?? 0, isFree: isFree ?? false } }),
      { status: 201 },
    );
  }

  // ── topics ─────────────────────────────────────────────────────────────────
  if (resource === 'topics') {
    const { chapterId, title, slug, description, youtubeVideoId, duration, sortOrder, isFree } = body as {
      chapterId?: string; title?: string; slug?: string; description?: string;
      youtubeVideoId?: string; duration?: number; sortOrder?: number; isFree?: boolean;
    };
    if (!chapterId || !title) return NextResponse.json({ error: 'chapterId and title are required.' }, { status: 400 });
    if (!await prisma.chapter.findUnique({ where: { id: chapterId } }))
      return NextResponse.json({ error: 'Chapter not found.' }, { status: 404 });
    const finalSlug = slug?.trim() || toSlug(title);
    return NextResponse.json(
      await prisma.topic.create({
        data: {
          chapterId,
          title:         title.trim(),
          slug:          finalSlug,
          description:   description?.trim() ?? null,
          youtubeVideoId: youtubeVideoId?.trim() ?? null,
          duration:      duration ?? null,
          sortOrder:     sortOrder ?? 0,
          isFree:        isFree ?? false,
        },
      }),
      { status: 201 },
    );
  }

  // ── subtopics ──────────────────────────────────────────────────────────────
  if (resource === 'subtopics') {
    const { topicId, title, slug, description, youtubeVideoId, duration, sortOrder, isFree } = body as {
      topicId?: string; title?: string; slug?: string; description?: string;
      youtubeVideoId?: string; duration?: number; sortOrder?: number; isFree?: boolean;
    };
    if (!topicId || !title) return NextResponse.json({ error: 'topicId and title are required.' }, { status: 400 });
    if (!await prisma.topic.findUnique({ where: { id: topicId } }))
      return NextResponse.json({ error: 'Topic not found.' }, { status: 404 });
    const finalSlug = slug?.trim() || toSlug(title);
    return NextResponse.json(
      await prisma.subtopic.create({
        data: {
          topicId,
          title:         title.trim(),
          slug:          finalSlug,
          description:   description?.trim() ?? null,
          youtubeVideoId: youtubeVideoId?.trim() ?? null,
          duration:      duration ?? null,
          sortOrder:     sortOrder ?? 0,
          isFree:        isFree ?? false,
        },
      }),
      { status: 201 },
    );
  }

  // ── worksheets ─────────────────────────────────────────────────────────────
  if (resource === 'worksheets') {
    const { chapterId, topicId, subtopicId, title, content, sortOrder } = body as {
      chapterId?: string; topicId?: string; subtopicId?: string;
      title?: string; content?: string; sortOrder?: number;
    };
    if (!title?.trim()) return NextResponse.json({ error: 'title is required.' }, { status: 400 });
    if (!chapterId && !topicId && !subtopicId)
      return NextResponse.json({ error: 'chapterId, topicId or subtopicId is required.' }, { status: 400 });
    if (chapterId && !await prisma.chapter.findUnique({ where: { id: chapterId } }))
      return NextResponse.json({ error: 'Chapter not found.' }, { status: 404 });
    if (topicId && !await prisma.topic.findUnique({ where: { id: topicId } }))
      return NextResponse.json({ error: 'Topic not found.' }, { status: 404 });
    if (subtopicId && !await prisma.subtopic.findUnique({ where: { id: subtopicId } }))
      return NextResponse.json({ error: 'Subtopic not found.' }, { status: 404 });
    return NextResponse.json(
      await prisma.worksheet.create({
        data: {
          chapterId:  chapterId  ?? null,
          topicId:    topicId    ?? null,
          subtopicId: subtopicId ?? null,
          title:      title.trim(),
          content:    content?.trim() ?? '',
          sortOrder:  sortOrder ?? 0,
        },
      }),
      { status: 201 },
    );
  }

  return NextResponse.json({ error: 'resource must be classes, subjects, chapters, topics, subtopics, or worksheets.' }, { status: 400 });
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT — update resource
// ─────────────────────────────────────────────────────────────────────────────

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get('resource');
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await parseBody(request); }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }

  if (resource === 'classes') {
    if (!await prisma.lmsClass.findUnique({ where: { id } }))
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
    return NextResponse.json(await prisma.lmsClass.update({
      where: { id },
      data: {
        ...(body.name      != null && { name:      body.name      as string }),
        ...(body.sortOrder != null && { sortOrder: body.sortOrder as number }),
        ...(body.isActive  != null && { isActive:  body.isActive  as boolean }),
      },
    }));
  }

  if (resource === 'subjects') {
    if (!await prisma.subject.findUnique({ where: { id } }))
      return NextResponse.json({ error: 'Subject not found.' }, { status: 404 });
    return NextResponse.json(await prisma.subject.update({
      where: { id },
      data: {
        ...(body.name      != null && { name:      body.name      as string }),
        ...(body.sortOrder != null && { sortOrder: body.sortOrder as number }),
        ...(body.isActive  != null && { isActive:  body.isActive  as boolean }),
      },
    }));
  }

  if (resource === 'chapters') {
    if (!await prisma.chapter.findUnique({ where: { id } }))
      return NextResponse.json({ error: 'Chapter not found.' }, { status: 404 });
    return NextResponse.json(await prisma.chapter.update({
      where: { id },
      data: {
        ...(body.name      != null && { name:      body.name      as string }),
        ...(body.sortOrder != null && { sortOrder: body.sortOrder as number }),
        ...(body.isActive  != null && { isActive:  body.isActive  as boolean }),
        ...(body.isFree    != null && { isFree:    body.isFree    as boolean }),
      },
    }));
  }

  if (resource === 'topics') {
    if (!await prisma.topic.findUnique({ where: { id } }))
      return NextResponse.json({ error: 'Topic not found.' }, { status: 404 });
    return NextResponse.json(await prisma.topic.update({
      where: { id },
      data: {
        ...(body.title          != null && { title:         (body.title as string).trim() }),
        ...(body.description    != null && { description:   body.description === '' ? null : (body.description as string).trim() }),
        ...(body.youtubeVideoId != null && { youtubeVideoId: body.youtubeVideoId === '' ? null : (body.youtubeVideoId as string).trim() }),
        ...(body.duration       != null && { duration:      body.duration as number }),
        ...(body.sortOrder      != null && { sortOrder:     body.sortOrder as number }),
        ...(body.isActive       != null && { isActive:      body.isActive as boolean }),
        ...(body.isFree         != null && { isFree:        body.isFree   as boolean }),
      },
    }));
  }

  if (resource === 'subtopics') {
    if (!await prisma.subtopic.findUnique({ where: { id } }))
      return NextResponse.json({ error: 'Subtopic not found.' }, { status: 404 });
    return NextResponse.json(await prisma.subtopic.update({
      where: { id },
      data: {
        ...(body.title          != null && { title:         (body.title as string).trim() }),
        ...(body.description    != null && { description:   body.description === '' ? null : (body.description as string).trim() }),
        ...(body.youtubeVideoId != null && { youtubeVideoId: body.youtubeVideoId === '' ? null : (body.youtubeVideoId as string).trim() }),
        ...(body.duration       != null && { duration:      body.duration as number }),
        ...(body.sortOrder      != null && { sortOrder:     body.sortOrder as number }),
        ...(body.isActive       != null && { isActive:      body.isActive as boolean }),
        ...(body.isFree         != null && { isFree:        body.isFree   as boolean }),
      },
    }));
  }

  // ── worksheets ─────────────────────────────────────────────────────────────
  if (resource === 'worksheets') {
    if (!await prisma.worksheet.findUnique({ where: { id } }))
      return NextResponse.json({ error: 'Worksheet not found.' }, { status: 404 });
    return NextResponse.json(await prisma.worksheet.update({
      where: { id },
      data: {
        ...(body.title     != null && { title:     (body.title as string).trim() }),
        ...(body.content   != null && { content:   (body.content as string).trim() }),
        ...(body.sortOrder != null && { sortOrder: body.sortOrder as number }),
        ...(body.isActive  != null && { isActive:  body.isActive as boolean }),
      },
    }));
  }

  return NextResponse.json({ error: 'resource must be classes, subjects, chapters, topics, subtopics, or worksheets.' }, { status: 400 });
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — remove topic or subtopic only
// (chapters/subjects/classes are never hard-deleted from this route)
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get('resource');
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  if (resource === 'topics') {
    if (!await prisma.topic.findUnique({ where: { id } }))
      return NextResponse.json({ error: 'Topic not found.' }, { status: 404 });
    // Cascade to subtopics is handled by DB onDelete: Cascade
    await prisma.topic.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  }

  if (resource === 'subtopics') {
    if (!await prisma.subtopic.findUnique({ where: { id } }))
      return NextResponse.json({ error: 'Subtopic not found.' }, { status: 404 });
    await prisma.subtopic.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  }

  if (resource === 'worksheets') {
    if (!await prisma.worksheet.findUnique({ where: { id } }))
      return NextResponse.json({ error: 'Worksheet not found.' }, { status: 404 });
    await prisma.worksheet.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  }

  return NextResponse.json({ error: 'Only topics, subtopics, and worksheets can be deleted via this route.' }, { status: 400 });
}
