// src/app/(popup)/layout.tsx
//
// Bare layout for the scope-picker popup window.
// No header, footer, or nav — just the page content on a clean background.

import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Choose your scope — Phyziks',
};

export default function ScopePickerLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}
