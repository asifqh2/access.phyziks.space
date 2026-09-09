'use client';

// src/components/PricingCardsClient.tsx
//
// Renders pricing cards. All prices are in AED. Payment via Stripe.
// Receives plan data from the server — never fetches prices itself.

import { useState } from 'react';
import Link from 'next/link';
import {
  Check, X, Zap, Rocket, Crown, BookOpen,
  GraduationCap, Star, ArrowRight,
} from 'lucide-react';
import PaymentButton from '@/components/PaymentButton';
import { formatPrice, PAYMENT_NOTE } from '@/lib/region';
import type { PlanData } from '@/types/lms';

// ─────────────────────────────────────────────────────────────────────────────
// Visual metadata keyed by base plan slug (strips -aed suffix)
// ─────────────────────────────────────────────────────────────────────────────

const PLAN_VISUAL: Record<string, {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  ctaStyle: string;
  popular?: boolean;
  priceNote?: string;
  badge?: string;
}> = {
  'free': {
    icon: Zap,
    iconColor: 'text-slate-600',
    iconBg: 'bg-slate-100',
    ctaStyle: 'border-2 border-slate-300 text-slate-700 hover:border-indigo-400 hover:text-indigo-700',
  },
  'chapter': {
    icon: BookOpen,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-100',
    ctaStyle: 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-700 hover:to-indigo-800',
    priceNote: 'Any one chapter · 12-month access',
  },
  'chapter-combo': {
    icon: BookOpen,
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-100',
    ctaStyle: 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30 hover:from-violet-700 hover:to-purple-700',
    priceNote: 'Any 5 chapters from one subject · 12-month access',
    badge: '20% off',
  },
  'subject': {
    icon: GraduationCap,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
    ctaStyle: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 hover:from-amber-600 hover:to-orange-600',
    popular: true,
    priceNote: 'Any one subject · 12-month access',
  },
  'combo-two-subjects': {
    icon: Crown,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    ctaStyle: 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700',
    priceNote: 'Any two subjects · 12-month access',
  },
  'complete-lms': {
    icon: Rocket,
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-100',
    ctaStyle: 'bg-rose-600 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-700',
    priceNote: 'One full class (Class 11 or 12) · All chapters',
  },
  'test-panel': {
    icon: Star,
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-100',
    ctaStyle: 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30 hover:from-violet-700 hover:to-purple-700',
    priceNote: 'All chapter & topic exams · Platform-wide',
    badge: 'New',
  },
};

const DEFAULT_VISUAL = {
  icon: Star,
  iconColor: 'text-violet-600',
  iconBg: 'bg-violet-100',
  ctaStyle: 'bg-violet-600 text-white shadow-lg shadow-violet-500/20 hover:bg-violet-700',
};

/** Strip the -aed suffix to look up visuals */
function baseSlug(slug: string): string {
  return slug.replace(/-aed$/, '');
}
// ─────────────────────────────────────────────────────────────────────────────

interface PricingCardsClientProps {
  plans: Pick<
    PlanData,
    'id' | 'name' | 'slug' | 'scopeType' | 'pricePaise' | 'currency' |
    'durationDays' | 'isPermanent' | 'description' | 'metadata'
  >[];
  showClassTabs?: boolean;
}

