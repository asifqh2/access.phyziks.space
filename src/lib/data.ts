// src/lib/data.ts
import { Post, Comment, SyllabusItem } from '@/types';
import { readPosts, writePosts, readComments, writeComments, generateId } from '@/lib/storage';
import { getAllPostsFromMDX, getPostBySlugFromMDX } from '@/lib/mdx-loader';

export async function getAllPosts(): Promise<Post[]> {
  try {
    // Get posts from MDX files
    const mdxPosts = getAllPostsFromMDX();
    
    // Get posts from JSON storage
    const jsonPosts = readPosts();
    
    // Combine both sources, MDX first, then sort by creation date
    const allPosts = [...mdxPosts, ...jsonPosts];
    return allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error fetching posts:', error);
    // Return only MDX posts if JSON fails
    return getAllPostsFromMDX();
  }
}

export async function getPublicPosts(): Promise<Post[]> {
  try {
    const allPosts = await getAllPosts();
    return allPosts.filter(post => !post.isHidden);
  } catch (error) {
    console.error('Error fetching public posts:', error);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    // Try MDX first
    const mdxPost = getPostBySlugFromMDX(slug);
    if (mdxPost && !mdxPost.isHidden) {
      return mdxPost;
    }
    
    // Then try JSON storage - get all posts and find by slug
    const allPosts = await getAllPosts();
    const post = allPosts.find(p => p.slug === slug && !p.isHidden);
    
    return post || null;
  } catch (error) {
    console.error('Error fetching post by slug:', error);
    return null;
  }
}

export async function getPostsByCategory(category: string): Promise<Post[]> {
  try {
    const posts = readPosts();
    return posts
      .filter(post => post.category === category && !post.isHidden)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error fetching posts by category:', error);
    return [];
  }
}

export async function getSyllabusStructure(): Promise<SyllabusItem[]> {
  try {
    // For now, return empty array - can be implemented later if needed
    return [];
  } catch (error) {
    console.error('Error fetching syllabus structure:', error);
    return [];
  }
}

export async function getCommentsByPostId(postId: string): Promise<Comment[]> {
  try {
    const comments = readComments();
    return comments
      .filter(comment => comment.postId === postId && comment.isApproved)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

export async function createComment(comment: Omit<Comment, 'id' | 'createdAt' | 'isApproved'>): Promise<Comment> {
  try {
    const comments = readComments();
    const newComment: Comment = {
      id: generateId(),
      postId: comment.postId,
      name: comment.name,
      email: comment.email,
      content: comment.content,
      createdAt: new Date().toISOString(),
      isApproved: true,
    };
    
    comments.push(newComment);
    writeComments(comments);
    
    return newComment;
  } catch (error) {
    console.error('Error creating comment:', error);
    throw error;
  }
}

export async function incrementPostViews(postId: string): Promise<void> {
  try {
    const posts = readPosts();
    const postIndex = posts.findIndex(p => p.id === postId);
    
    if (postIndex !== -1) {
      posts[postIndex].views = (posts[postIndex].views || 0) + 1;
      await writePosts(posts).catch(error => {
        console.warn('Failed to sync view count to GitHub - continuing:', error);
      });
    }
  } catch (error) {
    console.warn('Error incrementing views - continuing:', error);
  }
}

export async function searchPosts(query: string): Promise<Post[]> {
  try {
    const posts = readPosts();
    const lowerQuery = query.toLowerCase();
    
    return posts
      .filter(post => 
        !post.isHidden &&
        (post.title.toLowerCase().includes(lowerQuery) ||
        post.description.toLowerCase().includes(lowerQuery) ||
        post.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error searching posts:', error);
    return [];
  }
}

export async function createPost(postData: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>): Promise<Post> {
  try {
    const posts = readPosts();
    const newPost: Post = {
      ...postData,
      id: generateId(),
      views: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    posts.push(newPost);
    await writePosts(posts);
    
    return newPost;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
}

export async function updatePost(id: string, updates: Partial<Post>): Promise<Post | null> {
  try {
    const posts = readPosts();
    const postIndex = posts.findIndex(p => p.id === id);
    
    if (postIndex === -1) {
      return null;
    }
    
    posts[postIndex] = {
      ...posts[postIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    await writePosts(posts);
    return posts[postIndex];
  } catch (error) {
    console.error('Error updating post:', error);
    return null;
  }
}

export async function deletePost(id: string): Promise<boolean> {
  try {
    const posts = readPosts();
    const filteredPosts = posts.filter(p => p.id !== id);
    
    if (filteredPosts.length === posts.length) {
      return false; // Post not found
    }
    
    await writePosts(filteredPosts);
    return true;
  } catch (error) {
    console.error('Error deleting post:', error);
    return false;
  }
}