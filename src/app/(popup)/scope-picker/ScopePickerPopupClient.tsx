'use client';

// src/app/scope-picker/ScopePickerPopupClient.tsx
//
// Client component rendered inside the popup window.
// Reads scopeType / planName / planId from the URL search params,
// shows the ScopePicker always-open (isOpen=true), and communicates
// the user's selection back to the opener via postMessage.

import { useSearchParams } from 'next/navigation';
import ScopePicker, { type ScopeSelection } from '@/components/ScopePicker';
import type { PlanScopeType } from '@/types/lms';

const VALID_SCOPE_TYPES: PlanScopeType[] = ['CHAPTER', 'SUBJECT', 'CONFIGURABLE', 'COMPLETE', 'CHAPTER_COMBO'];

function isValidScopeType(v: string | null): v is PlanScopeType {
  return VALID_SCOPE_TYPES.includes(v as PlanScopeType);
}

export default function ScopePickerPopupClient() {
  const params      = useSearchParams();
  const scopeType   = params.get('scopeType');
  const planName    = params.get('planName')    ?? 'Plan';
  const planId      = params.get('planId')      ?? '';
  const maxChapters = Number(params.get('maxChapters') ?? '5');

  // Guard: if params are missing/invalid, close immediately
  if (!isValidScopeType(scopeType)) {
    if (typeof window !== 'undefined') window.close();
    return null;
  }

  function handleConfirm(selection: ScopeSelection) {
    if (window.opener) {
      window.opener.postMessage(
        { type: 'SCOPE_CONFIRMED', selection, planId },
        window.location.origin,
      );
    }
    window.close();
  }

  function handleClose() {
    if (window.opener) {
      window.opener.postMessage(
        { type: 'SCOPE_CANCELLED' },
        window.location.origin,
      );
    }
    window.close();
  }

  return (
    // Full-screen container — the ScopePicker modal fills the popup window
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <ScopePicker
        isOpen={true}
        onClose={handleClose}
        scopeType={scopeType}
        planName={planName}
        maxChapters={maxChapters}
        onConfirm={handleConfirm}
        inline
      />
    </div>
  );
}
