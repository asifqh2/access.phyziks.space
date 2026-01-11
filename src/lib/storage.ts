// src/lib/storage.ts
import fs from 'fs';
import path from 'path';
import { Post, Comment } from '@/types';
import { readPostsFromGitHub, writePostsToGitHub } from './github-storage';

const DATA_DIR = path.join(process.cwd(), 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Read posts from GitHub first, fallback to local file
export function readPosts(): Post[] {
  ensureDataDir();
  
  // Try to sync from GitHub first (but don't block)
  if (process.env.GITHUB_TOKEN && !fs.existsSync(POSTS_FILE)) {
    // Only try GitHub if local file doesn't exist
    try {
      readPostsFromGitHub().then(githubPosts => {
        if (githubPosts && githubPosts.length > 0) {
          fs.writeFileSync(POSTS_FILE, JSON.stringify(githubPosts, null, 2));
        }
      }).catch(error => {
        console.warn('GitHub read failed - using local storage:', error);
      });
    } catch (error) {
      console.warn('GitHub sync error - using local storage:', error);
    }
  }
  
  // Read from local file
  if (!fs.existsSync(POSTS_FILE)) {
    fs.writeFileSync(POSTS_FILE, JSON.stringify([]));
    return [];
  }
  const data = fs.readFileSync(POSTS_FILE, 'utf-8');
  return JSON.parse(data);
}

// Write posts to both GitHub and local file
export async function writePosts(posts: Post[]): Promise<void> {
  // Save to local file first
  ensureDataDir();
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
  console.log('Saved posts to local file');
  
  // Save to GitHub (optional - don't block if it fails)
  try {
    const success = await writePostsToGitHub(posts);
    if (success) {
      console.log('Successfully synced posts to GitHub');
    } else {
      console.warn('Failed to sync posts to GitHub - continuing with local storage');
    }
  } catch (error) {
    console.warn('GitHub sync error - continuing with local storage:', error);
  }
}

// Read comments from file
export function readComments(): Comment[] {
  ensureDataDir();
  if (!fs.existsSync(COMMENTS_FILE)) {
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify([]));
    return [];
  }
  const data = fs.readFileSync(COMMENTS_FILE, 'utf-8');
  return JSON.parse(data);
}

// Write comments to file
export function writeComments(comments: Comment[]): void {
  ensureDataDir();
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2));
}

// Generate unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
