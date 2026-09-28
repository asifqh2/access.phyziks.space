interface Post {
  id: string;
  title: string;
  slug: string;
  category: string;
  tags?: string[];
  chapters?: string[];
  topics?: string[];
  concepts?: string[];
  views?: number;
  subject?: string;
}

interface RelatedContent {
  relatedPosts: Post[];
  relatedChapters: Post[];
  relatedTopics: Post[];
  relatedConcepts: Post[];
}

export function getRelatedContent(currentPost: Post, allPosts: Post[], maxItems: number = 5): RelatedContent {
  // Filter out current post
  const otherPosts = allPosts.filter(p => p.id !== currentPost.id);

  // Ensure arrays exist
  const currentTags = currentPost.tags || [];
  const currentChapters = currentPost.chapters || [];
  const currentTopics = currentPost.topics || [];
  const currentConcepts = currentPost.concepts || [];

  // Get related posts from same category with matching tags/chapters/topics
  const relatedPosts = otherPosts.filter(p => 
    p.category === currentPost.category &&
    ((p.tags || []).some(tag => currentTags.includes(tag)) ||
     (p.chapters || []).some(chapter => currentChapters.includes(chapter)) ||
     (p.topics || []).some(topic => currentTopics.includes(topic)) ||
     (p.concepts || []).some(concept => currentConcepts.includes(concept)))
  ).slice(0, maxItems);

  // Get related chapters
  const relatedChapters = otherPosts.filter(p => 
    p.category === 'chapter' &&
    (p.chapters || []).some(chapter => currentChapters.includes(chapter))
  ).slice(0, maxItems);

  // Get related topics
  const relatedTopics = otherPosts.filter(p => 
    p.category === 'topic' &&
    (p.topics || []).some(topic => currentTopics.includes(topic))
  ).slice(0, maxItems);

  // Get related concepts
  const relatedConcepts = otherPosts.filter(p => 
    p.category === 'concept' &&
    (p.concepts || []).some(concept => currentConcepts.includes(concept))
  ).slice(0, maxItems);

  return {
    relatedPosts,
    relatedChapters,
    relatedTopics,
    relatedConcepts
  };
}

export function addIdsToContent(content: string): string {
  const idMap = new Map<string, number>();
  
  return content.replace(
    /<h([1-6])([^>]*)>(.*?)<\/h[1-6]>/gi,
    (match, level, attrs, text) => {
      const cleanText = text.replace(/<[^>]*>/g, '').trim();
      
      let baseId = cleanText
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'section';
      
      const count = idMap.get(baseId) ?? 0;
      idMap.set(baseId, count + 1);
      const uniqueId = count === 0 ? baseId : `${baseId}-${count}`;
      
      return `<h${level}${attrs} id="${uniqueId}">${text}</h${level}>`;
    }
  );
}