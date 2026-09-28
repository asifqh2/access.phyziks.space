'use client';

// src/app/courses/[slug]/PlayerWrapper.tsx
//
// Reads ActiveSubtopicContext (owned by CourseLayout) and forwards
// activeItem to ChapterPlayer. This thin bridge is necessary because
// AccessGate (server component) sits between CourseLayout and ChapterPlayer
// in the render tree, breaking direct prop passing.

import { useContext } from 'react';
import ChapterPlayer from './ChapterPlayer';
import { ActiveSubtopicContext } from './ActiveSubtopicContext';
import type { CourseChapter } from './CourseLayout';

export default function PlayerWrapper({ chapter }: { chapter: CourseChapter }) {
  const { activeItem } = useContext(ActiveSubtopicContext);
  return <ChapterPlayer chapter={chapter} activeItem={activeItem} />;
}
