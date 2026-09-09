// src/types/index.ts

export interface Post {
  id: string;
  slug: string;
  title: string;
  topic?: string | null;
  description: string;
  content: string;
  category: PostCategory;
  tags: string[];
  chapters?: string[];
  topics?: string[];
  concepts?: string[];
  year?: number;
  subject?: string;
  requiredPlan?: 'free' | 'pro' | 'premium';
  youtubeUrl?: string;
  pdfUrl?: string;
  wordUrl?: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
  views: number;
  isSyllabus: boolean;
  syllabusPath?: string; // Path in syllabus hierarchy
  difficulty?: 'easy' | 'medium' | 'hard';
  rating?: number;
  progress?: number; // 0-100 percentage
  isHidden?: boolean; // Hide from public view, only visible in admin
  autoCategorize?: {
    isLastYearPaper: boolean;
    isChapter: boolean;
    isTopic: boolean;
    isConcept: boolean;
  };
}

export type PostCategory = 
  | 'last-year-paper' 
  | 'chapter' 
  | 'topic' 
  | 'concept' 
  | 'blog' 
  | 'syllabus';

export interface Comment {
  id: string;
  postId: string;
  email: string;
  name: string;
  content: string;
  createdAt: string;
  isApproved: boolean;
}

export interface SyllabusItem {
  id: string;
  title: string;
  slug: string;
  order: number;
  children?: SyllabusItem[];
  description?: string;
  postId?: string;
}

export interface SearchResult {
  post: Post;
  score: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option (0-3)
  explanation?: string;
  type?: 'multiple-choice' | 'true-false' | 'fill-blank' | 'match-pairs' | 'drag-drop' | 'card-match' | 'card-sorting' | 'flashcards' | 'slider-scale' | 'hotspot-image';
  categories?: string[]; // For card sorting
  imageUrl?: string; // For hotspot questions
  hotspots?: { x: number; y: number; correct: boolean }[]; // For hotspot questions
  minValue?: number; // For slider scale
  maxValue?: number; // For slider scale
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  subject?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number; // in minutes
  questions: QuizQuestion[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  maxAttempts?: number;
  passingScore?: number; // percentage
}