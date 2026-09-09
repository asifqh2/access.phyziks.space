-- AlterTable
ALTER TABLE "Worksheet" ADD COLUMN     "chapterId" TEXT;

-- CreateIndex
CREATE INDEX "Worksheet_chapterId_idx" ON "Worksheet"("chapterId");

-- AddForeignKey
ALTER TABLE "Worksheet" ADD CONSTRAINT "Worksheet_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
