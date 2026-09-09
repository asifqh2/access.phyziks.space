'use client';

// src/components/HeaderClient.tsx
//
// Client shell for the header. Receives isAdmin from the server wrapper
// (Header.tsx) so the Instructor Studio link can be conditionally shown
// without any client-side admin check that could be bypassed.
//
// Security note: hiding the link is purely UX. The /studio route itself
// must enforce its own server-side auth (Clerk middleware + requireAdmin).

import Image from 'next/image';
import Link from 'next/link';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  SignOutButton,
  UserButton,
} from '@clerk/nextjs';
import { Menu, X, Upload, LogIn } from 'lucide-react';
import { useState } from 'react';

const NAV_LINKS = [
  { label: 'Courses',     href: '/courses' },
  { label: 'My Learning', href: '/dashboard' },
];

interface HeaderClientProps {
  isAdmin: boolean;
}

export default function HeaderClient({ isAdmin }: HeaderClientProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between gap-5 px-4">

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center" aria-label="Phyziks home">
          <Image src="/logo.svg" alt="Phyziks.space" width={160} height={40} priority className="h-8 w-auto sm:h-10" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
            >
              {link.label}
            </Link>
          ))}

          {/* Instructor Studio — admin only */}
          {isAdmin && (
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              <Upload className="h-4 w-4" />
              Instructor Studio
            </Link>
          )}
        </nav>

        {/* Desktop auth controls */}
        <div className="flex items-center gap-2">
          <SignedIn>
            <Link
              href="/dashboard"
              className="hidden items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:inline-flex"
            >
              <LogIn className="h-4 w-4" />
              Continue learning
            </Link>
            <UserButton />
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
              <button className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700 sm:block">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
              <button className="hidden rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:block">
                Create account
              </button>
            </SignUpButton>
          </SignedOut>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setOpen(!open)}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {open && (
        <nav className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-3 font-medium text-slate-700 hover:bg-indigo-50"
            >
              {link.label}
            </Link>
          ))}

          {/* Instructor Studio — admin only */}
          {isAdmin && (
            <Link
              href="/studio"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-3 font-medium text-indigo-700 hover:bg-indigo-50"
            >
              <Upload className="h-4 w-4" />
              Instructor Studio
            </Link>
          )}

          <div className="mt-2 border-t border-slate-100 pt-3 space-y-1">
            <SignedIn>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-3 font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                <LogIn className="h-4 w-4" />
                My Learning
              </Link>
              <SignOutButton>
                <button
                  onClick={() => setOpen(false)}
                  className="block w-full rounded-lg px-3 py-3 text-left font-semibold text-slate-700 hover:bg-indigo-50"
                >
                  Sign out
                </button>
              </SignOutButton>
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
                <button
                  onClick={() => setOpen(false)}
                  className="block w-full rounded-lg px-3 py-3 text-left font-semibold text-slate-700 hover:bg-indigo-50"
                >
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                <button
                  onClick={() => setOpen(false)}
                  className="block w-full rounded-lg px-3 py-3 text-left font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  Create account
                </button>
              </SignUpButton>
            </SignedOut>
          </div>
        </nav>
      )}
    </header>
  );
}
