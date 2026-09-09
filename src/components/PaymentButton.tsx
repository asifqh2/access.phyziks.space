'use client';

// src/components/PaymentButton.tsx
//
// Razorpay payment button.
//
// Scope-picker flow (CHAPTER / SUBJECT / CONFIGURABLE plans without pre-supplied IDs):
//   1. Click → open /scope-picker?... in a small popup window
//   2. User picks class → subject → chapter (or subject/subjects) inside the popup
//   3. Popup posts { type: 'SCOPE_CONFIRMED', selection } back via postMessage
//   4. Parent receives message → starts payment with the chosen scope
//
// Payment flow (all plans after scope is resolved):
//   1. POST /api/orders/create → { razorpayOrderId, amount, currency, keyId }
//   2. Load Razorpay JS SDK (once, cached on window) → open inline checkout modal
//   3. On payment success → POST /api/payments/verify → router.push to dashboard
//   4. On modal dismiss → reset loading state

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { formatPrice } from '@/lib/region';
import type { PlanData } from '@/types/lms';
import type { ScopeSelection } from '@/components/ScopePicker';

// ── Razorpay SDK types (minimal) ─────────────────────────────────────────────

interface RazorpayOptions {
  key:         string;
  amount:      number;
  currency:    string;
  order_id:    string;
  name:        string;
  description: string;
  prefill:     { name?: string; email?: string };
  theme:       { color: string };
  handler:     (response: RazorpaySuccessResponse) => void;
  modal:       { ondismiss: () => void };
}

interface RazorpaySuccessResponse {
  razorpay_order_id:   string;
  razorpay_payment_id: string;
  razorpay_signature:  string;
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

// ── Component props ──────────────────────────────────────────────────────────

interface PaymentButtonProps {
  plan: Pick<PlanData, 'id' | 'name' | 'pricePaise' | 'currency' | 'durationDays' | 'isPermanent' | 'scopeType' | 'description' | 'metadata'>;
  /** Pre-supply for CHAPTER plans (e.g. from AccessGate / chapter page) */
  chapterId?:   string;
  chapterName?: string;
  /** Pre-supply for SUBJECT plans (e.g. from AccessGate / subject page) */
  subjectId?:   string;
  subjectName?: string;
  label?:       string;
  className?:   string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Injects checkout.js once and resolves when ready. */
function loadRazorpaySDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const script = document.createElement('script');
    script.src     = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async   = true;
    script.onload  = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK.'));
    document.body.appendChild(script);
  });
}

// Popup window dimensions for the scope picker
const POPUP_W = 560;
const POPUP_H = 680;

// ── Component ────────────────────────────────────────────────────────────────

