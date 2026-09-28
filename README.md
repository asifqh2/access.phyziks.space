# Phyziks LMS

A Next.js 15 learning management system with secure video streaming, Razorpay payments, and Clerk authentication.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth | Clerk |
| Database | PostgreSQL via Prisma |
| Payments | Razorpay |
| Video (YouTube) | youtube-nocookie.com embed |
| Video (HLS) | Backblaze B2 → Cloudflare Worker → hls.js |
| Deployment | Vercel + Cloudflare Workers |

---

## Getting Started

### 1. Clone and install

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in every value:

```bash
cp .env.example .env
```

Key variables:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
ADMIN_CLERK_USER_IDS=user_abc,user_def

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...

# HLS Video (Backblaze B2 + Cloudflare Worker)
VIDEO_TOKEN_SECRET=<run: openssl rand -hex 32>
NEXT_PUBLIC_CDN_URL=https://cdn.phyziks.space
VIDEO_TOKEN_TTL_SECONDS=900
```

### 3. Database

```bash
npm run db:migrate    # apply migrations
npm run db:generate   # regenerate Prisma client
```

### 4. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Video Hosting Architecture

Videos are served through a secure pipeline that prevents direct access to B2:

```
Student (hls.js)
  → POST /api/videos/<chapterId>/token   (Next.js verifies purchase, signs JWT)
  → GET  https://cdn.phyziks.space/videos/<chapterId>/master.m3u8?token=<jwt>
  → Cloudflare Worker  (validates JWT, proxies from B2)
  → Backblaze B2       (private bucket — never directly accessible)
```

- Tokens are short-lived (15 min), bound to a specific chapter, and signed with HMAC-SHA256.
- The B2 bucket is private. Students never receive a direct B2 URL.
- ABR (Adaptive Bitrate) — 4 quality levels: 1080p / 720p / 480p / 360p.
- hls.js handles automatic quality switching based on available bandwidth.

---

## Uploading a New Video

Repeat these steps for every new chapter video.

### Step 1 — Find the chapter ID

```powershell
cd "d:\Asif\Projects\Educational app\educational-website-jsn - LMS"
npx tsx scripts/get-chapter-id.ts "Chapter Name"
```

Note the `id` from the output (e.g. `cmxyz123abc`).

### Step 2 — Encode to HLS with FFmpeg

Use `preset fast` for quicker encoding. `preset slow` gives slightly better compression but takes 3–4× longer.

```powershell
$id = "cmxyz123abc"
New-Item -ItemType Directory -Force -Path "D:\phyziks_videos\$id"
cd "D:\phyziks_videos\$id"

ffmpeg -y -i "D:\phyziks_videos\your-video.mp4" `
  -filter_complex "[0:v]split=4[v1][v2][v3][v4];[v1]scale=1920:1080[v1out];[v2]scale=1280:720[v2out];[v3]scale=854:480[v3out];[v4]scale=640:360[v4out]" `
  -map "[v1out]" -map 0:a -c:v:0 libx264 -crf 20 -preset fast -b:v:0 5000k -maxrate:v:0 5350k -bufsize:v:0 7500k -c:a:0 aac -b:a:0 192k `
  -map "[v2out]" -map 0:a -c:v:1 libx264 -crf 22 -preset fast -b:v:1 2800k -maxrate:v:1 2996k -bufsize:v:1 4200k -c:a:1 aac -b:a:1 128k `
  -map "[v3out]" -map 0:a -c:v:2 libx264 -crf 24 -preset fast -b:v:2 1400k -maxrate:v:2 1498k -bufsize:v:2 2100k -c:a:2 aac -b:a:2 128k `
  -map "[v4out]" -map 0:a -c:v:3 libx264 -crf 26 -preset fast -b:v:3 700k  -maxrate:v:3 749k  -bufsize:v:3 1050k -c:a:3 aac -b:a:3 96k `
  -f hls -hls_time 6 -hls_playlist_type vod -hls_flags independent_segments `
  -hls_segment_type mpegts `
  -hls_segment_filename "stream_%v/seg%03d.ts" `
  -master_pl_name "master.m3u8" `
  -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3" `
  stream_%v/index.m3u8
