// src/app/api/payments/webhook/route.ts
//
// DEPRECATED — the unified webhook is now at POST /api/webhooks/razorpay
// Update your Razorpay webhook URL in the Razorpay dashboard to point there.

import { NextResponse } from 'next/server';

const GONE = {
  error: 'This webhook endpoint has moved. Update your Razorpay webhook URL to /api/webhooks/razorpay',
  replacedBy: '/api/webhooks/razorpay',
};

export async function POST() {
  return NextResponse.json(GONE, { status: 410 });
}
