'use client';

// src/components/PaymentButton.tsx
//
<<<<<<< HEAD
// Payment button supporting Razorpay and Cashfree.
//
// Scope-picker flow (CHAPTER / SUBJECT / CONFIGURABLE plans without pre-supplied IDs):
//   1. Click → show gateway selector (Razorpay / Cashfree)
//   2. User picks gateway → open /scope-picker?... popup
//   3. Popup posts { type: 'SCOPE_CONFIRMED', selection } back via postMessage
//   4. Parent receives message → starts payment with the chosen scope + gateway
//
// Payment flow (all plans after scope is resolved):
//   Razorpay:
//     1. POST /api/orders/create { gateway:'razorpay', ... }
//     2. Load Razorpay JS SDK → open inline checkout modal
//     3. On success → POST /api/payments/verify → router.push to dashboard
//   Cashfree:
//     1. POST /api/orders/create { gateway:'cashfree', ... }
//     2. Load Cashfree JS SDK → open checkout
//     3. On success/return → POST /api/payments/cashfree-verify → router.push to dashboard
=======
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
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { formatPrice } from '@/lib/region';
<<<<<<< HEAD
import GatewaySelector, { type PaymentGateway } from '@/components/GatewaySelector';
import type { PlanData } from '@/types/lms';
import type { ScopeSelection } from '@/components/ScopePicker';

// ── Razorpay SDK types ────────────────────────────────────────────────────────
=======
import type { PlanData } from '@/types/lms';
import type { ScopeSelection } from '@/components/ScopePicker';

// ── Razorpay SDK types (minimal) ─────────────────────────────────────────────
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749

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
<<<<<<< HEAD
=======

>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
interface RazorpaySuccessResponse {
  razorpay_order_id:   string;
  razorpay_payment_id: string;
  razorpay_signature:  string;
}
<<<<<<< HEAD
interface RazorpayInstance { open: () => void }

declare global {
  interface Window {
    Razorpay?: new (o: RazorpayOptions) => RazorpayInstance;
    // Cashfree JS SDK v3
    Cashfree?: (opts: { mode: string }) => CashfreeInstance;
  }
}

interface CashfreeInstance {
  checkout: (opts: { paymentSessionId: string; redirectTarget?: string }) => Promise<{ error?: { message: string }; redirect?: boolean; paymentDetails?: unknown }>;
}

// ── Component props ───────────────────────────────────────────────────────────

interface PaymentButtonProps {
  plan: Pick<PlanData, 'id' | 'name' | 'pricePaise' | 'currency' | 'durationDays' | 'isPermanent' | 'scopeType' | 'description' | 'metadata'>;
  chapterId?:   string;
  chapterName?: string;
=======

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
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
  subjectId?:   string;
  subjectName?: string;
  label?:       string;
  className?:   string;
}

<<<<<<< HEAD
// ── SDK loaders ───────────────────────────────────────────────────────────────

function loadRazorpaySDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const s = document.createElement('script');
    s.src     = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async   = true;
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay SDK.'));
    document.body.appendChild(s);
  });
}

function loadCashfreeSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) { resolve(); return; }
    const s = document.createElement('script');
    s.src     = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    s.async   = true;
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Cashfree SDK.'));
    document.body.appendChild(s);
  });
}

const POPUP_W = 560;
const POPUP_H = 680;

// ── Component ─────────────────────────────────────────────────────────────────
=======
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
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749

