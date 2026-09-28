-- AlterTable
ALTER TABLE "Chapter" ADD COLUMN     "b2VideoKey" TEXT;

-- AlterTable
ALTER TABLE "Subtopic" ADD COLUMN     "b2VideoKey" TEXT;

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "b2VideoKey" TEXT;

-- CreateTable
CREATE TABLE "VideoToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "topicId" TEXT,
    "subtopicId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoToken_token_key" ON "VideoToken"("token");

-- CreateIndex
CREATE INDEX "VideoToken_clerkUserId_idx" ON "VideoToken"("clerkUserId");

-- CreateIndex
CREATE INDEX "VideoToken_chapterId_idx" ON "VideoToken"("chapterId");

-- CreateIndex
CREATE INDEX "VideoToken_expiresAt_idx" ON "VideoToken"("expiresAt");
