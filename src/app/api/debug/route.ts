// src/app/api/debug/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      status: 'success',
      message: 'Debug endpoint working',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function POST() {
  try {
    // Test creating a simple post
    const testData = [{
      id: 'debug-test',
      title: 'Debug Test Post',
      description: 'Testing production deployment',
      content: 'This is a test',
      category: 'test',
      tags: [],
      slug: 'debug-test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: 0
    }];

    return NextResponse.json({
      status: 'success',
      message: 'POST test successful',
      data: testData
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}