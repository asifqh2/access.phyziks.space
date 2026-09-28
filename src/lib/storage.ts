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

// Read posts: always prefer GitHub when credentials are available
export async function readPosts(): Promise<Post[]> {
  if (process.env.GITHUB_TOKEN) {
    const githubPosts = await readPostsFromGitHub();
    if (githubPosts !== null) return githubPosts;
  }

  // Fallback to local file
  ensureDataDir();
  if (!fs.existsSync(POSTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8'));
}

// Write posts: GitHub is source of truth, local file is fallback
export async function writePosts(posts: Post[]): Promise<void> {
  if (process.env.GITHUB_TOKEN) {
    const success = await writePostsToGitHub(posts);
    if (success) {
      console.log('Successfully synced posts to GitHub');
      return;
    }
    console.warn('GitHub write failed - falling back to local file');
  }

  ensureDataDir();
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
  console.log('Saved posts to local file');
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
