// src/lib/mdx-loader.ts
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Post } from '@/types';

const postsDirectory = path.join(process.cwd(), 'src/content/posts');

export function getPostSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }
  return fs.readdirSync(postsDirectory).filter(file => file.endsWith('.mdx'));
}

export function getPostBySlugFromMDX(slug: string): Post | null {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.mdx`);
    
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    const post: Post = {
      id: data.id || slug,
      slug: slug,
      title: data.title,
      description: data.description,
      content: content, // MDX content
      category: data.category,
      topic: data.topic || null,
      tags: data.tags || [],
      chapters: data.chapters || [],
      topics: data.topics || [],
      concepts: data.concepts || [],
      year: data.year,
      subject: data.subject || '',
      youtubeUrl: data.youtubeUrl || '',
      pdfUrl: data.pdfUrl || '',
      wordUrl: data.wordUrl || '',
      images: data.images || [],
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      views: data.views || 0,
      isSyllabus: data.isSyllabus || false,
      syllabusPath: data.syllabusPath || '',
      autoCategorize: data.autoCategorize || {
        isLastYearPaper: false,
        isChapter: false,
        isTopic: false,
        isConcept: false,
      },
    };

    return post;
  } catch (error) {
    console.error(`Error loading MDX file for slug ${slug}:`, error);
    return null;
  }
}

export function getAllPostsFromMDX(): Post[] {
  const slugs = getPostSlugs();
  const posts = slugs
    .map(fileName => {
      const slug = fileName.replace(/\.mdx$/, '');
      return getPostBySlugFromMDX(slug);
    })
    .filter((post): post is Post => post !== null)
    .sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return posts;
}