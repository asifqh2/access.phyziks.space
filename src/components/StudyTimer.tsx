'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

export default function StudyTimer() {
  const [time, setTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && time > 0) {
      interval = setInterval(() => {
        setTime(time => time - 1);
      }, 1000);
    } else if (time === 0) {
      setSessions(prev => prev + 1);
      setTime(25 * 60);
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, time]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-lg p-6 max-w-sm hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105 hover:-translate-y-1"
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      <div className="text-center">
        <Clock className="w-8 h-8 text-blue-600 mx-auto mb-4 transition-transform duration-300 group-hover:scale-110" />
        <h3 className="text-lg font-semibold mb-2 text-gray-800">Study Timer</h3>
        
        {!isExpanded ? (
          <>
            <p className="text-sm text-gray-600 mb-4">Track your study sessions</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Start Timer
            </div>
          </>
        ) : (
          <>
            <div className="text-4xl font-mono font-bold text-gray-800 mb-6">
              {formatTime(time)}
            </div>
            <div className="flex justify-center gap-3 mb-4">
              <button
                onClick={(e) => { e.stopPropagation(); setIsActive(!isActive); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isActive ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setTime(25 * 60); setIsActive(false); }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
            <p className="text-sm text-gray-600">Sessions: {sessions}</p>
          </>
        )}
      </div>
    </div>
  );
}