export default function PaymentButton({
  plan,
  chapterId,
  subjectId,
  label,
  className,
}: PaymentButtonProps) {
  const { user, isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Ref to the scope-picker popup window
  const popupRef = useRef<Window | null>(null);

  const buttonLabel = label ?? `Pay ${formatPrice(plan.pricePaise)}`;

  const defaultClassName =
    'w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors';

  // Plans that need the user to pick a scope before checkout
  const needsPicker =
    (plan.scopeType === 'CHAPTER'       && !chapterId) ||
    (plan.scopeType === 'SUBJECT'       && !subjectId) ||
    (plan.scopeType === 'CONFIGURABLE'  && !subjectId) ||
    (plan.scopeType === 'CHAPTER_COMBO') ||
    (plan.scopeType === 'COMPLETE');

  // Close popup if component unmounts mid-flow
  useEffect(() => {
    return () => { popupRef.current?.close(); };
  }, []);

  // ── Open the scope-picker popup and wait for postMessage ─────────────────
  function openScopePicker() {
    setError('');
    setLoading(true);

    // Centre the popup on screen
    const left = Math.round(window.screenX + (window.outerWidth  - POPUP_W) / 2);
    const top  = Math.round(window.screenY + (window.outerHeight - POPUP_H) / 2);

    const url = `/scope-picker?${new URLSearchParams({
      scopeType: plan.scopeType,
      planName:  plan.name,
      planId:    plan.id,
      ...(plan.scopeType === 'CHAPTER_COMBO' && plan.metadata
        ? { maxChapters: String((plan.metadata as Record<string, unknown>).chapterCount ?? 5) }
        : {}),
    }).toString()}`;

    const popup = window.open(
      url,
      'scope_picker',
      `width=${POPUP_W},height=${POPUP_H},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );

    if (!popup) {
      setError('Please allow popups for this site to continue.');
      setLoading(false);
      return;
    }

    popupRef.current = popup;

    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;

      const msg = event.data as { type: string; selection?: ScopeSelection };

      if (msg.type === 'SCOPE_CONFIRMED' && msg.selection) {
        window.removeEventListener('message', handleMessage);
        clearInterval(pollId);
        popupRef.current = null;
        void startPayment({
          classId:    msg.selection.classId,
          chapterId:  msg.selection.chapterId,
          subjectId:  msg.selection.subjectId ?? msg.selection.subjectIds?.[0],
          subjectIds: msg.selection.subjectIds,
          chapterIds: msg.selection.chapterIds,
        });
      } else if (msg.type === 'SCOPE_CANCELLED') {
        window.removeEventListener('message', handleMessage);
        clearInterval(pollId);
        popupRef.current = null;
        setLoading(false);
      }
    }

    window.addEventListener('message', handleMessage);

    // Detect manual close (browsers have no close event for popups)
    const pollId = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollId);
        window.removeEventListener('message', handleMessage);
        popupRef.current = null;
        setLoading(false);
      }
    }, 400);
  }

  // ── Core payment function ─────────────────────────────────────────────────
  async function startPayment(scope?: {
    classId?:    string;
    chapterId?:  string;
    subjectId?:  string;
    subjectIds?: string[];
    chapterIds?: string[];
  }) {
    setError('');
    setLoading(true);

    try {
      // 1. Create Razorpay order on server
      const res = await fetch('/api/orders/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          ...(scope?.classId    ? { classId:    scope.classId    } : {}),
          ...(scope?.chapterId  ? { chapterId:  scope.chapterId  } : chapterId  ? { chapterId  } : {}),
          ...(scope?.subjectId  ? { subjectId:  scope.subjectId  } : subjectId  ? { subjectId  } : {}),
          ...(scope?.subjectIds ? { subjectIds: scope.subjectIds } : {}),
          ...(scope?.chapterIds ? { chapterIds: scope.chapterIds } : {}),
        }),
      });

      const data = await res.json() as {
        razorpayOrderId?: string;
        amount?:          number;
        currency?:        string;
        keyId?:           string;
        error?:           string;
      };

      if (!res.ok || !data.razorpayOrderId) {
        throw new Error(data.error ?? 'Failed to create payment order.');
      }

      // 2. Load Razorpay SDK
      await loadRazorpaySDK();
      if (!window.Razorpay) {
        throw new Error('Razorpay SDK failed to initialise. Please refresh and try again.');
      }

      // 3. Open inline checkout modal
      const rzp = new window.Razorpay({
        key:         data.keyId ?? '',
        amount:      data.amount ?? plan.pricePaise,
        currency:    data.currency ?? 'INR',
        order_id:    data.razorpayOrderId,
        name:        'Phyziks',
        description: plan.name,
        prefill: {
          name:  user?.fullName ?? undefined,
          email: user?.primaryEmailAddress?.emailAddress ?? undefined,
        },
        theme: { color: '#4f46e5' },

        // 4. Payment succeeded — verify server-side then redirect
        handler: async (response: RazorpaySuccessResponse) => {
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json() as { ok?: boolean; redirectTo?: string; error?: string };
            if (!verifyRes.ok || !verifyData.ok) {
              throw new Error(verifyData.error ?? 'Payment verification failed.');
            }
            router.push(verifyData.redirectTo ?? '/dashboard?payment=success');
          } catch (verifyErr) {
            setError(verifyErr instanceof Error ? verifyErr.message : 'Verification failed. Contact support.');
            setLoading(false);
          }
        },

        // 5. User dismissed the modal without paying
        modal: {
          ondismiss: () => { setLoading(false); },
        },
      });

      rzp.open();
      // loading stays true while the modal is open; cleared by handler / ondismiss
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setLoading(false);
    }
  }

  // ── Button click ──────────────────────────────────────────────────────────
  function handleClick() {
    setError('');
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`);
      return;
    }

    if (needsPicker) {
      openScopePicker();
    } else {
      void startPayment();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={!isLoaded || loading}
        className={className ?? defaultClassName}
        aria-label={buttonLabel}
      >
        {(!isLoaded || loading) ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          buttonLabel
        )}
      </button>

      {error && (
        <div role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
    </>
  );
}
