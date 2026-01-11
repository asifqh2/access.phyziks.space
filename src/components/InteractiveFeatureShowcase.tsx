"use client";

import { useState } from 'react';
import { Search, Sun, ArrowUp, Sparkles, Zap } from 'lucide-react';

export function InteractiveFeatureShowcase() {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: Search,
      title: "Smart Search",
      description: "Instantly find study materials with our enhanced search modal",
      color: "from-blue-500 to-cyan-500",
      demo: "Try the search button in the header!"
    },
    {
      icon: Sun,
      title: "Light Theme",
      description: "Clean and bright interface for comfortable studying",
      color: "from-yellow-500 to-orange-500",
      demo: "Optimized for daytime reading"
    },
    {
      icon: ArrowUp,
      title: "Floating Actions",
      description: "Quick access to essential tools with our floating action button",
      color: "from-green-500 to-emerald-500",
      demo: "Check the bottom-right corner!"
    },
    {
      icon: Sparkles,
      title: "Enhanced Cards",
      description: "Interactive post cards with smooth hover animations",
      color: "from-orange-500 to-red-500",
      demo: "Hover over any study material card"
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-gray-900">
            ✨ New Interactive Features
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We've enhanced your learning experience with interactive elements inspired by modern web design
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className={`relative p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                  activeFeature === index ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setActiveFeature(index)}
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                
                <h3 className="text-lg font-semibold mb-2 text-gray-900">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4">
                  {feature.description}
                </p>
                
                <div className="text-xs text-blue-600 font-medium">
                  {feature.demo}
                </div>

                {activeFeature === index && (
                  <div className="absolute -top-2 -right-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-ping"></div>
                    <div className="absolute top-0 w-4 h-4 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <button className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-colors">
            Explore All Features
            <Zap className="h-4 w-4 ml-2" />
          </button>
        </div>
      </div>
    </section>
  );
}