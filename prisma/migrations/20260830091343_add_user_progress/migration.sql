-- CreateTable
CREATE TABLE "UserProgress" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "topicId" TEXT,
    "subtopicId" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserProgress_clerkUserId_idx" ON "UserProgress"("clerkUserId");

-- CreateIndex
CREATE INDEX "UserProgress_topicId_idx" ON "UserProgress"("topicId");

-- CreateIndex
CREATE INDEX "UserProgress_subtopicId_idx" ON "UserProgress"("subtopicId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProgress_clerkUserId_topicId_key" ON "UserProgress"("clerkUserId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProgress_clerkUserId_subtopicId_key" ON "UserProgress"("clerkUserId", "subtopicId");

-- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
