'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

export default function StudyTimer() {
  const [time, setTime] = useState(25 * 60); // 25 minutes
  const [isActive, setIsActive] = useState(false);
  const [sessions, setSessions] = useState(0);

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
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
      <div className="text-center">
        <Clock className="w-8 h-8 text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Study Timer</h3>
        <div className="text-4xl font-mono font-bold text-gray-800 mb-6">
          {formatTime(time)}
        </div>
        <div className="flex justify-center gap-3 mb-4">
          <button
            onClick={() => setIsActive(!isActive)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isActive ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={() => { setTime(25 * 60); setIsActive(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
        <p className="text-sm text-gray-600">Sessions completed: {sessions}</p>
      </div>
    </div>
  );
}