'use client';

import { Suspense } from 'react';
import EditQuizContent from './EditQuizContent';

export default function EditQuizPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    }>
      <EditQuizContent />
    </Suspense>
  );
}