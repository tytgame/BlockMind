-- AlterTable
ALTER TABLE "Block" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileType" TEXT,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "geminiExpiresAt" TIMESTAMP(3),
ADD COLUMN     "geminiFileUri" TEXT,
ALTER COLUMN "type" SET DEFAULT 'data';
