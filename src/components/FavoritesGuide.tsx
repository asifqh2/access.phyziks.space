'use client';

import { useState, useEffect } from 'react';
import { Heart, X, Play, Move, ChevronDown, ChevronUp, Search, Plus, Clock, StickyNote } from 'lucide-react';

export default function FavoritesGuide() {
  const [step, setStep] = useState(0);
  const [iconPosition, setIconPosition] = useState({ x: 250, y: 40 });
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showFavoritesPage, setShowFavoritesPage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [favoritesList, setFavoritesList] = useState<string[]>([]);
  const [showInstruction, setShowInstruction] = useState(false);

  const instructions = [
    'Drag the floating icon to move it anywhere on screen',
    'Click the expand button to show all tools',
    'Click the pink Favorites button to open your saved items',
    'Use the search bar to find topics you want to save',
    'Click on any suggestion to add it to your favorites',
    'Your topic is now saved! The cycle repeats automatically'
  ];

  const sampleTopics = ['Quantum Physics', 'Thermodynamics', 'Electromagnetism', 'Optics', 'Mechanics'];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(prev => {
        const nextStep = (prev + 1) % 6;
        
        // Show instruction for current step
        setShowInstruction(true);
        setTimeout(() => setShowInstruction(false), 2500);
        
        // Reset states for new cycle
        if (nextStep === 0) {
          setIconPosition({ x: 250, y: 40 });
          setIsCollapsed(true);
          setShowFavoritesPage(false);
          setSearchQuery('');
          setShowSuggestions(false);
          setFavoritesList([]);
        }
        
        // Step 1: Drag icon
        if (nextStep === 1) {
          setTimeout(() => setIconPosition({ x: 150, y: 80 }), 800);
        }
        
        // Step 2: Expand floating tools
        if (nextStep === 2) {
          setTimeout(() => setIsCollapsed(false), 800);
        }
        
        // Step 3: Show favorites page
        if (nextStep === 3) {
          setTimeout(() => setShowFavoritesPage(true), 800);
        }
        
        // Step 4: Type in search
        if (nextStep === 4) {
          setTimeout(() => {
            setSearchQuery('quantum');
            setShowSuggestions(true);
          }, 800);
        }
        
        // Step 5: Add to favorites
        if (nextStep === 5) {
          setTimeout(() => {
            setFavoritesList(prev => [...prev, 'Quantum Physics']);
            setSearchQuery('');
            setShowSuggestions(false);
          }, 800);
        }
        
        return nextStep;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-r from-white-50 to-rose-50 border border-white-200 rounded-xl p-4 sm:p-6 mb-8">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-pink-100 p-2 rounded-lg">
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Quick Access to Favorites</h3>
            <p className="text-xs sm:text-sm text-gray-600">Interactive demo showing how to save content</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:gap-6">
        {/* Interactive Demo */}
        <div className="bg-white rounded-lg p-4 sm:p-6 border border-pink-100">
          <div className="flex items-center gap-2 mb-3">
            <Play className="w-3 h-3 sm:w-4 sm:h-4 text-pink-600" />
            <span className="text-xs sm:text-sm font-medium text-gray-700">Live Demo - Step {step + 1}</span>
          </div>
          
          {/* Current Step Instruction */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg h-16 flex items-center">
            {showInstruction ? (
              <p className="text-xs sm:text-sm font-medium text-blue-800 animate-fadeIn">{instructions[step]}</p>
            ) : (
              <p className="text-xs sm:text-sm font-medium text-transparent">Placeholder text for consistent height</p>
            )}
          </div>
          
          <div className="relative bg-gray-50 rounded-lg p-3 sm:p-4 min-h-[250px] sm:min-h-[300px] overflow-hidden">
            {!showFavoritesPage ? (
              <>
                {/* Simulated page content */}
                <div className="space-y-2 sm:space-y-3 mb-4">
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
                
                {/* Floating Tools - Exact replica */}
                <div 
                  className="absolute transition-all duration-1000 ease-in-out flex flex-col gap-2 select-none"
                  style={{ left: `${iconPosition.x}px`, top: `${iconPosition.y}px` }}
                >
                  {/* Drag Handle */}
                  <div className="bg-gray-200 hover:bg-gray-300 rounded-lg shadow-lg border flex items-center">
                    <div className="flex-1 p-2 cursor-move flex items-center justify-center">
                      <Move className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                    </div>
                    <button className="p-2 hover:bg-gray-400 rounded-r-lg transition-colors">
                      {isCollapsed ? 
                        <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" /> : 
                        <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                      }
                    </button>
                  </div>

                  {!isCollapsed && (
                    <>
                      {/* Favorites Widget */}
                      <div className="bg-pink-100 hover:bg-pink-200 rounded-lg shadow-lg border border-pink-200 transition-colors animate-fadeIn">
                        <div className="p-3 flex items-center gap-2">
                          <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
                          <span className="text-xs sm:text-sm font-medium text-pink-800">Favorites (3)</span>
                        </div>
                      </div>

                      {/* Timer Widget */}
                      <div className="bg-white rounded-lg shadow-lg border animate-fadeIn">
                        <div className="p-3 flex items-center gap-2 hover:bg-gray-50 rounded-lg">
                          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                          <span className="text-xs sm:text-sm font-medium text-gray-800">25:00</span>
                        </div>
                      </div>

                      {/* Notes Widget */}
                      <div className="bg-yellow-50 rounded-lg shadow-lg border border-yellow-200 animate-fadeIn">
                        <div className="p-3 flex items-center gap-2 hover:bg-yellow-100 rounded-lg">
                          <StickyNote className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                          <span className="text-xs sm:text-sm font-medium text-gray-800">Notes (0)</span>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Step-specific indicators */}
                  {step === 0 && (
                    <div className="absolute -left-16 sm:-left-20 top-2 flex items-center gap-2 animate-pulse">
                      <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded whitespace-nowrap">
                        Drag me!
                      </span>
                      <div className="w-0 h-0 border-l-4 border-l-blue-600 border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
                    </div>
                  )}
                  
                  {step === 1 && (
                    <div className="absolute -left-16 sm:-left-20 top-2 flex items-center gap-2 animate-pulse">
                      <span className="text-xs bg-green-600 text-white px-2 py-1 rounded whitespace-nowrap">
                        Expand!
                      </span>
                      <div className="w-0 h-0 border-l-4 border-l-green-600 border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
                    </div>
                  )}
                  
                  {step === 2 && !isCollapsed && (
                    <div className="absolute -left-20 sm:-left-24 top-12 flex items-center gap-2 animate-pulse">
                      <span className="text-xs bg-pink-600 text-white px-2 py-1 rounded whitespace-nowrap">
                        Click here!
                      </span>
                      <div className="w-0 h-0 border-l-4 border-l-pink-600 border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Favorites Page Simulation */
              <div className="animate-fadeIn">
                <div className="mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">My Favorites</h3>
                  
                  {/* Search bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search favorites..."
                      value={searchQuery}
                      readOnly
                      className="w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border border-gray-300 rounded-lg text-xs sm:text-sm"
                    />
                    <Search className="absolute left-2 sm:left-3 top-2.5 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                    
                    {/* Suggestions dropdown */}
                    {showSuggestions && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 animate-fadeIn">
                        {sampleTopics.filter(topic => 
                          topic.toLowerCase().includes(searchQuery.toLowerCase())
                        ).map((topic, index) => (
                          <div key={topic} className={`px-3 sm:px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                            index === 0 ? 'bg-blue-50' : ''
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm text-gray-900">{topic}</span>
                              <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Favorites list */}
                <div className="space-y-2">
                  <h4 className="text-xs sm:text-sm font-medium text-gray-700">Saved Topics:</h4>
                  {favoritesList.map((item, index) => (
                    <div key={index} className="bg-pink-50 border border-pink-200 rounded-lg p-2 sm:p-3 animate-slideIn">
                      <div className="flex items-center gap-2">
                        <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-pink-600" />
                        <span className="text-xs sm:text-sm text-gray-900">{item}</span>
                      </div>
                    </div>
                  ))}
                  
                  {favoritesList.length === 0 && (
                    <div className="text-center py-6 sm:py-8 text-gray-500">
                      <Heart className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-xs sm:text-sm">No favorites yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        
        .animate-slideIn {
          animation: slideIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}