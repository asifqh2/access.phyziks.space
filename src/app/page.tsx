import Link from 'next/link';
import { ArrowRight, PlayCircle } from 'lucide-react';
import PricingSection from '@/components/PricingSection';
import PricingComparison from '@/components/PricingComparison';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return <div className="min-h-screen bg-slate-50">
    <section className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-20 text-white sm:py-28"><div className="container mx-auto max-w-6xl"><p className="mb-5 inline-flex rounded-full border border-indigo-400/30 bg-indigo-400/10 px-4 py-2 text-sm font-semibold text-indigo-200">A focused learning platform</p><h1 className="max-w-4xl text-5xl font-extrabold leading-tight sm:text-6xl">Learn with structured video courses.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Watch clear lessons, move through chapters in sequence, and always know what to study next.</p><div className="mt-9 flex flex-wrap gap-4"><Link href="/courses" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-indigo-900 hover:bg-indigo-50"><PlayCircle className="h-5 w-5" />Explore courses</Link></div></div></section>
    <PricingSection />
    <PricingComparison />
    <main className="container mx-auto max-w-6xl px-4 py-16"><div className="grid gap-8 lg:grid-cols-1"><div><p className="font-semibold text-indigo-600">START LEARNING</p><h2 className="mt-2 text-3xl font-bold text-slate-900">Everything in its right chapter.</h2><p className="mt-4 leading-7 text-slate-600">Each course has a simple chapter-by-chapter curriculum, an embedded lesson player and completion tracking for the current study session.</p><Link href="/courses" className="mt-7 inline-flex items-center gap-2 font-bold text-indigo-700 hover:text-indigo-900">Open Class 12 Physics: Complete Course<ArrowRight className="h-4 w-4" /></Link></div></div></main>
  </div>;
}
