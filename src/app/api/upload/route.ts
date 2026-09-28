// src/app/api/upload/route.ts
//
// POST /api/upload
//
// Uploads a file to Cloudflare R2 and returns the object key.
//
// Security:
//   - Admin-only: requireAdmin() checks Clerk auth + ADMIN_CLERK_USER_IDS.
//   - Returns the R2 object KEY (not the public URL) so callers store the
//     key in the DB. The public URL is never stored; playback always goes
//     through /api/videos/[id]/play which generates a short-lived signed URL.
//   - File type validated against per-folder allowlists.
//   - Folder is validated against a strict set of allowed values.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { uploadToR2 } from '@/lib/r2-upload';

const ALLOWED_FOLDERS = ['pdfs', 'word', 'images', 'videos'] as const;
type UploadFolder = (typeof ALLOWED_FOLDERS)[number];

const ALLOWED_TYPES: Record<UploadFolder, string[]> = {
  videos: ['video/mp4', 'video/webm'],
  pdfs:   ['application/pdf'],
  word:   [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ],
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
};

export async function POST(request: NextRequest) {
  // ── 1. Admin-only ─────────────────────────────────────────────────────────
  const { error } = await requireAdmin();
  if (error) return error;

  // ── 2. Parse form data ────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const file   = formData.get('file')   as File | null;
  const folder = formData.get('folder') as string | null;

  if (!file || !file.size) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  // ── 3. Validate folder ────────────────────────────────────────────────────
  if (!folder || !(ALLOWED_FOLDERS as readonly string[]).includes(folder)) {
    return NextResponse.json(
      { error: `folder must be one of: ${ALLOWED_FOLDERS.join(', ')}` },
      { status: 400 },
    );
  }

  const typedFolder = folder as UploadFolder;

  // ── 4. Validate MIME type ─────────────────────────────────────────────────
  if (!ALLOWED_TYPES[typedFolder].includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type "${file.type}" for folder "${folder}".` },
      { status: 400 },
    );
  }

  // ── 5. Upload to R2 ───────────────────────────────────────────────────────
  try {
    const { key } = await uploadToR2(file, typedFolder);
    // Return the object KEY, not a public URL.
    // Callers must store the key and retrieve content via signed URL.
    return NextResponse.json({ key }, { status: 200 });
  } catch (err) {
    console.error('[upload] R2 upload failed:', err);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
