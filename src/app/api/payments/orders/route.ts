// src/app/api/payments/orders/route.ts
//
// DEPRECATED — use POST /api/orders/create instead.

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
