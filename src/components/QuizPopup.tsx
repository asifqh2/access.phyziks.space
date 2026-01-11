'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, Clock, X } from 'lucide-react';

export default function QuizPopup() {
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasBeenClicked, setHasBeenClicked] = useState(false);

  const [dragDistance, setDragDistance] = useState(0);
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const checkActiveQuiz = async () => {
      try {
        const response = await fetch('/api/quizzes');
        if (response.ok) {
          const quizzes = await response.json();
          const runningQuiz = quizzes.find((quiz: any) => quiz.isActive);
          
          if (runningQuiz && !activeQuiz) {
            setActiveQuiz(runningQuiz);
            setIsVisible(true);
            setHasBeenClicked(false);
          } else if (!runningQuiz && activeQuiz) {
            setActiveQuiz(null);
            setIsVisible(false);
            setHasBeenClicked(false);
          }
        }
      } catch (error) {
        console.error('Error checking active quiz:', error);
      }
    };

    checkActiveQuiz();
    const interval = setInterval(checkActiveQuiz, 10000);

    return () => clearInterval(interval);
  }, [activeQuiz]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setHasBeenClicked(true);
    setIsDragging(true);
    setInitialPosition({ x: e.clientX, y: e.clientY });
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    setDragDistance(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newPosition = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y };
      setPosition(newPosition);
      
      const distance = Math.sqrt(
        Math.pow(e.clientX - initialPosition.x, 2) + 
        Math.pow(e.clientY - initialPosition.y, 2)
      );
      setDragDistance(distance);
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragDistance > 100) {
      setIsVisible(false);
    }
    setIsDragging(false);
    setDragDistance(0);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (dragDistance < 5) {
      setIsVisible(false);
    }
  };

  if (!isVisible || !activeQuiz) return null;

  return (
    <div 
      className={`fixed top-2 right-2 md:top-4 md:right-4 z-50 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg shadow-2xl p-2 md:p-4 w-64 md:max-w-sm cursor-move select-none text-xs md:text-sm ${!hasBeenClicked ? 'animate-bounce' : ''}`}
      style={{ 
        transform: `translate(${position.x}px, ${position.y}px)`,
        animation: 'popIn 0.5s ease-out'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      <style jsx>{`
        @keyframes popIn {
          0% {
            transform: scale(0) translate(${position.x}px, ${position.y}px);
            opacity: 0;
          }
          50% {
            transform: scale(1.1) translate(${position.x}px, ${position.y}px);
          }
          100% {
            transform: scale(1) translate(${position.x}px, ${position.y}px);
            opacity: 1;
          }
        }
      `}</style>
      <div className="flex items-start justify-between mb-1 md:mb-2">
        <div className="flex items-center gap-1 md:gap-2">
          <Trophy className="w-3 h-3 md:w-5 md:h-5 text-yellow-300" />
          <span className="font-bold text-xs md:text-sm">Quiz Live!</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setHasBeenClicked(true);
            setIsVisible(false);
          }}
          className="text-white/70 hover:text-white p-1"
        >
          <X className="w-3 h-3 md:w-4 md:h-4" />
        </button>
      </div>
      
      <h3 className="font-semibold text-xs md:text-sm mb-1 truncate">{activeQuiz.title}</h3>
      <p className="text-xs text-purple-100 mb-2 md:mb-3 line-clamp-1 md:line-clamp-2">{activeQuiz.description}</p>
      
      <div className="flex items-center gap-2 md:gap-3 text-xs text-purple-200 mb-2 md:mb-3">
        <span className="flex items-center gap-1">
          <Clock className="w-2 h-2 md:w-3 md:h-3" />
          {activeQuiz.timeLimit}min
        </span>
        <span>{activeQuiz.questions?.length || 0}Q</span>
      </div>
      
      <Link
        href="/quiz"
        onClick={() => setIsVisible(false)}
        className="block w-full bg-yellow-500 text-purple-900 text-center py-1 md:py-2 rounded-md font-bold text-xs md:text-sm hover:bg-yellow-400 transition-colors"
      >
        Join Now!
      </Link>
    </div>
  );
}