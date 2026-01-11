// src/lib/utils.ts

import { Post, PostCategory } from '@/types';

export function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function getCategoryPosts(posts: Post[], category: PostCategory): Post[] {
  switch (category) {
    case 'last-year-paper':
      return posts.filter(p => 
        p.category === 'last-year-paper' || 
        p.year || 
        p.autoCategorize?.isLastYearPaper
      );
    case 'chapter':
      return posts.filter(p => 
        p.category === 'chapter' || 
        (p.chapters && Array.isArray(p.chapters) && p.chapters.length > 0) ||
        p.autoCategorize?.isChapter ||
        p.isSyllabus // Show all syllabus posts in chapter-wise
      );
    case 'topic':
      return posts.filter(p => 
        p.category === 'topic' || 
        (p.topics && Array.isArray(p.topics) && p.topics.length > 0) ||
        p.autoCategorize?.isTopic ||
        p.isSyllabus // Show all syllabus posts in topic-wise
      );
    case 'concept':
      return posts.filter(p => 
        p.category === 'concept' || 
        (p.concepts && Array.isArray(p.concepts) && p.concepts.length > 0) ||
        p.autoCategorize?.isConcept ||
        p.isSyllabus // Show all syllabus posts in concept-wise
      );
    case 'syllabus':
      return posts.filter(p => p.isSyllabus || p.category === 'syllabus');
    case 'blog':
      return posts.filter(p => p.category === 'blog');
    default:
      return posts.filter(p => p.category === category);
  }
}

export function searchPosts(posts: Post[], query: string): Post[] {
  const lowerQuery = query.toLowerCase();
  return posts.filter(post =>
    post.title.toLowerCase().includes(lowerQuery) ||
    post.description.toLowerCase().includes(lowerQuery) ||
    (post.tags && post.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) ||
    (post.chapters && post.chapters.some(chapter => chapter.toLowerCase().includes(lowerQuery))) ||
    (post.topics && post.topics.some(topic => topic.toLowerCase().includes(lowerQuery))) ||
    (post.concepts && post.concepts.some(concept => concept.toLowerCase().includes(lowerQuery))) ||
    (post.subject && post.subject.toLowerCase().includes(lowerQuery)) ||
    post.content.toLowerCase().includes(lowerQuery)
  );
}

export function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}