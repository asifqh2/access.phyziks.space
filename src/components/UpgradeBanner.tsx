'use client';

// src/components/UpgradeBanner.tsx
//
// Per-subject upgrade banner shown on the dashboard.
// Displayed for each subject where the user has 1–7 active chapter purchases
// but no subject-level or complete access.
//
// Formula (computed server-side, shown here for display only):
//   upgrade_price = subject_price - (N × chapter_price) + AED 1
//
// On click → POST /api/orders/create-upgrade { subjectId }
//           → server re-validates and creates the Razorpay order
//           → Razorpay modal opens inline
//           → on success → /api/payments/verify → dashboard redirect

import { useState }    from 'react';
import { useRouter }   from 'next/navigation';
import { useUser }     from '@clerk/nextjs';
import { Sparkles, ArrowRight, Loader2, AlertCircle, X } from 'lucide-react';
import { formatPrice } from '@/lib/region';

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
  interface Window { Razorpay?: new (o: RazorpayOptions) => RazorpayInstance }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadRazorpaySDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const s    = document.createElement('script');
    s.src      = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async    = true;
    s.onload   = () => resolve();
    s.onerror  = () => reject(new Error('Failed to load Razorpay SDK.'));
    document.body.appendChild(s);
  });
}

// ── API response shape ────────────────────────────────────────────────────────

interface UpgradeOrderResponse {
  razorpayOrderId: string;
  amount:          number;
  currency:        string;
  keyId:           string;
  subjectPrice:    number;
  alreadyPaid:     number;
  chapterCount:    number;
  error?:          string;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface UpgradeBannerProps {
  subjectId:     string;
  subjectName:   string;
  className:     string;        // e.g. "Class 11"
  chapterCount:  number;        // 1–7 chapters already purchased in this subject
  upgradePrice:  number;        // pre-computed fils (for display; server re-validates)
  subjectPrice:  number;        // full subject price in fils (for strikethrough)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UpgradeBanner({
  subjectId,
  subjectName,
  className,
  chapterCount,
  upgradePrice,
  subjectPrice,
}: UpgradeBannerProps) {
  const { user }                    = useUser();
  const router                      = useRouter();
  const [loading,   setLoading]     = useState(false);
  const [error,     setError]       = useState('');
  const [dismissed, setDismissed]   = useState(false);

  if (dismissed) return null;

  const savings = subjectPrice - upgradePrice;

  async function handleUpgrade() {
    setError('');
    setLoading(true);

    try {
      // 1. Create upgrade order — server re-validates eligibility & price
      const res  = await fetch('/api/orders/create-upgrade', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subjectId }),
      });
      const data = await res.json() as UpgradeOrderResponse;

      if (!res.ok || !data.razorpayOrderId) {
        throw new Error(data.error ?? 'Failed to create upgrade order.');
      }

      // 2. Load SDK
      await loadRazorpaySDK();
      if (!window.Razorpay) throw new Error('Razorpay SDK failed to load. Please refresh.');

      // 3. Open modal
      const rzp = new window.Razorpay({
        key:         data.keyId,
        amount:      data.amount,
        currency:    data.currency,
        order_id:    data.razorpayOrderId,
        name:        'Phyziks',
        description: `Upgrade to ${subjectName} — ${className}`,
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
            if (!verifyRes.ok || !verifyData.ok) {
              throw new Error(verifyData.error ?? 'Payment verification failed.');
            }
            router.push(verifyData.redirectTo ?? '/dashboard?payment=success');
          } catch (verifyErr) {
            setError(verifyErr instanceof Error ? verifyErr.message : 'Verification failed. Contact support.');
            setLoading(false);
          }
        },

        modal: { ondismiss: () => setLoading(false) },
      });

      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 px-6 py-5 text-white shadow-lg">

      {/* Decorative glows */}
      <div className="pointer-events-none absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-violet-400/20 blur-xl" />

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 rounded-full p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        aria-label={`Dismiss upgrade offer for ${subjectName}`}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        {/* Copy */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <Sparkles className="h-5 w-5 text-yellow-300" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">
              Exclusive offer · {className}
            </p>
            <p className="mt-0.5 text-lg font-extrabold leading-snug">
              Unlock all of {subjectName}
            </p>
            <p className="mt-1 text-sm text-indigo-200 leading-relaxed">
              You&apos;ve purchased{' '}
              <span className="font-semibold text-white">
                {chapterCount} chapter{chapterCount !== 1 ? 's' : ''}
              </span>{' '}
              in {subjectName}. Upgrade to full subject access for just{' '}
              <span className="font-bold text-yellow-300 text-base">
                {formatPrice(upgradePrice)}
              </span>{' '}
              <span className="line-through text-indigo-300 text-sm font-normal">
                {formatPrice(subjectPrice)}
              </span>
              {savings > 0 && (
                <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                  Save {formatPrice(savings)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex-shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Upgrade now
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="relative mt-3 flex items-center gap-1.5 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
}
