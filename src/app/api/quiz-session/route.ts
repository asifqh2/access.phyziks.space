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

export async function POST(request: NextRequest) {
  try {
    const { quizId, action } = await request.json();
    
    if (!quizId || !action) {
      return NextResponse.json({ error: 'Missing quizId or action' }, { status: 400 });
    }

    if (action !== 'start' && action !== 'stop') {
      return NextResponse.json({ error: 'Invalid action. Use "start" or "stop"' }, { status: 400 });
    }

    const quizzes = getQuizzes();
    const quizIndex = quizzes.findIndex(quiz => quiz.id === quizId);
    
    if (quizIndex === -1) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Update the quiz status
    quizzes[quizIndex].isActive = action === 'start';
    quizzes[quizIndex].updatedAt = new Date().toISOString();
    
    saveQuizzes(quizzes);

    return NextResponse.json({ 
      message: `Quiz ${action === 'start' ? 'started' : 'stopped'} successfully`,
      quiz: quizzes[quizIndex]
    });
  } catch (error) {
    console.error('Error in POST /api/quiz-session:', error);
    return NextResponse.json({ error: 'Failed to update quiz status' }, { status: 500 });
  }
}