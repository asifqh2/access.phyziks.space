'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock, StickyNote, Play, Pause, RotateCcw, Plus, X, Heart, Move, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import Link from 'next/link';
import TimerPopup from './TimerPopup';

interface Note {
  id: string;
  text: string;
  timestamp: Date;
}

export default function FloatingStudyTools() {
  // Position state
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Timer state
  const [time, setTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const [showTimerPopup, setShowTimerPopup] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(25);
  const [showSettings, setShowSettings] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  // Favorites count
  const [favoritesCount, setFavoritesCount] = useState(0);

  // Load saved position and collapse state
  useEffect(() => {
    const savedPosition = localStorage.getItem('floatingToolsPosition');
    const savedCollapsed = localStorage.getItem('floatingToolsCollapsed');
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    }
    if (savedCollapsed) {
      setIsCollapsed(JSON.parse(savedCollapsed));
    }
  }, []);

  // Save position and collapse state
  useEffect(() => {
    localStorage.setItem('floatingToolsPosition', JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    localStorage.setItem('floatingToolsCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Touch and mouse drag handlers
  const handleStart = (clientX: number, clientY: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (isDragging) {
      const newX = clientX - dragOffset.x;
      const newY = clientY - dragOffset.y;
      
      // Use minimal boundaries - just keep drag handle visible
      const maxX = window.innerWidth - 100; // Just keep drag handle visible
      const maxY = window.innerHeight - 50;  // Just keep drag handle visible
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, dragOffset]);

  // Close other widgets when opening one
  const handleToggleTimer = () => {
    setShowNotes(false);
    setShowTimer(!showTimer);
  };

  const handleToggleNotes = () => {
    setShowTimer(false);
    setShowNotes(!showNotes);
  };

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && time > 0) {
      interval = setInterval(() => {
        setTime(time => time - 1);
      }, 1000);
    } else if (time === 0) {
      setSessions(prev => prev + 1);
      setTime(customMinutes * 60);
      setIsActive(false);
      setShowTimerPopup(true);
    }
    return () => clearInterval(interval);
  }, [isActive, time, customMinutes]);

  // Notes logic
  useEffect(() => {
    const saved = localStorage.getItem('quickNotes');
    if (saved) {
      setNotes(JSON.parse(saved).map((n: any) => ({...n, timestamp: new Date(n.timestamp)})));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('quickNotes', JSON.stringify(notes));
  }, [notes]);

  // Favorites count
  useEffect(() => {
    const updateFavoritesCount = () => {
      const favorites = JSON.parse(localStorage.getItem('favoriteQuestions') || '[]');
      setFavoritesCount(favorites.length);
    };
    
    updateFavoritesCount();
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'favoriteQuestions') {
        updateFavoritesCount();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(updateFavoritesCount, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const addNote = () => {
    if (newNote.trim()) {
      setNotes([...notes, {
        id: Date.now().toString(),
        text: newNote.trim(),
        timestamp: new Date()
      }]);
      setNewNote('');
    }
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  const setTimerMinutes = () => {
    setTime(customMinutes * 60);
    setIsActive(false);
    setShowSettings(false);
  };

  return (
    <div 
      ref={containerRef}
      className="fixed z-50 flex flex-col gap-2 select-none touch-none"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        right: 'auto',
        bottom: 'auto'
      }}
    >
      {/* Drag Handle with Collapse Toggle */}
      <div className="bg-gray-200 hover:bg-gray-300 rounded-lg shadow-lg border flex items-center">
        <div 
          className="flex-1 p-3 md:p-2 cursor-move flex items-center justify-center touch-manipulation"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <Move className="w-5 h-5 md:w-4 md:h-4 text-gray-600" />
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-3 md:p-2 hover:bg-gray-400 rounded-r-lg transition-colors touch-manipulation"
        >
          {isCollapsed ? <ChevronDown className="w-5 h-5 md:w-4 md:h-4 text-gray-600" /> : <ChevronUp className="w-5 h-5 md:w-4 md:h-4 text-gray-600" />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Favorites Widget */}
          <Link href="/favorites" className="bg-pink-100 hover:bg-pink-200 rounded-lg shadow-lg border border-pink-200 transition-colors">
            <div className="p-4 md:p-3 flex items-center gap-2">
              <Heart className="w-6 h-6 md:w-5 md:h-5 text-pink-600" />
              <span className="text-base md:text-sm font-medium text-pink-800">Favorites ({favoritesCount})</span>
            </div>
          </Link>

          {/* Timer Widget */}
          <div className="bg-white rounded-lg shadow-lg border">
            {showTimer ? (
              <div className="p-4 w-72 md:w-64">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-6 h-6 md:w-5 md:h-5 text-blue-600" />
                    <span className="font-semibold text-gray-800">Study Timer</span>
                  </div>
                  <button
                    onClick={() => setShowTimer(false)}
                    className="text-gray-400 hover:text-gray-600 p-1 touch-manipulation"
                  >
                    <X className="w-5 h-5 md:w-4 md:h-4" />
                  </button>
                </div>
                <div className="text-3xl md:text-2xl font-mono font-bold text-gray-800 text-center mb-4 md:mb-3">
                  {formatTime(time)}
                </div>
                <div className="flex justify-center gap-2 mb-3 md:mb-2">
                  <button
                    onClick={() => setIsActive(!isActive)}
                    className="flex items-center gap-1 px-3 py-1.5 md:px-3 md:py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 touch-manipulation"
                  >
                    {isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span className="hidden sm:inline">{isActive ? 'Pause' : 'Start'}</span>
                  </button>
                  <button
                    onClick={() => { setTime(customMinutes * 60); setIsActive(false); }}
                    className="flex items-center gap-1 px-3 py-1.5 md:px-3 md:py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 touch-manipulation"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center gap-1 px-3 py-1.5 md:px-3 md:py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 touch-manipulation"
                  >
                    <Settings className="w-3 h-3" />
                    <span className="hidden sm:inline">Set</span>
                  </button>
                </div>
                {showSettings && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="number"
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 px-2 py-1 text-sm border rounded text-gray-800"
                        min="1"
                        max="120"
                      />
                      <span className="text-sm text-gray-800">minutes</span>
                      <button
                        onClick={setTimerMinutes}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-sm md:text-xs text-gray-600 text-center">Sessions: {sessions}</p>
              </div>
            ) : (
              <button
                onClick={handleToggleTimer}
                className="p-4 md:p-3 flex items-center gap-2 hover:bg-gray-50 rounded-lg w-full touch-manipulation"
              >
                <Clock className="w-6 h-6 md:w-5 md:h-5 text-blue-600" />
                <span className="text-base md:text-sm font-medium text-gray-800">{formatTime(time)}</span>
                {isActive && <div className="w-3 h-3 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse"></div>}
              </button>
            )}
          </div>

          {/* Notes Widget */}
          <div className="bg-yellow-50 rounded-lg shadow-lg border border-yellow-200">
            {showNotes ? (
              <div className="p-4 w-72 md:w-64">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <StickyNote className="w-6 h-6 md:w-5 md:h-5 text-yellow-600" />
                    <span className="font-semibold text-gray-800">Quick Notes</span>
                  </div>
                  <button
                    onClick={() => setShowNotes(false)}
                    className="text-gray-400 hover:text-gray-600 p-1 touch-manipulation"
                  >
                    <X className="w-5 h-5 md:w-4 md:h-4" />
                  </button>
                </div>
                
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addNote()}
                    placeholder="Add a note..."
                    className="flex-1 px-3 py-2 md:px-2 md:py-1 text-base md:text-sm border border-yellow-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500 text-gray-800"
                  />
                  <button
                    onClick={addNote}
                    className="px-3 py-2 md:px-2 md:py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 touch-manipulation"
                  >
                    <Plus className="w-4 h-4 md:w-3 md:h-3" />
                  </button>
                </div>
                
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {notes.map(note => (
                    <div key={note.id} className="bg-white p-3 md:p-2 rounded border border-yellow-200">
                      <div className="flex justify-between items-start">
                        <p className="text-sm md:text-xs text-gray-800 flex-1">{note.text}</p>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="text-gray-400 hover:text-red-500 ml-2 md:ml-1 p-1 touch-manipulation"
                        >
                          <X className="w-4 h-4 md:w-3 md:h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {note.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={handleToggleNotes}
                className="p-4 md:p-3 flex items-center gap-2 hover:bg-yellow-100 rounded-lg w-full touch-manipulation"
              >
                <StickyNote className="w-6 h-6 md:w-5 md:h-5 text-yellow-600" />
                <span className="text-base md:text-sm font-medium text-gray-800">Notes ({notes.length})</span>
              </button>
            )}
          </div>
        </>
      )}
      
      <TimerPopup 
        isVisible={showTimerPopup}
        onClose={() => setShowTimerPopup(false)}
        sessionCount={sessions}
      />
    </div>
  );
}