// src/app/api/studio/reorder/route.ts
//
// POST /api/studio/reorder
//
// Bulk-updates sortOrder for a list of topics OR subtopics in a single
// Prisma transaction. Called after the user drops an item in the Studio.
//
// Body:
//   { resource: 'topics' | 'subtopics', ids: string[] }
//
// ids must be the complete ordered list for that parent — index 0 gets
// sortOrder 0, index 1 gets sortOrder 1, etc.
//
// Security: admin-only via requireAdmin().

import { NextResponse } from 'next/server';
import { prisma }       from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';

interface ReorderBody {
  resource: 'topics' | 'subtopics' | 'examQuestions';
  ids:      string[];
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: ReorderBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { resource, ids } = body;

  if (resource !== 'topics' && resource !== 'subtopics' && resource !== 'examQuestions')
    return NextResponse.json({ error: 'resource must be topics, subtopics, or examQuestions.' }, { status: 400 });

  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ error: 'ids must be a non-empty array.' }, { status: 400 });

  // Run all updates in one transaction — all succeed or none do
  await prisma.$transaction(
    ids.map((id, index) =>
      resource === 'topics'
        ? prisma.topic.update({        where: { id }, data: { sortOrder: index } })
        : resource === 'subtopics'
        ? prisma.subtopic.update({     where: { id }, data: { sortOrder: index } })
        : prisma.examQuestion.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  return NextResponse.json({ ok: true });
}
