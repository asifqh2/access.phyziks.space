'use client';

// src/components/PaymentButton.tsx
//
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

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { formatPrice } from '@/lib/region';
import GatewaySelector, { type PaymentGateway } from '@/components/GatewaySelector';
import type { PlanData } from '@/types/lms';
import type { ScopeSelection } from '@/components/ScopePicker';

// ── Razorpay SDK types ────────────────────────────────────────────────────────

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
  subjectId?:   string;
  subjectName?: string;
  label?:       string;
  className?:   string;
}

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

export default function PaymentButton({
  plan,
  chapterId,
  subjectId,
  label,
  className,
}: PaymentButtonProps) {
  const { user, isSignedIn, isLoaded } = useUser();
  const router = useRouter();

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

  useEffect(() => {
    return () => { popupRef.current?.close(); };
  }, []);

  // ── Scope picker popup ────────────────────────────────────────────────────

  function openScopePicker(scope?: typeof pendingScopeRef.current) {
    setLoading(true);

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
      url, 'scope_picker',
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
        const resolvedScope = {
          classId:    msg.selection.classId,
          chapterId:  msg.selection.chapterId,
          subjectId:  msg.selection.subjectId ?? msg.selection.subjectIds?.[0],
          subjectIds: msg.selection.subjectIds,
          chapterIds: msg.selection.chapterIds,
        };
        // Show gateway selector after scope is picked
        pendingScopeRef.current = resolvedScope;
        setLoading(false);
        setShowGateway(true);
      } else if (msg.type === 'SCOPE_CANCELLED') {
        window.removeEventListener('message', handleMessage);
        clearInterval(pollId);
        popupRef.current = null;
        setLoading(false);
      }
    }

    window.addEventListener('message', handleMessage);
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
    setShowGateway(false);
    setLoading(true);

    try {
      const res = await fetch('/api/orders/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId:  plan.id,
          gateway: selectedGateway,
          ...(scope?.classId    ? { classId:    scope.classId    } : {}),
          ...(scope?.chapterId  ? { chapterId:  scope.chapterId  } : chapterId  ? { chapterId  } : {}),
          ...(scope?.subjectId  ? { subjectId:  scope.subjectId  } : subjectId  ? { subjectId  } : {}),
          ...(scope?.subjectIds ? { subjectIds: scope.subjectIds } : {}),
          ...(scope?.chapterIds ? { chapterIds: scope.chapterIds } : {}),
        }),
      });

      const data = await res.json() as {
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
      void startPayment();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
