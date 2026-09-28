// src/components/Header.tsx  (server component — no 'use client')
//
// Server wrapper that checks admin status via Clerk server-side auth,
// then passes isAdmin to the client shell (HeaderClient).
//
// This is the correct pattern for conditionally showing admin-only UI:
//   - isAdmin is computed on the server from ADMIN_CLERK_USER_IDS
//   - The client shell receives it as a prop — no client-side check
//   - Non-admin users never receive isAdmin=true, even by inspecting JS
//
// The /studio route itself is also protected by Clerk middleware +
// requireAdmin() — hiding the link is UX only, not the security boundary.

import { isAdmin } from '@/lib/auth-helpers';
import HeaderClient from '@/components/HeaderClient';

export default async function Header() {
  const adminUser = await isAdmin();
  return <HeaderClient isAdmin={adminUser} />;
}
