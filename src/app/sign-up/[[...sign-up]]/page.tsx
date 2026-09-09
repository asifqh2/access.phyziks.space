// src/app/sign-up/[[...sign-up]]/page.tsx
//
// Clerk's hosted SignUp component.
// The [[...sign-up]] catch-all route is required by Clerk so it can handle
// its own internal sub-routes (email verification, OAuth callbacks, etc.)
//
// NEXT_PUBLIC_CLERK_SIGN_UP_URL must be set to /sign-up in .env.local
// NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL must be set to /

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <SignUp />
    </main>
  );
}
