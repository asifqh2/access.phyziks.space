// src/components/PricingComparison.tsx
// Full compare-plans section shown on the main page.
// Covers all 6 plans: Free · Chapter · Chapter Combo · Subject · Two Subjects · Complete Class Package

import { Fragment } from 'react';
import { Check, X, Zap, BookOpen, Crown, GraduationCap, Rocket, Star } from 'lucide-react';

// ─── Plan column definitions ────────────────────────────────────────────────

const PLANS = [
  { key: 'free',          label: 'Free',                   icon: Zap,           color: 'text-slate-300',  bg: '' },
  { key: 'chapter',       label: 'Chapter',                icon: BookOpen,      color: 'text-indigo-400', bg: 'bg-indigo-50/30' },
  { key: 'combo',         label: 'Chapter Combo',          icon: Crown,         color: 'text-violet-400', bg: 'bg-violet-50/30', note: '5 chapters · 20% off' },
  { key: 'subject',       label: 'Subject',                icon: GraduationCap, color: 'text-amber-400',  bg: 'bg-amber-50/30', popular: true },
  { key: 'two-subjects',  label: 'Two Subjects',           icon: Star,          color: 'text-blue-400',   bg: 'bg-blue-50/30' },
  { key: 'complete',      label: 'Complete Class Package', icon: Rocket,        color: 'text-rose-400',   bg: 'bg-rose-50/30' },
] as const;

type PlanKey = typeof PLANS[number]['key'];
type CellVal = boolean | string;
type FeatureRow = { name: string } & Record<PlanKey, CellVal>;

// ─── Feature data ────────────────────────────────────────────────────────────

const sections: { category: string; features: FeatureRow[] }[] = [
  {
    category: 'Content Access',
    features: [
      {
        name: 'Video lectures',
        free: '1 video',
        chapter: '1 chapter',
        combo: 'Any 5 chapters',
        subject: '1 full subject',
        'two-subjects': 'Any 2 subjects',
        complete: 'All subjects & chapters',
      },
      {
        name: 'Access duration',
        free: 'Always free',
        chapter: '12 months',
        combo: '12 months',
        subject: '12 months',
        'two-subjects': '12 months',
        complete: '12 months',
      },
      {
        name: 'Chapter notes',
        free: false, chapter: true, combo: true, subject: true, 'two-subjects': true, complete: true,
      },
      {
        name: 'Downloadable worksheets & study material',
        free: false, chapter: true, combo: true, subject: true, 'two-subjects': true, complete: true,
      },
      {
        name: 'Syllabus access',
        free: true, chapter: true, combo: true, subject: true, 'two-subjects': true, complete: true,
      },
      {
        name: 'Last year board papers',
        free: true, chapter: false, combo: false, subject: false, 'two-subjects': false, complete: true,
      },
    ],
  },
  {
    category: 'Practice & Assessment',
    features: [
      {
        name: 'Practice questions with solutions',
        free: false, chapter: false, combo: false, subject: true, 'two-subjects': true, complete: true,
      },
      {
        name: 'Exam-oriented practice',
        free: false, chapter: false, combo: false, subject: true, 'two-subjects': true, complete: true,
      },
      {
        name: 'Previous year board exam questions',
        free: false, chapter: false, combo: false, subject: false, 'two-subjects': false, complete: true,
      },
      {
        name: 'Weekly tests with detailed feedback',
        free: false, chapter: false, combo: false, subject: false, 'two-subjects': false, complete: true,
      },
      {
        name: 'Mock tests',
        free: false, chapter: false, combo: false, subject: true, 'two-subjects': true, complete: true,
      },
      {
        name: 'Progress reports',
        free: false, chapter: false, combo: false, subject: false, 'two-subjects': false, complete: true,
      },
      {
        name: 'Analytics dashboard',
        free: false, chapter: true, combo: true, subject: true, 'two-subjects': true, complete: true,
      },
    ],
  },
  {
    category: 'Live Support & Mentorship',
    features: [
      {
        name: 'Weekly live doubt-solving sessions',
        free: false, chapter: false, combo: false, subject: false, 'two-subjects': false, complete: true,
      },
      {
        name: 'Dedicated 1-on-1 live support',
        free: false, chapter: false, combo: false, subject: false, 'two-subjects': false, complete: true,
      },
      {
        name: 'Live problem-solving sessions',
        free: false, chapter: false, combo: false, subject: true, 'two-subjects': true, complete: true,
      },
      {
        name: '1-on-1 doubt sessions',
        free: false, chapter: false, combo: false, subject: '4 / month', 'two-subjects': '6 / month', complete: 'Unlimited',
      },
    ],
  },
  {
    category: 'Extras & Recognition',
    features: [
      {
        name: 'Completion certificate',
        free: false, chapter: false, combo: false, subject: false, 'two-subjects': false, complete: true,
      },
      {
        name: 'Personalised study plan',
        free: false, chapter: false, combo: false, subject: true, 'two-subjects': true, complete: true,
      },
      {
        name: 'Early access to new content',
        free: false, chapter: false, combo: false, subject: false, 'two-subjects': false, complete: true,
      },
      {
        name: 'Community forum',
        free: true, chapter: true, combo: true, subject: true, 'two-subjects': true, complete: true,
      },
      {
        name: 'Email support',
        free: 'Standard', chapter: 'Priority', combo: 'Priority', subject: 'Priority', 'two-subjects': 'Priority', complete: 'Priority',
      },
    ],
  },
];

// ─── Cell renderer ───────────────────────────────────────────────────────────

function Cell({ value }: { value: CellVal }) {
  if (value === true)  return <Check className="w-5 h-5 text-emerald-500 mx-auto" strokeWidth={2.5} />;
  if (value === false) return <X className="w-4 h-4 text-slate-300 mx-auto" strokeWidth={2} />;
  return <span className="text-xs font-medium text-slate-700 leading-tight">{value}</span>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PricingComparison() {
  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">Compare plans</p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
            Find the plan that fits your learning.
          </h2>
          <p className="mt-3 text-slate-500 max-w-xl mx-auto">
            Every paid plan gives 12 months of access from purchase date — no subscriptions needed.
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-slate-900">
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium w-[28%]">Feature</th>
                {PLANS.map((plan) => (
                  <th key={plan.key} className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <plan.icon className={`w-4 h-4 ${plan.color}`} />
                      <span className={`text-sm font-bold ${plan.color} whitespace-nowrap`}>
                        {plan.label}
                        {'popular' in plan && plan.popular && (
                          <span className="ml-1 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-semibold">
                            Popular
                          </span>
                        )}
                      </span>
                      {'note' in plan && plan.note && (
                        <span className="text-[10px] text-slate-400 font-normal">{plan.note}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <Fragment key={section.category}>
                  {/* Category heading row */}
                  <tr className="bg-indigo-50/60 border-t border-slate-100">
                    <td colSpan={PLANS.length + 1} className="px-6 py-3 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                      {section.category}
                    </td>
                  </tr>
                  {/* Feature rows */}
                  {section.features.map((feat, i) => (
                    <tr
                      key={`${section.category}-${i}`}
                      className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-3.5 text-sm text-slate-700">{feat.name}</td>
                      {PLANS.map((plan) => (
                        <td
                          key={plan.key}
                          className={`px-3 py-3.5 text-center ${plan.bg ?? ''}`}
                        >
                          <Cell value={feat[plan.key]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          All prices in AED · 12-month access from purchase date · No hidden fees
        </p>
      </div>
    </section>
  );
}
