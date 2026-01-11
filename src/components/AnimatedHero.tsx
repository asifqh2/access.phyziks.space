// src/components/AnimatedHero.tsx
'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default function AnimatedHero() {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20 relative overflow-hidden">
      {/* Animated Physics Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Atoms */}
        <div className="absolute top-10 left-10 w-16 h-16 animate-float">
          <div className="relative w-full h-full">
            <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-1/2 w-12 h-12 border-2 border-white/30 rounded-full -translate-x-1/2 -translate-y-1/2 animate-orbit"></div>
            <div className="absolute top-1/2 left-1/2 w-12 h-12 border-2 border-white/30 rounded-full -translate-x-1/2 -translate-y-1/2 animate-orbit-reverse"></div>
          </div>
        </div>
        
        {/* Mathematical Formulas */}
        <div className="absolute top-20 right-20 text-white/20 text-2xl font-mono animate-float-delayed">
          E = mc²
        </div>
        
        {/* Orbiting Book */}
        <div className="absolute bottom-20 right-10 animate-bounce-slow">
          <BookOpen className="w-12 h-12 text-white/30" />
        </div>
        
        {/* DNA Helix */}
        <div className="absolute bottom-32 left-20 text-white/20 text-xl animate-pulse-slow">
          <div className="rotate-12">⚛️</div>
        </div>
      </div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 animate-fade-in">
          Welcome to Phyziks.space
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-blue-100 animate-fade-in-delayed">
          Your Complete Educational Resource Platform
        </p>
        <div className="flex flex-wrap justify-center gap-4 animate-fade-in-more-delayed">
          <Link
            href="/syllabus"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all hover:scale-105"
          >
            Explore Syllabus
          </Link>
          <Link
            href="/last-year-papers"
            className="bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-all border-2 border-white hover:scale-105"
          >
            View Past Papers
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes orbit {
          from { transform: translate(-50%, -50%) rotate(0deg) translateX(20px) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg) translateX(20px) rotate(-360deg); }
        }
        @keyframes orbit-reverse {
          from { transform: translate(-50%, -50%) rotate(0deg) translateX(20px) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(-360deg) translateX(20px) rotate(360deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
        .animate-orbit {
          animation: orbit 4s linear infinite;
        }
        .animate-orbit-reverse {
          animation: orbit-reverse 6s linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        .animate-fade-in-delayed {
          animation: fade-in 1s ease-out 0.2s both;
        }
        .animate-fade-in-more-delayed {
          animation: fade-in 1s ease-out 0.4s both;
        }
      `}</style>
    </section>
  );
}