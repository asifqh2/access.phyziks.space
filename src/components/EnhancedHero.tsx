"use client";

import Link from "next/link";
import { EnhancedButton } from "./ui/enhanced-button";
import TypingEffect from "./TypingEffect";

export default function EnhancedHero() {
  return (
    <section className="container mx-auto px-6 lg:px-12 pt-4 pb-24 lg:pt-32 lg:pb-32 relative overflow-hidden">
      <div className="grid lg:grid-cols-2 gap-8 items-center">
        {/* Typing Effect - Centered */}
        <div className="lg:col-span-2 text-center mb-4">
          <TypingEffect 
            text="Welcome to Phyziks.space"
            speed={150} 
            className="text-2xl sm:text-3xl lg:text-4xl font-mono text-blue-400 tracking-wider"
          />
        </div>
        
        {/* Left: Text Content */}
        <div className="max-w-5xl">
          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold leading-[0.95] tracking-tight text-balance mb-8">
            For Last Benchers, <br/>Future Toppers.
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-2xl leading-relaxed mb-8">
            Master physics concepts with solved numericals, 
            and comprehensive study materials for Maharashtra Board and CBSE Class 11 & 12.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Link href="/chapter-wise">
              <EnhancedButton size="lg" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 hover:from-yellow-500 hover:to-orange-600">
                View Chapters
              </EnhancedButton>
            </Link>
            <Link href="/last-year-papers">
              <EnhancedButton variant="outline" size="lg">
                View Past Papers
              </EnhancedButton>
            </Link>
          </div>
        </div>

        {/* Right: Visual Grid */}
        <div className="hidden lg:grid grid-cols-2 gap-4 relative">
          {/* Decorative education-themed cards */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-sm">
              <div className="font-mono text-sm text-blue-400 mb-2">
                {"<Physics>"}
              </div>
              <div className="h-2 bg-blue-500/30 rounded mb-2 w-3/4"></div>
              <div className="h-2 bg-blue-500/20 rounded mb-2 w-full"></div>
              <div className="h-2 bg-blue-500/20 rounded w-1/2"></div>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
              </div>
              <div className="text-2xl font-bold text-green-400 mb-2">∫</div>
              <div className="h-2 bg-green-500/30 rounded mb-2 w-2/3"></div>
              <div className="h-2 bg-green-500/20 rounded mb-2 w-full"></div>
              <div className="h-2 bg-green-500/20 rounded w-4/5"></div>
            </div>
          </div>

          <div className="space-y-4 mt-8">
            <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/30 flex items-center justify-center text-xs font-bold">
                  📚
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-orange-500/30 rounded w-3/4"></div>
                </div>
              </div>
              <div className="h-2 bg-orange-500/20 rounded mb-2 w-full"></div>
              <div className="h-2 bg-orange-500/20 rounded w-2/3"></div>
            </div>

            <div className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-2xl p-6 backdrop-blur-sm">
              <div className="text-2xl font-bold text-violet-400 mb-3">
                E = mc²
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-500/50"></div>
                  <div className="h-2 bg-violet-500/30 rounded flex-1"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-500/50"></div>
                  <div className="h-2 bg-violet-500/30 rounded flex-1 w-4/5"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-500/50"></div>
                  <div className="h-2 bg-violet-500/30 rounded flex-1 w-3/5"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating accent elements */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl"></div>
        </div>
      </div>
    </section>
  );
}