// src/app/api/create-order/route.ts
//
// DEPRECATED — use POST /api/orders/create instead.
// Returns 410 Gone so existing integrations fail loudly rather than silently.

import { NextResponse } from 'next/server';

const GONE = {
  error: 'This endpoint has been replaced. Use POST /api/orders/create.',
  replacedBy: '/api/orders/create',
};

export async function POST() {
  return NextResponse.json(GONE, { status: 410 });
}

export async function GET() {
  return NextResponse.json(GONE, { status: 410 });
}
