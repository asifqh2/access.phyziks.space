// src/app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllPosts, getPublicPosts, createPost } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isSyllabus = searchParams.get('isSyllabus');
    const category = searchParams.get('category');
    const subject = searchParams.get('subject');
    const year = searchParams.get('year');
    const includeHidden = searchParams.get('includeHidden');
    
    let posts = includeHidden === 'true' ? await getAllPosts() : await getPublicPosts();
    
    // Filter by syllabus
    if (isSyllabus === 'true') {
      posts = posts.filter(p => p.isSyllabus);
    }
    
    // Filter by category
    if (category) {
      posts = posts.filter(p => p.category === category);
    }
    
    // Filter by subject
    if (subject) {
      posts = posts.filter(p => p.subject === subject);
    }
    
    // Filter by year
    if (year) {
      posts = posts.filter(p => p.year === parseInt(year));
    }
    
    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newPost = await createPost(body);
    return NextResponse.json({ message: 'Post created successfully', post: newPost }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}