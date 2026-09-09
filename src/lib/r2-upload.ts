// src/lib/r2-upload.ts
//
// Cloudflare R2 upload helper.
//
// uploadToR2 returns BOTH the object key and the public URL.
//   key — store this in the DB (Chapter.videoKey). Used by signed URL generation.
//   url — a direct public URL. Only use for non-sensitive assets (images, PDFs).
//         Do NOT store video keys as public URLs — serve videos via signed URL only.

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export interface UploadResult {
  key: string;   // R2 object key — store in DB for signed URL generation
  url: string;   // public URL — only for non-sensitive assets
}

export async function uploadToR2(
  file: File,
  folder: 'pdfs' | 'word' | 'images' | 'videos',
): Promise<UploadResult> {
  const key = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  await r2Client.send(
    new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET_NAME!,
      Key:         key,
      Body:        buffer,
      ContentType: file.type,
    }),
  );

  const url = `${process.env.R2_PUBLIC_URL}/${key}`;
  return { key, url };
}

export async function deleteFromR2(keyOrUrl: string): Promise<void> {
  // Accept either a full public URL or a bare key
  const key = keyOrUrl.startsWith('http')
    ? keyOrUrl.replace(`${process.env.R2_PUBLIC_URL}/`, '')
    : keyOrUrl;

  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key:    key,
    }),
  );
}
