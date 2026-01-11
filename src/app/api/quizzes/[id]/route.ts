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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quizzes = getQuizzes();
    const quiz = quizzes.find(q => q.id === id);
    
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    return NextResponse.json(quiz);
  } catch (error) {
    console.error('Error in GET /api/quizzes/[id]:', error);
    return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updateData = await request.json();
    const quizzes = getQuizzes();
    const quizIndex = quizzes.findIndex(q => q.id === id);
    
    if (quizIndex === -1) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const existingQuiz = quizzes[quizIndex];
    
    // If it's a partial update (like status toggle), merge with existing data
    if (Object.keys(updateData).length <= 2 && ('isActive' in updateData || 'updatedAt' in updateData)) {
      const updatedQuiz = {
        ...existingQuiz,
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      quizzes[quizIndex] = updatedQuiz;
      saveQuizzes(quizzes);
      return NextResponse.json({ message: 'Quiz updated successfully', quiz: updatedQuiz });
    }

    // Full quiz update - validate required fields
    if (!updateData.title || !updateData.description || !updateData.questions?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updatedQuiz = {
      ...updateData,
      id: id, // Ensure ID doesn't change
      createdAt: existingQuiz.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString()
    };
    
    quizzes[quizIndex] = updatedQuiz;
    saveQuizzes(quizzes);

    return NextResponse.json({ message: 'Quiz updated successfully', quiz: updatedQuiz });
  } catch (error) {
    console.error('Error in PUT /api/quizzes/[id]:', error);
    return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quizzes = getQuizzes();
    const quizIndex = quizzes.findIndex(q => q.id === id);
    
    if (quizIndex === -1) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const deletedQuiz = quizzes.splice(quizIndex, 1)[0];
    saveQuizzes(quizzes);

    return NextResponse.json({ message: 'Quiz deleted successfully', quiz: deletedQuiz });
  } catch (error) {
    console.error('Error in DELETE /api/quizzes/[id]:', error);
    return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
  }
}