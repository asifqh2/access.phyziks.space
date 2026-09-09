-- AlterTable: add video content fields to Chapter
-- videoKey   — R2/S3 object key for protected video (signed URL on playback)
-- youtubeUrl — public YouTube URL for free preview content
-- description — short chapter description shown on cards

ALTER TABLE "Chapter" ADD COLUMN "videoKey"    TEXT;
ALTER TABLE "Chapter" ADD COLUMN "youtubeUrl"  TEXT;
ALTER TABLE "Chapter" ADD COLUMN "description" TEXT;
