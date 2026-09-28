// src/app/api/test-github/route.ts
import { NextResponse } from 'next/server';
import { readPostsFromGitHub, writePostsToGitHub } from '@/lib/github-storage';

export async function GET() {
  try {
    const posts = await readPostsFromGitHub();
    
    return NextResponse.json({
      status: 'success',
      message: 'GitHub integration working',
      postsCount: posts ? posts.length : 0,
      hasData: !!posts
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'GitHub integration failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}