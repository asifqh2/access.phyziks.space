import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const FILE = join(process.cwd(), 'data', 'iit-questions.json');

function read() {
  if (!existsSync(FILE)) return [];
  try { return JSON.parse(readFileSync(FILE, 'utf8')); } catch { return []; }
}

function save(data: unknown[]) {
  writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export async function GET() {
  return NextResponse.json(read());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.exam || !body.patternId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const questions = read();
  const newQ = { ...body, id: Date.now().toString(), createdAt: new Date().toISOString() };
  questions.push(newQ);
  save(questions);
  return NextResponse.json(newQ, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;
  const questions = read().map((q: any) => q.id === id ? { ...q, ...updates } : q);
  save(questions);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const questions = read().filter((q: { id: string }) => q.id !== id);
  save(questions);
  return NextResponse.json({ success: true });
}
