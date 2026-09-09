'use client';

// src/app/courses/[slug]/ActiveSubtopicContext.ts
//
// Shared context that carries the "active playable item" from CourseLayout
// (owner) to PlayerWrapper (consumer).
//
// An active item is one of:
//   { kind: 'chapter' }            — the chapter-level intro video
//   { kind: 'topic',    id }       — a topic that has its own video
//   { kind: 'subtopic', id }       — a subtopic video (most common)

import { createContext } from 'react';

export type ActiveItem =
  | { kind: 'chapter' }
  | { kind: 'topic';    id: string }
  | { kind: 'subtopic'; id: string };

export interface ActiveSubtopicContextValue {
  activeItem: ActiveItem | null;
  setItem:    (item: ActiveItem | null) => void;
}

export const ActiveSubtopicContext = createContext<ActiveSubtopicContextValue>({
  activeItem: null,
  setItem:    () => {},
});
