// src/app/api/entitlements/check/route.ts
//
// GET /api/entitlements/check?resourceType=CHAPTER&resourceId=<id>
//
// Server-side entitlement check. Returns whether the authenticated user
// has access to the specified resource. Safe to call from client components
// when needed, but the real enforcement happens in server components and
// API routes that serve actual content.

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { checkEntitlement } from '@/lib/entitlement';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resourceType = searchParams.get('resourceType');
  const resourceId   = searchParams.get('resourceId');

  if (resourceType !== 'CHAPTER' && resourceType !== 'SUBJECT') {
    return NextResponse.json(
      { error: 'resourceType must be CHAPTER or SUBJECT.' },
      { status: 400 },
    );
  }

  if (!resourceId) {
    return NextResponse.json({ error: 'resourceId is required.' }, { status: 400 });
  }

  const userId = await getCurrentUser();
  const result = await checkEntitlement(userId, resourceType, resourceId);

  // Serialize Dates to ISO strings for the client
  return NextResponse.json({
    ...result,
    expiresAt: result.allowed && result.expiresAt
      ? result.expiresAt.toISOString()
      : null,
  });
}
