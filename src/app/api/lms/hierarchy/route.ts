// src/app/api/lms/hierarchy/route.ts
//
// GET /api/lms/hierarchy
//
// Public endpoint — no authentication required.
// Returns the active class → subject → chapter tree so the client-side
// scope-picker modal can let users choose which chapter or subject to buy.
//
// Only active classes, subjects, and chapters are returned.
// videoKey and other sensitive fields are never included.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const classes = await prisma.lmsClass.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id:   true,
      name: true,
      subjects: {
        where:   { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id:   true,
          name: true,
          chapters: {
            where:   { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: {
              id:     true,
              name:   true,
              isFree: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json(classes);
}
