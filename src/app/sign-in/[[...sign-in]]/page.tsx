// src/app/sign-in/[[...sign-in]]/page.tsx
//
// Clerk's hosted SignIn component.
// The [[...sign-in]] catch-all route is required by Clerk so it can handle
// its own internal sub-routes (email verification, OAuth callbacks, etc.)
//
// NEXT_PUBLIC_CLERK_SIGN_IN_URL must be set to /sign-in in .env.local
// NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL must be set to /

import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <SignIn />
    </main>
  );
}
