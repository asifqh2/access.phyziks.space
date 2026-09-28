// src/app/scope-picker/page.tsx
//
// Standalone page rendered inside a popup window.
// Opened by PaymentButton via window.open('/scope-picker?...').
//
// Query params:
//   scopeType  — 'CHAPTER' | 'SUBJECT' | 'CONFIGURABLE'
//   planName   — display name of the plan
//   planId     — passed through so the parent can start checkout
//
// On confirm  → posts { type: 'SCOPE_CONFIRMED', selection, planId } to opener, then closes.
// On cancel   → posts { type: 'SCOPE_CANCELLED' } to opener, then closes.

import { Suspense } from 'react';
import ScopePickerPopupClient from './ScopePickerPopupClient';

export default function ScopePickerPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    }>
      <ScopePickerPopupClient />
    </Suspense>
  );
}
