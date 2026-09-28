import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Quiz } from '@/types';

const QUIZZES_FILE = join(process.cwd(), 'data', 'quizzes.json');

function getQuizzes(): Quiz[] {
  try {
    if (!existsSync(QUIZZES_FILE)) {
      return [];
    }
    const data = readFileSync(QUIZZES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading quizzes:', error);
    return [];
  }
}

function saveQuizzes(quizzes: Quiz[]): void {
  try {
    writeFileSync(QUIZZES_FILE, JSON.stringify(quizzes, null, 2));
  } catch (error) {
    console.error('Error saving quizzes:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const quizzes = getQuizzes();
    return NextResponse.json(quizzes);
  } catch (error) {
    console.error('Error in GET /api/quizzes:', error);
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const quiz: Quiz = await request.json();
    
    if (!quiz.title || !quiz.description || !quiz.questions?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const quizzes = getQuizzes();
    quizzes.push(quiz);
    saveQuizzes(quizzes);

    return NextResponse.json({ message: 'Quiz created successfully', quiz }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/quizzes:', error);
    return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
  }
}