// src/app/api/payments/access/route.ts
//
// DEPRECATED — use GET /api/entitlements/check?resourceType=CHAPTER&resourceId=<id>
// The old email-based access check is replaced by Clerk-authenticated entitlement checks.

import { NextResponse } from 'next/server';

const GONE = {
  error: 'This endpoint has been replaced. Use GET /api/entitlements/check?resourceType=CHAPTER&resourceId=<id>',
  replacedBy: '/api/entitlements/check',
};

export async function GET() {
  return NextResponse.json(GONE, { status: 410 });
}

export async function POST() {
  return NextResponse.json(GONE, { status: 410 });
}
