'use client';

import Link from 'next/link';
import { Brain } from 'lucide-react';

export default function MindMapCard() {
  return (
    <Link href="/mindmap" className="block group">
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-lg p-6 max-w-sm hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 cursor-pointer">
        <div className="text-center">
          <Brain className="w-8 h-8 text-purple-600 mx-auto mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Mind Map</h3>
          <p className="text-sm text-gray-600 mb-4">Visualize and organize your concepts</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg group-hover:bg-purple-700 transition-colors">
            Create Map
          </div>
        </div>
      </div>
    </Link>
  );
}
