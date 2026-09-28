// src/middleware.ts
//
// Clerk middleware — handles authentication for protected routes.
//
// IMPORTANT: This middleware enforces authentication (who you are).
// Authorization (what you can access) is enforced separately in each
// API route and server component via src/lib/entitlement.ts.
// Do NOT add entitlement/payment checks here.

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/favorites(.*)',
  '/study-groups(.*)',
  '/studio(.*)',
  '/analytics(.*)',
  '/create-iit-question(.*)',
  '/create-post(.*)',
  '/create-quiz(.*)',
  '/edit-iit-question(.*)',
  '/edit-quiz(.*)',
  '/admin(.*)',
  '/api/orders/(.*)',
  '/api/entitlements/(.*)',
  '/api/admin/(.*)',
  '/api/videos/(.*)',
  '/api/studio/(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }

  // Forward the pathname as a request header so the root layout can read it
  // in a Server Component (headers() only exposes request headers, not URL).
  // Used to strip chrome (Header/Footer) from popup routes like /scope-picker.
  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        'x-pathname': request.nextUrl.pathname,
      }),
    },
  });

  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
};
