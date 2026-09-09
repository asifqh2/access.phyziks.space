// src/app/pricing/page.tsx
import { Fragment } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Check, X, Zap, Rocket, Crown, ArrowRight, Star, HelpCircle, Users, BookOpen, Award } from 'lucide-react';
import PricingSection from '@/components/PricingSection';

export const metadata: Metadata = {
  title: 'Pricing – Phyziks.Space LMS Portal',
  description: 'Choose the plan that fits your learning goals.',
  keywords: 'Phyziks pricing, Physics LMS pricing, online physics course fee, HSC Physics course price',
  openGraph: {
    title: 'Pricing – Phyziks.Space LMS',
    description: 'Start free. Upgrade to Pro or Premium for full access to IITian mentorship, analytics, mind maps, and more.',
    type: 'website',
    url: 'https://phyziks.space/pricing',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://phyziks.space/pricing' },
};

const comparisonFeatures = [
  {
    category: 'Study Content',
    features: [
      { name: 'Video lessons',                    free: '1 video',  chapter: 'Any one chapter', combo: 'Any 5 chapters', subject: 'Any one subject · all chapters' },
      { name: 'Last Year Papers (HSC & CBSE)',    free: true,       chapter: false,             combo: false,           subject: false },
      { name: 'Chapter-wise Notes',               free: 'Basic',    chapter: false,             combo: false,           subject: false },
      { name: 'Concept videos and lectures',      free: false,      chapter: 'Any one chapter', combo: 'Any 5 chapters',subject: 'Any one subject' },
      { name: 'Syllabus Access',                  free: true,       chapter: true,              combo: true,            subject: true },
      { name: 'Offline PDF Downloads',            free: false,      chapter: true,              combo: true,            subject: true },
    ],
  },
  {
    category: 'Practice & Assessment',
    features: [
      { name: 'Access duration',         free: 'Free', chapter: '12 months', combo: '12 months', subject: '12 months' },
      { name: 'Mock Tests',              free: false,  chapter: false,       combo: false,       subject: true },
      { name: 'Performance Reports',     free: false,  chapter: false,       combo: false,       subject: true },
      { name: 'Analytics Dashboard',     free: false,  chapter: true,        combo: true,        subject: true },
    ],
  },
  {
    category: 'Learning Tools',
    features: [
      { name: 'Mind Maps',                   free: false, chapter: 'All Chapters', combo: 'All Chapters', subject: 'All Chapters' },
      { name: 'Study Groups',                free: false, chapter: true,           combo: true,           subject: true },
      { name: 'Personalised Study Plan',     free: false, chapter: false,          combo: false,          subject: true },
    ],
  },
  {
    category: 'Mentorship',
    features: [
      { name: 'IITian Mentor Access',          free: false, chapter: false, combo: false, subject: true },
      { name: '1-on-1 Doubt Sessions',         free: false, chapter: false, combo: false, subject: '4/month' },
      { name: 'Live Problem-Solving Sessions', free: false, chapter: false, combo: false, subject: true },
      { name: 'WhatsApp Study Group',          free: false, chapter: false, combo: false, subject: true },
    ],
  },
  {
    category: 'Support & Extras',
    features: [
      { name: 'Community Forum',              free: true,       chapter: true,      combo: true,      subject: true },
      { name: 'Email Support',                free: 'Standard', chapter: 'Priority',combo: 'Priority',subject: 'Priority' },
      { name: 'Certificate of Completion',    free: false,      chapter: false,     combo: false,     subject: true },
      { name: 'Early Access to New Content',  free: false,      chapter: false,     combo: false,     subject: true },
    ],
  },
];

const faqs = [
  {
    q: 'How long does access last?',
    a: 'All paid plans give you 12 months of access from the date of purchase. After 12 months, access expires and you will need to purchase again to continue learning.',
  },
  {
    q: 'What happens to my data after access expires?',
    a: 'Once your 12-month access period ends, your entitlement is marked as expired. Your account and any free-tier content remain active. You can purchase any plan again to regain access.',
  },
  {
    q: 'Can I switch between plans?',
    a: 'Yes. You can purchase a higher-tier plan at any time — your new 12-month window starts from that purchase date. Each plan purchase is independent.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept UPI, net banking, credit/debit cards (Visa, Mastercard, RuPay), and major digital wallets.',
  },
  {
    q: 'Is there a money-back guarantee?',
    a: 'Yes, we offer a 30-day money-back guarantee on all paid plans. If you are not satisfied, contact us for a full refund.',
  },
  {
    q: 'Do the plans cover Class 11 and Class 12 both?',
    a: 'Yes! All plans give you access to both Class 11 and Class 12 Physics content, covering Maharashtra HSC and CBSE curricula.',
  },
];

type CellValue = boolean | string;

function ComparisonCell({ value }: { value: CellValue }) {
  if (value === true) return <Check className="w-5 h-5 text-emerald-500 mx-auto" strokeWidth={2.5} />;
  if (value === false) return <X className="w-4 h-4 text-slate-300 mx-auto" strokeWidth={2} />;
  return <span className="text-sm text-slate-700 font-medium">{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Page Hero */}
      <section className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 pt-16 pb-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />
        <div className="relative container mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-semibold rounded-full mb-6">
            <Star className="w-3.5 h-3.5 fill-current" />
            Simple, Transparent Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
            Plans for Every{' '}
            <span className="lms-shimmer-text">Physics Learner</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-8">
            Start for free and unlock your full potential. 12-month access from purchase date. No hidden charges.
          </p>
          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-8">
            {[
              { icon: Users, label: '12,000+', sub: 'Active Students' },
              { icon: BookOpen, label: '500+', sub: 'Topics Covered' },
              { icon: Award, label: '94%', sub: 'Success Rate' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <stat.icon className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
                <div className="text-2xl font-extrabold text-white">{stat.label}</div>
                <div className="text-slate-400 text-xs">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Cards (reuse PricingSection component) */}
      <PricingSection showClassTabs />

      {/* Feature Comparison Table */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
              Full Feature Comparison
            </h2>
            <p className="text-slate-500">See exactly what&apos;s included in each plan.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium w-2/5">Feature</th>
                  {[
                    { name: 'Free',           icon: Zap,    color: 'text-slate-300'  },
                    { name: 'Chapter',        icon: BookOpen,color: 'text-indigo-400' },
                    { name: 'Chapter Combo',  icon: Crown,  color: 'text-violet-400', note: '5 chapters · 20% off' },
                    { name: 'Subject',        icon: Rocket, color: 'text-amber-400'  },
                  ].map((plan) => (
                    <th key={plan.name} className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <plan.icon className={`w-4 h-4 ${plan.color}`} />
                        <span className={`text-sm font-bold ${plan.color}`}>{plan.name}</span>
                        {plan.note && <span className="text-xs text-slate-400 font-normal">{plan.note}</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((section) => (
                  <Fragment key={section.category}>
                    <tr className="bg-indigo-50/60 border-t border-slate-100">
                      <td colSpan={5} className="px-6 py-3 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                        {section.category}
                      </td>
                    </tr>
                    {section.features.map((feat, i) => (
                      <tr key={`${section.category}-${i}`} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3.5 text-sm text-slate-700">{feat.name}</td>
                        <td className="px-4 py-3.5 text-center"><ComparisonCell value={feat.free} /></td>
                        <td className="px-4 py-3.5 text-center bg-indigo-50/30"><ComparisonCell value={feat.chapter} /></td>
                        <td className="px-4 py-3.5 text-center bg-violet-50/30"><ComparisonCell value={feat.combo} /></td>
                        <td className="px-4 py-3.5 text-center bg-amber-50/30"><ComparisonCell value={feat.subject} /></td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3 flex items-center justify-center gap-2">
              <HelpCircle className="w-7 h-7 text-indigo-500" />
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-slate-200 rounded-2xl p-6 hover:border-indigo-200 transition-colors hover:shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {faq.q}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed pl-7">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      
    </div>
  );
}
