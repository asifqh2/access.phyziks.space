// src/app/api/debug/route.ts
import { NextResponse } from 'next/server';
import { readPostsFromGitHub } from '@/lib/github-storage';

export async function GET() {
  const hasToken = !!process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  let githubStatus = 'skipped - no token';
  let postsCount = 0;

  if (hasToken) {
    try {
      const posts = await readPostsFromGitHub();
      postsCount = posts ? posts.length : 0;
      githubStatus = posts !== null ? 'connected' : 'failed';
    } catch (e) {
      githubStatus = `error: ${e instanceof Error ? e.message : 'unknown'}`;
    }
  }

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    github: { hasToken, owner, repo, status: githubStatus, postsCount },
    timestamp: new Date().toISOString(),
  });
}