export default function PricingCardsClient({ plans, showClassTabs = false }: PricingCardsClientProps) {
  // NOTE: selectedClass is preserved for when server-side plan filtering by class is implemented.
  // The tab UI is intentionally hidden until filtering logic is wired up to avoid
  // giving users the impression that switching tabs changes the visible plans.
  const [selectedClass, setSelectedClass] = useState<'11' | '12'>('11');
  void selectedClass; // suppress unused-variable lint warning until filtering is implemented

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-indigo-100/60 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-amber-100/60 rounded-full blur-[80px]" />
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 lms-badge lms-badge-primary mb-4 px-4 py-2">
            <Star className="w-3.5 h-3.5 fill-current" />
            Simple, Transparent Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
            Choose Your{' '}
            <span className="lms-shimmer-text">Learning Plan</span>
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto text-lg">
            Start for free, upgrade when you&apos;re ready. No hidden fees.
          </p>

          {/* Class tabs are hidden until plan filtering by class is wired up on the server.
              Showing a tab that changes nothing would mislead users. */}
          {showClassTabs && false && (
            <div
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 mt-8 shadow-sm"
              role="tablist"
              aria-label="Select CBSE class"
            >
              {(['11', '12'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  role="tab"
                  aria-selected={selectedClass === level}
                  onClick={() => setSelectedClass(level)}
                  className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
                    selectedClass === level
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  CBSE Class {level}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const visual = PLAN_VISUAL[baseSlug(plan.slug)] ?? DEFAULT_VISUAL;
            const priceFormatted = formatPrice(plan.pricePaise);
            // 12-month access for all paid plans
            const accessLabel = plan.durationDays === 365 || plan.durationDays === null
              ? '12-month access'
              : `${plan.durationDays}-day access`;
            const isFree = plan.pricePaise === 0;

            return (
              <div
                key={plan.id}
                className={`pricing-card bg-white border flex flex-col ${
                  visual.popular ? 'pricing-card-popular' : 'border-slate-200'
                }`}
              >
                {visual.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
                      ⭐ Most Popular
                    </div>
                  </div>
                )}

                <div className="p-6 sm:p-8 flex flex-col flex-1">
                  {/* Plan header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 ${visual.iconBg} rounded-xl flex items-center justify-center`}>
                      <visual.icon className={`w-5 h-5 ${visual.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-lg leading-tight">{plan.name}</h3>
                      {visual.badge && (
                        <span className="inline-block mt-0.5 text-xs font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                          {visual.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  {plan.description && (
                    <p className="text-sm text-slate-500 mb-6">{plan.description}</p>
                  )}

                  {/* Price */}
                  <div className="mb-6">
                    {isFree ? (
                      <span className="text-5xl font-extrabold text-slate-900">Free</span>
                    ) : (
                      <>
                        {plan.scopeType === 'CHAPTER_COMBO' && (
                          <span className="text-lg text-slate-400 line-through mr-2">AED 500</span>
                        )}
                        <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                          {priceFormatted}
                        </span>
                      </>
                    )}
                    {visual.priceNote && (
                      <p className="text-sm text-emerald-600 font-semibold mt-1">
                        {visual.priceNote}
                      </p>
                    )}
                    {isFree && (
                      <p className="text-sm text-emerald-600 font-semibold mt-1">Always free</p>
                    )}
                  </div>

                  {/* CTA */}
                  {isFree ? (
                    <Link
                      href="/dashboard"
                      className={`w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 mb-6 ${visual.ctaStyle}`}
                    >
                      Go to My Learning
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <div className="mb-6">
                      <PaymentButton
                        plan={plan}
                        label={`Get ${accessLabel}`}
                        className={`w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${visual.ctaStyle}`}
                      />
                    </div>
                  )}

                  <div className="lms-section-divider mb-4" />

                  {/* Access badge */}
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span className="text-slate-700">{accessLabel}</span>
                  </div>
                  {plan.scopeType === 'CHAPTER' && !isFree && (
                    <>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <span className="text-slate-700">Any one chapter of your choice</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <span className="text-slate-700">HD video lectures</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <span className="text-slate-700">Chapter notes &amp; worksheets</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <span className="text-slate-700">Downloadable study material</span>
                      </div>
                    </>
                  )}
                  {plan.scopeType === 'CHAPTER_COMBO' && (
                    <>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-violet-500 flex-shrink-0" />
                        <span className="text-slate-700">Any 5 chapters from one subject</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-violet-500 flex-shrink-0" />
                        <span className="text-slate-700">Save 20% vs buying individually</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-violet-500 flex-shrink-0" />
                        <span className="text-slate-700">Mix &amp; match chapters freely</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-violet-500 flex-shrink-0" />
                        <span className="text-slate-700">HD video lectures + notes</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-violet-500 flex-shrink-0" />
                        <span className="text-slate-700">Downloadable worksheets</span>
                      </div>
                    </>
                  )}
                  {plan.scopeType === 'SUBJECT' && (
                    <>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span className="text-slate-700">All chapters in your chosen subject</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span className="text-slate-700">Full HD video lectures</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span className="text-slate-700">Chapter notes &amp; worksheets</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span className="text-slate-700">Practice questions with solutions</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span className="text-slate-700">Exam-pattern based learning</span>
                      </div>
                    </>
                  )}
                  {plan.scopeType === 'CONFIGURABLE' && (
                    <>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-slate-700">Any two subjects of your choice</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-slate-700">All chapters in both subjects</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-slate-700">Full HD video lectures</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-slate-700">Worksheets &amp; practice questions</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-slate-700">Exam-focused problem solving</span>
                      </div>
                    </>
                  )}
                  {plan.scopeType === 'COMPLETE' && (
                    <>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        <span className="text-slate-700">All subjects &amp; chapters in one class</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        <span className="text-slate-700">Class 11, Class 12, or any future class</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        <span className="text-slate-700">Exam-oriented &amp; result-driven practice</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        <span className="text-slate-700">Previous year board exam questions</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        <span className="text-slate-700">Dedicated 1-on-1 live support</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        <span className="text-slate-700">Weekly live doubt-solving sessions</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        <span className="text-slate-700">Weekly tests with detailed feedback</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        <span className="text-slate-700">Progress reports</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Check className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        <span className="text-slate-700">Completion certificate</span>
                      </div>
                    </>
                  )}
                  {isFree && (
                    <div className="flex items-center gap-2 text-sm mt-2">
                      <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      <span className="text-slate-400">1 free content item only</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-slate-500 text-sm mt-10">
          {PAYMENT_NOTE}
        </p>

        <div className="text-center mt-6">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm hover:text-indigo-800 transition-colors"
          >
            See full plan comparison &amp; FAQs
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
