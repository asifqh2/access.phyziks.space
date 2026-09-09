// src/app/api/admin/entitlements/[id]/route.ts
//
// GET    /api/admin/entitlements/:id  — get single entitlement
// PUT    /api/admin/entitlements/:id  — update status / extend expiry
// DELETE /api/admin/entitlements/:id  — revoke (sets status=REVOKED)

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const entitlement = await prisma.entitlement.findUnique({
    where: { id },
    include: {
      plan:    true,
      class:   { select: { name: true } },
      subject: { select: { name: true } },
      chapter: { select: { name: true } },
      order:   { select: { gatewayOrderId: true, status: true, amountPaise: true, createdAt: true } },
    },
  });

  if (!entitlement) return NextResponse.json({ error: 'Entitlement not found.' }, { status: 404 });
  return NextResponse.json(entitlement);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  let body: {
    status?:      string;
    expiresAt?:   string | null;
    isPermanent?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const entitlement = await prisma.entitlement.findUnique({ where: { id } });
  if (!entitlement) return NextResponse.json({ error: 'Entitlement not found.' }, { status: 404 });

  const validStatuses = ['ACTIVE', 'EXPIRED', 'REVOKED'];
  if (body.status && !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  }

  const updated = await prisma.entitlement.update({
    where: { id },
    data: {
      ...(body.status      != null && { status:      body.status as never }),
      ...(body.isPermanent != null && { isPermanent: body.isPermanent }),
      ...('expiresAt' in body && {
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const entitlement = await prisma.entitlement.findUnique({ where: { id } });
  if (!entitlement) return NextResponse.json({ error: 'Entitlement not found.' }, { status: 404 });

  // Revoke rather than hard-delete to preserve audit trail
  const revoked = await prisma.entitlement.update({
    where: { id },
    data: { status: 'REVOKED' },
  });

  return NextResponse.json({ message: 'Entitlement revoked.', entitlement: revoked });
}
