// src/app/api/admin/video-upload/process/route.ts
//
// POST /api/admin/video-upload/process
//
// Starts a 3-step pipeline in the background and streams progress logs
// to the browser via Server-Sent Events (SSE):
//
//   Step 1 — FFmpeg: encode source MP4 → ABR HLS (4 quality levels)
//   Step 2 — B2 Upload: upload all HLS files to Backblaze B2
//   Step 3 — DB: set b2VideoKey on Chapter / Topic / Subtopic
//
// Request body:
//   {
//     videoPath:  string,   // full path to source .mp4, e.g. D:\phyziks_videos\lecture.mp4
//     kind:       'chapter' | 'topic' | 'subtopic',
//     chapterId:  string,
//     topicId?:   string,
//     subtopicId?: string,
//     b2Path:     string,   // e.g. videos/<chapterId>/master.m3u8
//   }
//
// SSE event format:  data: {"type":"log"|"done"|"error", "msg": string}\n\n

import { NextResponse }  from 'next/server';
import { requireAdmin }  from '@/lib/auth-helpers';
import { prisma }        from '@/lib/prisma';
import { spawn }         from 'child_process';
import { readdir, readFile, stat } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { createHmac, createHash } from 'crypto';
import { existsSync, mkdirSync }   from 'fs';

// ── B2 upload config (read from env) ─────────────────────────────────────────
const B2_KEY_ID  = process.env.B2_UPLOAD_KEY_ID  ?? process.env.B2_ACCESS_KEY_ID  ?? '';
const B2_APP_KEY = process.env.B2_UPLOAD_APP_KEY ?? process.env.B2_SECRET_ACCESS_KEY ?? '';
const B2_BUCKET  = process.env.B2_BUCKET_NAME    ?? process.env.R2_BUCKET_NAME    ?? 'phyziks-videos';
const B2_REGION  = process.env.B2_REGION         ?? 'eu-central-003';
const B2_HOST    = `${B2_BUCKET}.s3.${B2_REGION}.backblazeb2.com`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function sha256hex(data: Buffer | string) {
  return createHash('sha256').update(data).digest('hex');
}
function hmacBytes(key: Buffer | string, data: string) {
  return createHmac('sha256', key).update(data).digest();
}
function hmacHex(key: Buffer, data: string) {
  return createHmac('sha256', key).update(data).digest('hex');
}
function getSigningKey(dateStamp: string) {
  const kDate    = hmacBytes(`AWS4${B2_APP_KEY}`, dateStamp);
  const kRegion  = hmacBytes(kDate, B2_REGION);
  const kService = hmacBytes(kRegion, 's3');
  return hmacBytes(kService, 'aws4_request');
}
function mimeType(name: string) {
  if (name.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (name.endsWith('.ts'))   return 'video/mp2t';
  return 'application/octet-stream';
}

async function uploadFile(localPath: string, b2Key: string, retries = 4) {
  const body     = await readFile(localPath);
  const bodyHash = sha256hex(body);
  const mime     = mimeType(basename(localPath));

  for (let attempt = 1; attempt <= retries; attempt++) {
    const now       = new Date();
    const pad       = (n: number) => String(n).padStart(2, '0');
    const dateStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth()+1)}${pad(now.getUTCDate())}`;
    const timeStamp = `${dateStamp}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

    const encodedPath = `/${B2_BUCKET}/${b2Key.split('/').map(encodeURIComponent).join('/')}`;
    const canonicalHeaders =
      `content-type:${mime}\nhost:${B2_HOST}\nx-amz-content-sha256:${bodyHash}\nx-amz-date:${timeStamp}\n`;
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = ['PUT', encodedPath, '', canonicalHeaders, signedHeaders, bodyHash].join('\n');
    const credScope = `${dateStamp}/${B2_REGION}/s3/aws4_request`;
    const strToSign = ['AWS4-HMAC-SHA256', timeStamp, credScope, sha256hex(canonicalRequest)].join('\n');
    const sig  = hmacHex(getSigningKey(dateStamp) as Buffer, strToSign);
    const auth = `AWS4-HMAC-SHA256 Credential=${B2_KEY_ID}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${sig}`;

    const res = await fetch(`https://${B2_HOST}/${b2Key}`, {
      method: 'PUT',
      headers: {
        'Content-Type':         mime,
        'x-amz-date':           timeStamp,
        'x-amz-content-sha256': bodyHash,
        'Authorization':        auth,
        'Content-Length':       String(body.length),
      },
      body,
      // @ts-ignore
      duplex: 'half',
    });

    if (res.ok) return;

    const text = await res.text();
    if (attempt === retries) throw new Error(`B2 HTTP ${res.status}: ${text.slice(0, 200)}`);
    await new Promise(r => setTimeout(r, attempt * 2000));
  }
}

