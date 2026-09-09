-- AlterEnum
ALTER TYPE "PlanScopeType" ADD VALUE 'CHAPTER_COMBO';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "metadata" JSONB;
