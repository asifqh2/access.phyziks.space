'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

interface PinButtonProps {
  id: string;
  title: string;
  content: string;
  category: string;
  subject?: string;
  url?: string;
}

export default function PinButton({ id, title, content, category, subject, url }: PinButtonProps) {
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem('favoriteQuestions') || '[]');
    setIsPinned(favorites.some((item: any) => item.id === id));
  }, [id]);

  const togglePin = () => {
    const favorites = JSON.parse(localStorage.getItem('favoriteQuestions') || '[]');
    
    if (isPinned) {
      const updated = favorites.filter((item: any) => item.id !== id);
      localStorage.setItem('favoriteQuestions', JSON.stringify(updated));
      setIsPinned(false);
    } else {
      const newFavorite = {
        id,
        title,
        content: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        url: url || window.location.href,
        category,
        subject,
        timestamp: new Date().toISOString()
      };
      favorites.push(newFavorite);
      localStorage.setItem('favoriteQuestions', JSON.stringify(favorites));
      setIsPinned(true);
    }
  };

  return (
    <button
      onClick={togglePin}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        isPinned 
          ? 'bg-pink-100 text-pink-700 hover:bg-pink-200' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
      title={isPinned ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
      <span className="text-sm font-medium">
        {isPinned ? 'Pinned' : 'Pin'}
      </span>
    </button>
  );
}