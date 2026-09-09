// src/app/api/payments/subscriptions/route.ts
//
// DEPRECATED — Razorpay recurring subscriptions are no longer used.
// All plans are one-time orders. Use POST /api/orders/create.

import { NextResponse } from 'next/server';

const GONE = {
  error: 'Recurring subscriptions have been replaced by one-time order plans. Use POST /api/orders/create.',
  replacedBy: '/api/orders/create',
};

export async function POST() {
  return NextResponse.json(GONE, { status: 410 });
}

export async function GET() {
  return NextResponse.json(GONE, { status: 410 });
}