export default function PaymentButton({
  plan,
  chapterId,
  subjectId,
  label,
  className,
}: PaymentButtonProps) {
  const { user, isSignedIn, isLoaded } = useUser();
  const router = useRouter();

<<<<<<< HEAD
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState('');
  const [showGateway,      setShowGateway]      = useState(false);
  const [selectedGateway,  setSelectedGateway]  = useState<PaymentGateway>('razorpay');

  // Pending scope from the scope-picker popup, waiting for gateway confirm
  const pendingScopeRef = useRef<{
    classId?:    string;
    chapterId?:  string;
    subjectId?:  string;
    subjectIds?: string[];
    chapterIds?: string[];
  } | undefined>(undefined);

  const popupRef = useRef<Window | null>(null);

  const buttonLabel = label ?? `Pay ${formatPrice(plan.pricePaise)}`;
  const defaultClassName =
    'w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors';

  const needsPicker =
    (plan.scopeType === 'CHAPTER'      && !chapterId) ||
    (plan.scopeType === 'SUBJECT'      && !subjectId) ||
    (plan.scopeType === 'CONFIGURABLE' && !subjectId) ||
    plan.scopeType === 'CHAPTER_COMBO' ||
    plan.scopeType === 'COMPLETE';

=======
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
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
  useEffect(() => {
    return () => { popupRef.current?.close(); };
  }, []);

<<<<<<< HEAD
  // ── Scope picker popup ────────────────────────────────────────────────────

  function openScopePicker(scope?: typeof pendingScopeRef.current) {
    setLoading(true);

=======
  // ── Open the scope-picker popup and wait for postMessage ─────────────────
  function openScopePicker() {
    setError('');
    setLoading(true);

    // Centre the popup on screen
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
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
<<<<<<< HEAD
      url, 'scope_picker',
=======
      url,
      'scope_picker',
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
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
<<<<<<< HEAD
=======

>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
      const msg = event.data as { type: string; selection?: ScopeSelection };

      if (msg.type === 'SCOPE_CONFIRMED' && msg.selection) {
        window.removeEventListener('message', handleMessage);
        clearInterval(pollId);
        popupRef.current = null;
<<<<<<< HEAD
        const resolvedScope = {
=======
        void startPayment({
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
          classId:    msg.selection.classId,
          chapterId:  msg.selection.chapterId,
          subjectId:  msg.selection.subjectId ?? msg.selection.subjectIds?.[0],
          subjectIds: msg.selection.subjectIds,
          chapterIds: msg.selection.chapterIds,
<<<<<<< HEAD
        };
        // Show gateway selector after scope is picked
        pendingScopeRef.current = resolvedScope;
        setLoading(false);
        setShowGateway(true);
=======
        });
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
      } else if (msg.type === 'SCOPE_CANCELLED') {
        window.removeEventListener('message', handleMessage);
        clearInterval(pollId);
        popupRef.current = null;
        setLoading(false);
      }
    }

    window.addEventListener('message', handleMessage);
<<<<<<< HEAD
=======

    // Detect manual close (browsers have no close event for popups)
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
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
<<<<<<< HEAD

=======
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
  async function startPayment(scope?: {
    classId?:    string;
    chapterId?:  string;
    subjectId?:  string;
    subjectIds?: string[];
    chapterIds?: string[];
  }) {
    setError('');
<<<<<<< HEAD
    setShowGateway(false);
    setLoading(true);

    try {
=======
    setLoading(true);

    try {
      // 1. Create Razorpay order on server
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
      const res = await fetch('/api/orders/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
<<<<<<< HEAD
          planId:  plan.id,
          gateway: selectedGateway,
=======
          planId: plan.id,
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
          ...(scope?.classId    ? { classId:    scope.classId    } : {}),
          ...(scope?.chapterId  ? { chapterId:  scope.chapterId  } : chapterId  ? { chapterId  } : {}),
          ...(scope?.subjectId  ? { subjectId:  scope.subjectId  } : subjectId  ? { subjectId  } : {}),
          ...(scope?.subjectIds ? { subjectIds: scope.subjectIds } : {}),
          ...(scope?.chapterIds ? { chapterIds: scope.chapterIds } : {}),
        }),
      });

      const data = await res.json() as {
<<<<<<< HEAD
        gateway?:          string;
        // Razorpay
        razorpayOrderId?:  string;
        amount?:           number;
        currency?:         string;
        keyId?:            string;
        // Cashfree
        paymentSessionId?: string;
        orderId?:          string;
        appId?:            string;
        error?:            string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to create payment order.');
      }

      // ── Razorpay flow ──────────────────────────────────────────────────────
      if (data.gateway === 'razorpay') {
        if (!data.razorpayOrderId) throw new Error('Failed to create Razorpay order.');

        await loadRazorpaySDK();
        if (!window.Razorpay) throw new Error('Razorpay SDK failed to initialise. Please refresh.');

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
          handler: async (response: RazorpaySuccessResponse) => {
            try {
              const verifyRes  = await fetch('/api/payments/verify', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id:   response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature:  response.razorpay_signature,
                }),
              });
              const verifyData = await verifyRes.json() as { ok?: boolean; redirectTo?: string; error?: string };
              if (!verifyRes.ok || !verifyData.ok) throw new Error(verifyData.error ?? 'Verification failed.');
              router.push(verifyData.redirectTo ?? '/dashboard?payment=success');
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Verification failed. Contact support.');
              setLoading(false);
            }
          },
          modal: { ondismiss: () => { setLoading(false); } },
        });

        rzp.open();
        return; // loading stays true while modal is open
      }

      // ── Cashfree flow ──────────────────────────────────────────────────────
      if (data.gateway === 'cashfree') {
        if (!data.paymentSessionId || !data.orderId) throw new Error('Failed to create Cashfree order.');

        await loadCashfreeSDK();
        if (!window.Cashfree) throw new Error('Cashfree SDK failed to initialise. Please refresh.');

        const env      = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'PROD' ? 'production' : 'sandbox';
        const cashfree = window.Cashfree({ mode: env });

        const result = await cashfree.checkout({
          paymentSessionId: data.paymentSessionId,
          redirectTarget:   '_self',   // redirect in the same tab
        });

        // If checkout returns without redirect (inline mode), verify immediately
        if (result?.error) {
          throw new Error(result.error.message ?? 'Cashfree payment failed.');
        }

        // After redirect returns to /dashboard?payment=success&order_id=...
        // Verify server-side
        const verifyRes  = await fetch('/api/payments/cashfree-verify', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ orderId: data.orderId }),
        });
        const verifyData = await verifyRes.json() as { ok?: boolean; redirectTo?: string; error?: string };
        if (!verifyRes.ok || !verifyData.ok) throw new Error(verifyData.error ?? 'Cashfree verification failed.');
        router.push(verifyData.redirectTo ?? '/dashboard?payment=success');
        return;
      }

      throw new Error('Unknown gateway in server response.');
=======
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
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setLoading(false);
    }
  }

  // ── Button click ──────────────────────────────────────────────────────────
<<<<<<< HEAD

=======
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
  function handleClick() {
    setError('');
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`);
      return;
    }

    if (needsPicker) {
<<<<<<< HEAD
      // Open scope picker first; gateway selector shown after scope is confirmed
      openScopePicker();
    } else {
      // Show gateway selector inline before charging
      setShowGateway(true);
    }
  }

  function handleGatewayConfirm() {
    if (needsPicker && pendingScopeRef.current) {
      void startPayment(pendingScopeRef.current);
    } else {
=======
      openScopePicker();
    } else {
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
      void startPayment();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
<<<<<<< HEAD

  // Gateway selector overlay
  if (showGateway && !loading) {
    return (
      <div className="w-full space-y-3">
        <GatewaySelector
          selected={selectedGateway}
          onChange={setSelectedGateway}
          disabled={loading}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGatewayConfirm}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue to Pay'}
          </button>
          <button
            type="button"
            onClick={() => { setShowGateway(false); setError(''); }}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
        {error && (
          <div role="alert" className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}
      </div>
    );
  }

=======
>>>>>>> 6216b8c007f5bb90ad5e2b3a7f0273f86f173749
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
