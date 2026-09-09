"use client";

import Link from "next/link";
import { BookOpen, Users, Award, TrendingUp, Play, Clock, Star, ChevronRight, Zap } from "lucide-react";

const stats = [
  { label: "Active Learners", value: "12,000+", icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
  { label: "Study Topics", value: "500+", icon: BookOpen, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Success Rate", value: "94%", icon: Award, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Hours of Content", value: "1,200+", icon: Clock, color: "text-violet-600", bg: "bg-violet-50" },
];

const courseCards = [
  {
    title: "Ray Optics & Wave Optics",
    chapter: "Chapter 9 & 10",
    progress: 72,
    color: "from-indigo-500 to-purple-600",
    emoji: "🔭",
    rating: 4.9,
    students: "3.2k",
  },
  {
    title: "Current Electricity",
    chapter: "Chapter 11",
    progress: 45,
    color: "from-amber-500 to-orange-600",
    emoji: "⚡",
    rating: 4.8,
    students: "2.8k",
  },
  {
    title: "Semiconductor Physics",
    chapter: "Chapter 16",
    progress: 88,
    color: "from-emerald-500 to-teal-600",
    emoji: "💡",
    rating: 4.9,
    students: "4.1k",
  },
];

export default function LMSHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 pt-16 pb-20 lg:pt-24 lg:pb-28">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] lms-float" />
        <div
          className="absolute -bottom-32 -left-32 w-80 h-80 bg-violet-500/15 rounded-full blur-[80px] lms-float"
          style={{ animationDelay: "3s" }}
        />
        <div
          className="absolute top-1/2 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-[60px] lms-float"
          style={{ animationDelay: "1.5s" }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top badge */}
        <div className="flex justify-center mb-8 lms-slide-up">
          <div className="lms-badge lms-badge-accent px-4 py-2 text-sm rounded-full border border-amber-500/20 bg-amber-500/10">
            <Zap className="w-3.5 h-3.5" />
            <span>India&apos;s #1 Physics LMS Portal</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="lms-slide-up text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight mb-6">
              <span className="text-white">Your Physics</span>{" "}
              <br className="hidden sm:block" />
              <span className="lms-shimmer-text">Learning Journey</span>
              <br />
              <span className="text-white">Starts Here.</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 max-w-xl mb-8 mx-auto lg:mx-0 leading-relaxed">
              Master Class 11 &amp; 12 Physics with structured courses, solved numericals,
              and mind maps — for Maharashtra HSC &amp; CBSE students.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start mb-10">
              <Link
                href="/chapter-wise"
                className="inline-flex items-center gap-2 px-7 py-3.5 lms-btn-primary text-base rounded-xl shadow-lg"
              >
                <Play className="w-4 h-4 fill-current" />
                Start Learning Free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold text-white border-2 border-white/20 rounded-xl hover:border-indigo-400 hover:bg-white/5 transition-all duration-200"
              >
                View Pricing
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-5 justify-center lg:justify-start">
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <div className="flex -space-x-2">
                  {["🧑‍🎓", "👩‍🎓", "🧑‍💻", "👨‍🔬"].map((emoji, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm border-2 border-slate-900"
                    >
                      {emoji}
                    </div>
                  ))}
                </div>
                <span>12,000+ students enrolled</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400 text-sm">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
                <span className="text-slate-300 ml-1">4.9/5 rating</span>
              </div>
            </div>
          </div>

          {/* Right: Course Cards */}
          <div className="hidden lg:block lms-slide-in-right">
            <div className="relative space-y-4">
              {/* Floating badge */}
              <div
                className="absolute -top-4 -right-4 z-10 lms-badge-pop"
                style={{ animationDelay: "0.8s" }}
              >
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg lms-float">
                  🔥 Hot This Week
                </div>
              </div>

              {courseCards.map((course, index) => (
                <div
                  key={index}
                  className="course-card lms-glass rounded-2xl p-4 lms-slide-up"
                  style={{ animationDelay: `${0.2 + index * 0.15}s`, opacity: 0 }}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${course.color} flex items-center justify-center text-2xl flex-shrink-0 shadow-md`}
                    >
                      {course.emoji}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-slate-500 font-medium">{course.chapter}</span>
                        <div className="flex items-center gap-1 text-xs text-amber-500">
                          <Star className="w-3 h-3 fill-current" />
                          {course.rating}
                        </div>
                      </div>
                      <h3 className="font-semibold text-slate-800 text-sm leading-tight mb-2 truncate">
                        {course.title}
                      </h3>
                      {/* Progress */}
                      <div className="flex items-center gap-2">
                        <div className="course-progress-bar flex-1">
                          <div
                            className="course-progress-fill"
                            style={{ "--progress-width": `${course.progress}%` } as React.CSSProperties}
                          />
                        </div>
                        <span className="text-xs font-semibold text-indigo-600 w-8 text-right">
                          {course.progress}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                        <Users className="w-3 h-3" />
                        {course.students} students
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Bottom card: Live indicator */}
              <div
                className="course-card lms-glass rounded-2xl p-4 lms-slide-up border border-emerald-200/50"
                style={{ animationDelay: "0.65s", opacity: 0 }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-60" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-800">
                      New: JEE 2025 Solutions Added
                    </div>
                    <div className="text-xs text-slate-500">Just now · 120 students viewing</div>
                  </div>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="lms-glass rounded-2xl p-5 text-center lms-slide-up border border-white/10"
              style={{ animationDelay: `${0.4 + index * 0.1}s`, opacity: 0 }}
            >
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-2xl font-extrabold text-white mb-0.5">{stat.value}</div>
              <div className="text-xs text-slate-400 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