async function* walkDir(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkDir(full);
    else yield full;
  }
}

// ── Main POST handler ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: {
    videoPath:   string;
    kind:        'chapter' | 'topic' | 'subtopic';
    chapterId:   string;
    topicId?:    string;
    subtopicId?: string;
    b2Path:      string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { videoPath, kind, chapterId, topicId, subtopicId, b2Path } = body;

  if (!videoPath || !kind || !chapterId || !b2Path) {
    return NextResponse.json({ error: 'videoPath, kind, chapterId and b2Path are required.' }, { status: 400 });
  }

  // Validate video file exists
  if (!existsSync(videoPath)) {
    return NextResponse.json({ error: `Video file not found: ${videoPath}` }, { status: 400 });
  }

  // Build the output directory from the b2Path
  // b2Path = "videos/<chapterId>/master.m3u8"  →  outDir = D:\phyziks_videos\<chapterId>
  // b2Path = "videos/<chapterId>/topics/<topicId>/master.m3u8"  →  outDir = D:\phyziks_videos\topics\<topicId>
  const b2Dir    = dirname(b2Path);  // e.g. "videos/cmxxx/topics/cmyyy"
  const parts    = b2Dir.split('/'); // ['videos','cmxxx','topics','cmyyy']
  // Determine a sensible local output directory
  let localOutDir: string;
  if (parts.length === 2) {
    // chapter level: videos/<chapterId>
    localOutDir = `D:\\phyziks_videos\\${parts[1]}`;
  } else if (parts.length === 4 && parts[2] === 'topics') {
    localOutDir = `D:\\phyziks_videos\\topics\\${parts[3]}`;
  } else if (parts.length === 4 && parts[2] === 'subtopics') {
    localOutDir = `D:\\phyziks_videos\\subtopics\\${parts[3]}`;
  } else {
    localOutDir = `D:\\phyziks_videos\\${parts.join('_')}`;
  }

  // b2 prefix = everything before master.m3u8
  const b2Prefix = b2Dir; // "videos/cmxxx" or "videos/cmxxx/topics/cmyyy"

  // ── SSE stream ────────────────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(type: 'log' | 'done' | 'error', msg: string) {
        const line = `data: ${JSON.stringify({ type, msg })}\n\n`;
        controller.enqueue(encoder.encode(line));
      }

      try {
        // ── STEP 1: FFmpeg ─────────────────────────────────────────────────
        send('log', `📁 Output directory: ${localOutDir}`);

        if (!existsSync(localOutDir)) {
          mkdirSync(localOutDir, { recursive: true });
          send('log', `Created output directory.`);
        }

        send('log', `\n🎬 Step 1/3 — Encoding to HLS (4 quality levels)...`);

        await new Promise<void>((resolve, reject) => {
          const ffmpegArgs = [
            '-y',
            '-i', videoPath,
            '-filter_complex',
            '[0:v]split=4[v1][v2][v3][v4];[v1]scale=1920:1080[v1out];[v2]scale=1280:720[v2out];[v3]scale=854:480[v3out];[v4]scale=640:360[v4out]',
            '-map', '[v1out]', '-map', '0:a', '-c:v:0', 'libx264', '-crf', '20', '-preset', 'fast',
            '-b:v:0', '5000k', '-maxrate:v:0', '5350k', '-bufsize:v:0', '7500k', '-c:a:0', 'aac', '-b:a:0', '192k',
            '-map', '[v2out]', '-map', '0:a', '-c:v:1', 'libx264', '-crf', '22', '-preset', 'fast',
            '-b:v:1', '2800k', '-maxrate:v:1', '2996k', '-bufsize:v:1', '4200k', '-c:a:1', 'aac', '-b:a:1', '128k',
            '-map', '[v3out]', '-map', '0:a', '-c:v:2', 'libx264', '-crf', '24', '-preset', 'fast',
            '-b:v:2', '1400k', '-maxrate:v:2', '1498k', '-bufsize:v:2', '2100k', '-c:a:2', 'aac', '-b:a:2', '128k',
            '-map', '[v4out]', '-map', '0:a', '-c:v:3', 'libx264', '-crf', '26', '-preset', 'fast',
            '-b:v:3', '700k',  '-maxrate:v:3', '749k',  '-bufsize:v:3', '1050k', '-c:a:3', 'aac', '-b:a:3', '96k',
            '-f', 'hls',
            '-hls_time', '6',
            '-hls_playlist_type', 'vod',
            '-hls_flags', 'independent_segments',
            '-hls_segment_type', 'mpegts',
            '-hls_segment_filename', 'stream_%v/seg%03d.ts',
            '-master_pl_name', 'master.m3u8',
            '-var_stream_map', 'v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3',
            'stream_%v/index.m3u8',
          ];

          const ffmpeg = spawn('ffmpeg', ffmpegArgs, { cwd: localOutDir });

          // FFmpeg writes progress to stderr
          let lastFrame = '';
          ffmpeg.stderr.on('data', (chunk: Buffer) => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
              // Only forward frame= progress lines and errors, skip verbose codec info
              if (line.startsWith('frame=') || line.includes('Error') || line.includes('error')) {
                if (line !== lastFrame) {
                  send('log', line.trim());
                  lastFrame = line;
                }
              }
            }
          });

          ffmpeg.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`FFmpeg exited with code ${code}`));
          });
          ffmpeg.on('error', (err) => reject(new Error(`FFmpeg spawn error: ${err.message}`)));
        });

        send('log', `✅ Encoding complete.`);

        // Count output files
        const files: string[] = [];
        for await (const f of walkDir(localOutDir)) files.push(f);
        send('log', `   ${files.length} files generated.`);

        // ── STEP 2: B2 Upload ─────────────────────────────────────────────
        send('log', `\n☁️  Step 2/3 — Uploading to Backblaze B2...`);
        send('log', `   Bucket: ${B2_BUCKET}`);
        send('log', `   Prefix: ${b2Prefix}/`);

        let uploaded = 0;
        for (const localPath of files) {
          const rel   = localPath.replace(localOutDir, '').replace(/\\/g, '/').replace(/^\//, '');
          const b2Key = `${b2Prefix}/${rel}`;
          await uploadFile(localPath, b2Key);
          uploaded++;
          if (uploaded % 10 === 0 || uploaded === files.length) {
            send('log', `   [${uploaded}/${files.length}] uploaded`);
          }
        }

        send('log', `✅ Upload complete — ${uploaded} files.`);

        // ── STEP 3: Set DB field ───────────────────────────────────────────
        send('log', `\n💾 Step 3/3 — Setting database field...`);

        const b2VideoKey = b2Path; // e.g. "videos/cmxxx/master.m3u8"

        if (kind === 'chapter') {
          await prisma.chapter.update({
            where: { id: chapterId },
            data:  { b2VideoKey },
          });
          send('log', `   Chapter.b2VideoKey = "${b2VideoKey}"`);

        } else if (kind === 'topic' && topicId) {
          await prisma.topic.update({
            where: { id: topicId },
            data:  { b2VideoKey },
          });
          send('log', `   Topic.b2VideoKey = "${b2VideoKey}"`);

        } else if (kind === 'subtopic' && subtopicId) {
          await prisma.subtopic.update({
            where: { id: subtopicId },
            data:  { b2VideoKey },
          });
          send('log', `   Subtopic.b2VideoKey = "${b2VideoKey}"`);
        }

        send('log', `\n🎉 All done! Video is live.`);
        send('done', 'success');

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        send('error', msg);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}