```

This produces 149 files (master.m3u8 + 4 stream folders with segments):

```
D:\phyziks_videos\<chapterId>\
├── master.m3u8
├── stream_0\   (1080p)
├── stream_1\   (720p)
├── stream_2\   (480p)
└── stream_3\   (360p)
```

### Step 3 — Upload to Backblaze B2

```powershell
$id = "cmxyz123abc"
cd "d:\Asif\Projects\Educational app\educational-website-jsn - LMS"
node scripts/upload-to-b2.mjs "D:\phyziks_videos\$id" "videos/$id"
```

The script automatically retries on B2 transient errors (up to 4 attempts with backoff).

### Step 4 — Set the database field

```powershell
npx tsx scripts/set-b2-video-key.ts cmxyz123abc
```

The chapter is live immediately. No server restart needed.

### Quick reference — Chapter video

| Step | Command | Duration |
|---|---|---|
| Find ID | `npx tsx scripts/get-chapter-id.ts "Name"` | ~2 sec |
| FFmpeg encode | `ffmpeg -y -i ... stream_%v/index.m3u8` | 5–30 min |
| Upload to B2 | `node scripts/upload-to-b2.mjs "D:\phyziks_videos\<id>" "videos/<id>"` | 1–5 min |
| Set DB field | `npx tsx scripts/set-b2-video-key.ts <chapterId>` | ~2 sec |

---

## Uploading Topic / Subtopic Videos

Videos can also be attached at the topic or subtopic level — they play when a student selects that item in the sidebar.

### B2 folder structure

```
phyziks-videos/
└── videos/
    └── <chapterId>/
        ├── master.m3u8              ← chapter-level video
        ├── stream_0/ ...
        ├── topics/
        │   └── <topicId>/
        │       ├── master.m3u8      ← topic-level video
        │       └── stream_0/ ...
        └── subtopics/
            └── <subtopicId>/
                ├── master.m3u8      ← subtopic-level video
                └── stream_0/ ...
```

### Step 1 — View all topics and subtopics for a chapter

```powershell
cd "d:\Asif\Projects\Educational app\educational-website-jsn - LMS"
npx tsx scripts/get-chapter-hierarchy.ts <chapterId>
```

This prints every topic and subtopic with their IDs and the exact B2 upload path for each.

Alternatively, search by name across all topics and subtopics:

```powershell
npx tsx scripts/get-topic-id.ts "Topic Name"
```

### Step 2 — Encode once, copy to all targets

If the same video is used for multiple topics/subtopics, **encode once and copy** — no need to re-encode.

```powershell
$chapterId  = "cmchapter456"
$topic1Id   = "cmtopic111"
$topic2Id   = "cmtopic222"
$subtopicId = "cmsubtopic333"

# Create all output folders
New-Item -ItemType Directory -Force -Path "D:\phyziks_videos\topics\$topic1Id"
New-Item -ItemType Directory -Force -Path "D:\phyziks_videos\topics\$topic2Id"
New-Item -ItemType Directory -Force -Path "D:\phyziks_videos\subtopics\$subtopicId"

# Encode into the first topic folder
cd "D:\phyziks_videos\topics\$topic1Id"
ffmpeg -y -i "D:\phyziks_videos\your-video.mp4" `
  -filter_complex "[0:v]split=4[v1][v2][v3][v4];[v1]scale=1920:1080[v1out];[v2]scale=1280:720[v2out];[v3]scale=854:480[v3out];[v4]scale=640:360[v4out]" `
  -map "[v1out]" -map 0:a -c:v:0 libx264 -crf 20 -preset fast -b:v:0 5000k -maxrate:v:0 5350k -bufsize:v:0 7500k -c:a:0 aac -b:a:0 192k `
  -map "[v2out]" -map 0:a -c:v:1 libx264 -crf 22 -preset fast -b:v:1 2800k -maxrate:v:1 2996k -bufsize:v:1 4200k -c:a:1 aac -b:a:1 128k `
  -map "[v3out]" -map 0:a -c:v:2 libx264 -crf 24 -preset fast -b:v:2 1400k -maxrate:v:2 1498k -bufsize:v:2 2100k -c:a:2 aac -b:a:2 128k `
  -map "[v4out]" -map 0:a -c:v:3 libx264 -crf 26 -preset fast -b:v:3 700k  -maxrate:v:3 749k  -bufsize:v:3 1050k -c:a:3 aac -b:a:3 96k `
  -f hls -hls_time 6 -hls_playlist_type vod -hls_flags independent_segments `
  -hls_segment_type mpegts `
  -hls_segment_filename "stream_%v/seg%03d.ts" `
  -master_pl_name "master.m3u8" `
  -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3" `
  stream_%v/index.m3u8

