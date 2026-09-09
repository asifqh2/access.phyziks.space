// src/components/AccessGate.tsx
//
// Server component that wraps paid content.
// Performs a server-side entitlement check and either renders the
// children (if allowed) or a purchase/lock UI (if denied).
//
// All prices shown are in AED. Payment is via Stripe.
//
// Usage:
//   <AccessGate resourceType="CHAPTER" resourceId={chapter.id} chapterName={chapter.name}>
//     <VideoPlayer ... />
//   </AccessGate>
//
// The access check happens on the server — locked UI is sent to the browser
// instead of the content. Unauthorized users never receive the content in the DOM.

import { auth } from '@clerk/nextjs/server';
import { checkEntitlement } from '@/lib/entitlement';
import { prisma } from '@/lib/prisma';
import { formatPrice, PAYMENT_NOTE } from '@/lib/region';
import { Lock, Clock, CheckCircle } from 'lucide-react';
import PaymentButton from '@/components/PaymentButton';
import type { EntitlementCheckResult } from '@/types/lms';

interface AccessGateProps {
  resourceType: 'CHAPTER' | 'SUBJECT';
  resourceId: string;
  resourceName?: string;
  children: React.ReactNode;
}

export default async function AccessGate({
  resourceType,
  resourceId,
  resourceName,
  children,
}: AccessGateProps) {
  const { userId } = await auth();
  const result = await checkEntitlement(userId ?? null, resourceType, resourceId);

  if (result.allowed) {
    return (
      <div className="w-full min-w-0">
        <AccessBadge result={result} />
        {children}
      </div>
    );
  }

  return (
    <LockedContent
      resourceType={resourceType}
      resourceId={resourceId}
      resourceName={resourceName}
      reason={result.reason}
      isAuthenticated={!!userId}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AccessBadge — shown when user has access
// ─────────────────────────────────────────────────────────────────────────────

function AccessBadge({ result }: { result: Extract<EntitlementCheckResult, { allowed: true }> }) {
  // All paid plans have a 12-month expiry — isPermanent is only true for free/admin content.
  if (result.isPermanent) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 border border-emerald-200 w-full">
        <CheckCircle className="h-4 w-4 flex-shrink-0" />
        <span>Free access</span>
      </div>
    );
  }

  if (result.expiresAt) {
    const now    = new Date();
    const diffMs = result.expiresAt.getTime() - now.getTime();

    if (diffMs <= 0) return null;

    const diffDays   = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);

    const exactDate = result.expiresAt.toLocaleDateString('en-AE', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

    const isUrgent       = diffDays <= 7;
    const isExpiringSoon = diffDays <= 30;

    let label: string;
    if (isUrgent) {
      label = `Access expires in ${diffDays} day${diffDays !== 1 ? 's' : ''} — renew to keep access`;
    } else if (isExpiringSoon) {
      label = `Expires in ${diffDays} days — ${exactDate}`;
    } else if (diffDays <= 60) {
      const diffWeeks = Math.floor(diffDays / 7);
      label = `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} left — ${exactDate}`;
    } else {
      const remainderDays = diffDays - diffMonths * 30;
      const monthPart  = `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
      const dayPart    = remainderDays > 0 ? ` ${remainderDays} day${remainderDays !== 1 ? 's' : ''}` : '';
      label = `${monthPart}${dayPart} left — ${exactDate}`;
    }

    return (
      <div
        className={`mb-4 flex items-start gap-2 rounded-lg px-3 py-1.5 text-sm font-medium border w-full ${
          isUrgent
            ? 'bg-red-50 text-red-700 border-red-200'
            : isExpiringSoon
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
        }`}
      >
        <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span className="break-words min-w-0">{label}</span>
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LockedContent — shown when access is denied
// ─────────────────────────────────────────────────────────────────────────────

async function LockedContent({
  resourceType,
  resourceId,
  resourceName,
  reason,
  isAuthenticated,
}: {
  resourceType: 'CHAPTER' | 'SUBJECT';
  resourceId: string;
  resourceName?: string;
  reason: string;
  isAuthenticated: boolean;
}) {
  // Always fetch AED plans
  const plans = await prisma.plan.findMany({
    where: {
      isActive: true,
      currency: 'AED',
      scopeType: resourceType === 'CHAPTER'
        ? { in: ['CHAPTER', 'SUBJECT', 'COMPLETE', 'TEST_PANEL'] }
        : { in: ['SUBJECT', 'COMPLETE'] },
    },
    orderBy: { pricePaise: 'asc' },
    select: {
      id:           true,
      name:         true,
      slug:         true,
      scopeType:    true,
      pricePaise:   true,
      currency:     true,
      durationDays: true,
      isPermanent:  true,
      description:  true,
    },
  });

  const isExpired = reason === 'ENTITLEMENT_EXPIRED';
  const isRevoked = reason === 'ENTITLEMENT_REVOKED';

  const title = resourceName
    ? `"${resourceName}" requires a purchase`
    : `This ${resourceType.toLowerCase()} requires a purchase`;

  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 sm:p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-slate-100">
        <Lock className="h-6 w-6 sm:h-7 sm:w-7 text-slate-400" />
      </div>

      {isExpired ? (
        <>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">Your access has expired</h3>
          <p className="mt-2 text-sm text-slate-500">
            Your temporary access to {resourceName ?? `this ${resourceType.toLowerCase()}`} has ended.
            Purchase a plan to regain access.
          </p>
        </>
      ) : isRevoked ? (
        <>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">Access revoked</h3>
          <p className="mt-2 text-sm text-slate-500">
            Your access to this content has been revoked. Please contact support.
          </p>
        </>
      ) : (
        <>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 break-words">{title}</h3>
          <p className="mt-2 text-sm text-slate-500">
            {!isAuthenticated
              ? 'Sign in to purchase access to this content.'
              : 'Choose a plan below to unlock this content.'}
          </p>
        </>
      )}

      {!isAuthenticated && (
        <a
          href="/sign-in"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          Sign in to continue
        </a>
      )}

      {isAuthenticated && !isRevoked && (
        <div className="mt-6 sm:mt-8 space-y-3 text-left">
          {resourceType === 'CHAPTER' && (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Chapter options
              </p>
              {plans
                .filter((p) => p.scopeType === 'CHAPTER')
                .map((plan) => (
                  <PurchaseOption key={plan.id} plan={plan} resourceType={resourceType} resourceId={resourceId} resourceName={resourceName} />
                ))}
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                Subject options (includes this chapter)
              </p>
              {plans
                .filter((p) => p.scopeType === 'SUBJECT')
                .map((plan) => (
                  <PurchaseOption key={plan.id} plan={plan} resourceType={resourceType} resourceId={resourceId} resourceName={resourceName} />
                ))}
            </>
          )}

          {resourceType === 'SUBJECT' && (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Subject options
              </p>
              {plans
                .filter((p) => p.scopeType === 'SUBJECT')
                .map((plan) => (
                  <PurchaseOption key={plan.id} plan={plan} resourceType={resourceType} resourceId={resourceId} resourceName={resourceName} />
                ))}
            </>
          )}

          {plans.filter((p) => p.scopeType === 'COMPLETE').length > 0 && (
            <>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                Complete class package
              </p>
              {plans
                .filter((p) => p.scopeType === 'COMPLETE')
                .map((plan) => (
                  <PurchaseOption key={plan.id} plan={plan} resourceType={resourceType} resourceId={resourceId} resourceName={resourceName} />
                ))}
            </>
          )}

          {/* Test Panel — available even without content entitlement */}
          {plans.filter((p) => p.scopeType === 'TEST_PANEL').length > 0 && (
            <>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                Test panel only (no video access)
              </p>
              {plans
                .filter((p) => p.scopeType === 'TEST_PANEL')
                .map((plan) => (
                  <PurchaseOption key={plan.id} plan={plan} resourceType={resourceType} resourceId={resourceId} resourceName={resourceName} />
                ))}
            </>
          )}

          <p className="pt-2 text-xs text-slate-400 text-center">{PAYMENT_NOTE}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PurchaseOption — single plan row in the lock UI
// ─────────────────────────────────────────────────────────────────────────────

function PurchaseOption({
  plan,
  resourceType,
  resourceId,
  resourceName,
}: {
  plan: {
    id: string;
    name: string;
    slug: string;
    pricePaise: number;
    currency: string;
    durationDays: number | null;
    isPermanent: boolean;
    description: string | null;
    scopeType: string;
  };
  resourceType: 'CHAPTER' | 'SUBJECT';
  resourceId: string;
  resourceName?: string;
}) {
  const priceFormatted = formatPrice(plan.pricePaise);
  const accessLabel = plan.durationDays
    ? plan.durationDays === 365
      ? '12-month access'
      : `${plan.durationDays}-day access`
    : '12-month access';

  const planData = {
    id:           plan.id,
    name:         plan.name,
    slug:         plan.slug,
    pricePaise:   plan.pricePaise,
    currency:     plan.currency,
    durationDays: plan.durationDays,
    isPermanent:  plan.isPermanent,
    description:  plan.description,
    metadata:     null,
    scopeType:    plan.scopeType as 'CHAPTER' | 'SUBJECT' | 'COMPLETE' | 'CONFIGURABLE' | 'CHAPTER_COMBO' | 'TEST_PANEL',
  };

  const chapterId = resourceType === 'CHAPTER' && plan.scopeType === 'CHAPTER'
    ? resourceId : undefined;
  const subjectId = resourceType === 'SUBJECT' && plan.scopeType === 'SUBJECT'
    ? resourceId : undefined;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-indigo-100 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900">{plan.name}</p>
        <p className="text-sm text-slate-500">{accessLabel}</p>
        {plan.description && (
          <p className="text-xs text-slate-400 mt-0.5">{plan.description}</p>
        )}
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
        <span className="text-lg font-bold text-slate-900 whitespace-nowrap">
          {priceFormatted}
        </span>
        <PaymentButton
          plan={planData}
          chapterId={chapterId}
          chapterName={resourceType === 'CHAPTER' ? resourceName : undefined}
          subjectId={subjectId}
          subjectName={resourceType === 'SUBJECT' ? resourceName : undefined}
          label="Buy"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors whitespace-nowrap"
        />
      </div>
    </div>
  );
}
