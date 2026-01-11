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
    <div className="bg-yellow-50 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-yellow-600" />
          <h3 className="font-semibold text-gray-800">Quick Notes</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-yellow-600 hover:text-yellow-700"
        >
          {isExpanded ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
      
      {isExpanded && (
        <div className="space-y-3">
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
              className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="max-h-40 overflow-y-auto space-y-2">
            {notes.map(note => (
              <div key={note.id} className="bg-white p-3 rounded-lg border border-yellow-200">
                <div className="flex justify-between items-start">
                  <p className="text-sm text-gray-800 flex-1">{note.text}</p>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="text-gray-400 hover:text-red-500 ml-2"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {note.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}