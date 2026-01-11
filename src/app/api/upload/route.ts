// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2-upload';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as 'pdfs' | 'word' | 'images';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file types
    const allowedTypes: Record<string, string[]> = {
      pdfs: ['application/pdf'],
      word: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    };

    if (!allowedTypes[folder]?.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Upload to R2
    const fileUrl = await uploadToR2(file, folder);

    return NextResponse.json({ url: fileUrl }, { status: 200 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}