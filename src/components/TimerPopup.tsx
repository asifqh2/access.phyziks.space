'use client';

import { X, CheckCircle } from 'lucide-react';

interface TimerPopupProps {
  isVisible: boolean;
  onClose: () => void;
  sessionCount: number;
}

export default function TimerPopup({ isVisible, onClose, sessionCount }: TimerPopupProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-sm mx-4 text-center animate-pulse">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Time's Up!</h2>
        <p className="text-gray-600 mb-4">Great job! You've completed session #{sessionCount}</p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 mx-auto"
        >
          <X className="w-4 h-4" />
          Close
        </button>
      </div>
    </div>
  );
}