# Copy encoded output to remaining targets (saves encoding time)
Copy-Item -Path "D:\phyziks_videos\topics\$topic1Id\*" `
  -Destination "D:\phyziks_videos\topics\$topic2Id" -Recurse -Force
Copy-Item -Path "D:\phyziks_videos\topics\$topic1Id\*" `
  -Destination "D:\phyziks_videos\subtopics\$subtopicId" -Recurse -Force
```

If each topic has a **different** source video, encode each separately into its own folder.

### Step 3 — Upload each folder to B2

```powershell
cd "d:\Asif\Projects\Educational app\educational-website-jsn - LMS"

# Topics
node scripts/upload-to-b2.mjs "D:\phyziks_videos\topics\$topic1Id" "videos/$chapterId/topics/$topic1Id"
node scripts/upload-to-b2.mjs "D:\phyziks_videos\topics\$topic2Id" "videos/$chapterId/topics/$topic2Id"

# Subtopics
node scripts/upload-to-b2.mjs "D:\phyziks_videos\subtopics\$subtopicId" "videos/$chapterId/subtopics/$subtopicId"
```

### Step 4 — Set the DB fields

```powershell
# Topics
npx tsx scripts/set-b2-video-key-topic.ts topic    <topicId>

# Subtopics
npx tsx scripts/set-b2-video-key-topic.ts subtopic <subtopicId>
```

### Quick reference — Topic / Subtopic video

| Step | Command |
|---|---|
| View chapter hierarchy | `npx tsx scripts/get-chapter-hierarchy.ts <chapterId>` |
| Search by name | `npx tsx scripts/get-topic-id.ts "Name"` |
| Create folders | `New-Item -ItemType Directory -Force -Path "D:\phyziks_videos\topics\<id>"` |
| FFmpeg encode | `ffmpeg -y -i ... stream_%v/index.m3u8` (encode once, copy to others) |
| Copy encoded output | `Copy-Item -Path "...\<id>\*" -Destination "...\<otherId>" -Recurse -Force` |
| Upload topic | `node scripts/upload-to-b2.mjs "D:\...\topics\<id>" "videos/<chapterId>/topics/<id>"` |
| Upload subtopic | `node scripts/upload-to-b2.mjs "D:\...\subtopics\<id>" "videos/<chapterId>/subtopics/<id>"` |
| Set topic DB | `npx tsx scripts/set-b2-video-key-topic.ts topic <topicId>` |
| Set subtopic DB | `npx tsx scripts/set-b2-video-key-topic.ts subtopic <subtopicId>` |

---

## Cloudflare Worker

The Worker (`cloudflare-worker/worker.js`) validates JWT tokens and proxies B2 content.

### Initial deployment

```bash
cd cloudflare-worker
npm install
wrangler login
wrangler deploy
```

### Secrets

The Worker reads credentials from `wrangler.toml` `[vars]`. For production, move sensitive values to Wrangler secrets:

```bash
wrangler secret put TOKEN_SECRET      # must match VIDEO_TOKEN_SECRET in .env
wrangler secret put B2_APP_KEY_ID     # read-only B2 app key ID
wrangler secret put B2_APP_KEY        # read-only B2 app key secret
```

Then remove them from `wrangler.toml` and redeploy.

### Re-deploying after changes

```bash
cd cloudflare-worker
npx wrangler deploy
```

---

## Payments (Razorpay)

1. Create plans in the Razorpay dashboard.
2. Seed matching `Plan` rows in the database.
3. Register a webhook at `https://yourdomain.com/api/webhooks/razorpay` with events: `payment.captured`, `order.paid`, `payment.failed`.
4. Set `RAZORPAY_WEBHOOK_SECRET` in `.env` to match the webhook secret in Razorpay.

---

## Database Scripts

```bash
npm run db:migrate      # deploy pending migrations
npm run db:generate     # regenerate Prisma client after schema changes
npm run db:seed         # seed initial data
npm run db:reset        # reset and reseed (destructive — dev only)
```

---

## Deployment

### Vercel

Push to `main`. Set all `.env` variables in the Vercel project settings. The `postbuild` script runs `next-sitemap` automatically.

### Cron

Add to `vercel.json` to expire entitlements nightly:

```json
{
  "crons": [
    { "path": "/api/cron/expire-entitlements", "schedule": "0 0 * * *" }
  ]
}
```

Set `CRON_SECRET` in Vercel environment variables and pass it as `Authorization: Bearer <secret>` in the cron service.
