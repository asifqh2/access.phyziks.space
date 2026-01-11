'use client';

import { useEffect, useState } from 'react';

export default function Animations() {
  const [time, setTime] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setTime(prev => prev + 0.1);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-8 overflow-hidden relative h-64">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Phyziks in Motion</h3>
          <p className="text-gray-600 text-sm">Interactive physics animations</p>
        </div>
      </div>
    );
  }

  const mathSymbols = ['∫', '∂', 'π', 'Σ', '∞', 'α', 'β', 'γ', 'λ', 'Δ', '∇', 'Ω'];

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-8 overflow-hidden relative h-64">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Phyziks in Motion</h3>
        <p className="text-gray-600 text-sm">Interactive physics animations</p>
      </div>

      {/* Orbiting Atoms */}
      <div className="absolute top-16 left-16">
        <div className="relative w-20 h-20">
          {/* Nucleus */}
          <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
          {/* Electron orbits */}
          {[0, 1, 2].map(i => (
            <div key={i} className="absolute inset-0 border border-blue-300 rounded-full opacity-30" style={{
              transform: `rotate(${i * 60}deg)`,
              animation: `spin ${2 + i}s linear infinite`
            }}>
              <div className="w-2 h-2 bg-blue-500 rounded-full absolute -top-1 left-1/2 transform -translate-x-1/2" style={{
                animation: `orbit ${2 + i}s linear infinite reverse`
              }}></div>
            </div>
          ))}
        </div>
      </div>

      {/* Wave Propagation */}
      <div className="absolute bottom-16 left-8 right-8">
        <svg width="100%" height="40" className="overflow-visible">
          <path
            d={`M 0 20 ${Array.from({length: 20}, (_, i) => 
              `L ${i * 20} ${20 + Math.sin((i * 0.5) + time) * 10}`
            ).join(' ')}`}
            stroke="#3b82f6"
            strokeWidth="2"
            fill="none"
            className="drop-shadow-sm"
          />
        </svg>
        <p className="text-xs text-center text-gray-500 mt-1">Wave Propagation</p>
      </div>

      {/* Floating Math Symbols */}
      {mathSymbols.map((symbol, i) => (
        <div
          key={i}
          className="absolute text-2xl font-bold text-purple-400 opacity-60 pointer-events-none"
          style={{
            left: `${20 + (i * 60) % 80}%`,
            top: `${30 + Math.sin(time + i) * 20}%`,
            transform: `translateY(${Math.cos(time * 0.5 + i) * 10}px) rotate(${Math.sin(time + i) * 10}deg)`,
            transition: 'transform 0.1s ease-out'
          }}
        >
          {symbol}
        </div>
      ))}

      {/* Gravity Animation - Falling Phyziks Letters */}
      <div className="absolute top-16 right-32">
        <div className="relative w-32 h-32">
          {/* Falling letters from "Phyziks" */}
          {['P', 'h', 'y', 'z', 'i', 'k', 's'].map((letter, i) => {
            const fallHeight = (time * 60 + i * 15) % 120;
            const isAppearing = fallHeight < 10;
            return (
              <div
                key={i}
                className={`absolute text-lg font-bold transition-all duration-300 ${
                  isAppearing ? 'scale-150 opacity-100' : 'scale-100 opacity-80'
                }`}
                style={{
                  left: `${i * 4}px`,
                  top: `${fallHeight}px`,
                  color: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'][i],
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  transform: `${isAppearing ? 'scale(1.5)' : 'scale(1)'} rotate(${Math.sin(time + i) * 10}deg)`
                }}
              >
                {letter}
              </div>
            );
          })}
          {/* Ground line */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-600"></div>
        </div>
        <p className="text-xs text-center text-gray-500 mt-1">Gravity</p>
      </div>

      {/* Pendulum */}
      <div className="absolute top-8 right-16">
        <div className="relative w-16 h-24">
          <div 
            className="absolute top-0 left-1/2 w-0.5 h-20 bg-gray-400 origin-top"
            style={{
              transform: `translateX(-50%) rotate(${Math.sin(time * 2) * 30}deg)`
            }}
          ></div>
          <div 
            className="absolute w-4 h-4 bg-yellow-500 rounded-full"
            style={{
              left: `calc(50% + ${Math.sin(time * 2) * 30}px)`,
              top: `calc(100% - ${Math.cos(time * 2) * 5 + 75}px)`,
              transform: 'translate(-50%, -50%)'
            }}
          ></div>
        </div>
        <p className="text-xs text-center text-gray-500 mt-1">Pendulum</p>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
      `}</style>
    </div>
  );
}