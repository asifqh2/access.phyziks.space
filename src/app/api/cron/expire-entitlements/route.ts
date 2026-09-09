// src/app/api/cron/expire-entitlements/route.ts
//
// GET /api/cron/expire-entitlements
//
// Nightly cleanup job that hard-deletes expired entitlements and their
// associated order/payment records.
//
// Access policy:
//   All paid plans grant 12 months (365 days) of access from purchase date.
//   After that, access is blocked in real time by the entitlement check.
//   This job then permanently erases the entitlement and order rows so the
//   user's payment history is cleared and they must purchase again.
//
// Security:
//   - Protected by a bearer token (CRON_SECRET env var).
//   - Also accepts the standard Vercel Cron authorization header.
//   - Returns 401 for any request without a valid token.
//   - Does NOT expose any entitlement data in the response.
//
// Invocation options:
//   1. Vercel Cron (recommended) — runs nightly at midnight UTC:
//      Add to vercel.json:
//        { "crons": [{ "path": "/api/cron/expire-entitlements", "schedule": "0 0 * * *" }] }
//      Vercel automatically sends Authorization: Bearer <CRON_SECRET>.
//
//   2. External cron (e.g. cron-job.org, GitHub Actions):
//      GET https://yourdomain.com/api/cron/expire-entitlements
//      Header: Authorization: Bearer <CRON_SECRET>
//
//   3. Manual admin trigger:
//      curl -H "Authorization: Bearer $CRON_SECRET" \
//           https://yourdomain.com/api/cron/expire-entitlements

import { NextResponse } from 'next/server';
import { purgeExpiredEntitlements } from '@/lib/entitlement';

export async function GET(request: Request) {
  // ── Verify bearer token ───────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[cron/expire-entitlements] CRON_SECRET env var is not set — refusing.');
    return NextResponse.json(
      { error: 'Cron endpoint is not configured.' },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // ── Run purge job ─────────────────────────────────────────────────────────
  try {
    const { entitlements, orders } = await purgeExpiredEntitlements();
    console.info(
      `[cron/expire-entitlements] Deleted ${entitlements} entitlement(s) and ${orders} order(s).`,
    );
    return NextResponse.json({ ok: true, deletedEntitlements: entitlements, deletedOrders: orders });
  } catch (err) {
    console.error('[cron/expire-entitlements] Failed:', err);
    return NextResponse.json(
      { error: 'Internal error during purge job.' },
      { status: 500 },
    );
  }
}
