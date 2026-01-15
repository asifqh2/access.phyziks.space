'use client';

import { useState, useEffect } from 'react';
import { StickyNote, Plus, X } from 'lucide-react';

interface Note {
  id: string;
  text: string;
  timestamp: Date;
}

export default function QuickNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('quickNotes');
    if (saved) {
      setNotes(JSON.parse(saved).map((n: any) => ({...n, timestamp: new Date(n.timestamp)})));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('quickNotes', JSON.stringify(notes));
  }, [notes]);

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

  return (
    <div 
      className="bg-yellow-50 rounded-lg shadow-lg p-6 max-w-sm hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105 hover:-translate-y-1"
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      <div className="text-center">
        <StickyNote className="w-8 h-8 text-yellow-600 mx-auto mb-4 transition-transform duration-300 group-hover:scale-110" />
        <h3 className="text-lg font-semibold mb-2 text-gray-800">Quick Notes</h3>
        
        {!isExpanded ? (
          <>
            <p className="text-sm text-gray-600 mb-4">Jot down quick thoughts</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
              Add Note
            </div>
          </>
        ) : (
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addNote()}
                placeholder="Add a quick note..."
                className="flex-1 px-3 py-2 text-sm border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-800"
              />
              <button
                onClick={addNote}
                className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="max-h-40 overflow-y-auto space-y-2">
              {notes.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No notes yet</p>
              ) : (
                notes.map(note => (
                  <div key={note.id} className="bg-white p-3 rounded-lg border border-yellow-200">
                    <div className="flex justify-between items-start">
                      <p className="text-sm text-gray-800 flex-1 text-left">{note.text}</p>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="text-gray-400 hover:text-red-500 ml-2 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-left">
                      {note.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}