'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';

export default function StudyGroupCard() {
  return (
    <Link href="#study-group" className="block group">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6 max-w-sm hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 cursor-pointer">
        <div className="text-center">
          <Users className="w-8 h-8 text-blue-600 mx-auto mb-4 transition-transform duration-300 group-hover:scale-110" />
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Study Group</h3>
          <p className="text-sm text-gray-600 mb-4">Collaborate with classmates</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg group-hover:bg-blue-700 transition-colors">
            Join Group
          </div>
        </div>
      </div>
    </Link>
  );
}
