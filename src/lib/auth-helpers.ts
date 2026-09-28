// src/lib/auth-helpers.ts
//
// Server-side authentication helpers.
// ALL protected server actions and API routes must use these.
// Never trust userId, email, or any identity claim sent from the browser.

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// getCurrentUser
// ─────────────────────────────────────────────────────────────────────────────
// Returns the Clerk userId for the currently authenticated request.
// Returns null if the user is not signed in.
// Use this in API routes and server actions — never accept userId from the
// request body, query params, headers, or cookies.

export async function getCurrentUser(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// requireUser
// ─────────────────────────────────────────────────────────────────────────────
// Returns the Clerk userId or throws a 401 NextResponse.
// Use in API routes: const { userId, error } = await requireUser();

export async function requireUser(): Promise<
  { userId: string; error: null } | { userId: null; error: NextResponse }
> {
  const userId = await getCurrentUser();
  if (!userId) {
    return {
      userId: null,
      error: NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      ),
    };
  }
  return { userId, error: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// requireAdmin
// ─────────────────────────────────────────────────────────────────────────────
// Returns null if the current user is an admin, or a 403 NextResponse.
// Admin user IDs are stored in the ADMIN_CLERK_USER_IDS environment variable
// as a comma-separated list, e.g.:
//   ADMIN_CLERK_USER_IDS=user_abc123,user_def456
//
// This is intentionally simple — for a larger team use Clerk roles/metadata.

export async function requireAdmin(): Promise<
  { userId: string; error: null } | { userId: null; error: NextResponse }
> {
  const userId = await getCurrentUser();

  if (!userId) {
    return {
      userId: null,
      error: NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      ),
    };
  }

  const adminIds = (process.env.ADMIN_CLERK_USER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!adminIds.includes(userId)) {
    return {
      userId: null,
      error: NextResponse.json(
        { error: 'Forbidden.' },
        { status: 403 },
      ),
    };
  }

  return { userId, error: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// isAdmin
// ─────────────────────────────────────────────────────────────────────────────
// Non-throwing version — useful in page server components.

export async function isAdmin(): Promise<boolean> {
  const userId = await getCurrentUser();
  if (!userId) return false;
  const adminIds = (process.env.ADMIN_CLERK_USER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return adminIds.includes(userId);
}
