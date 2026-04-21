-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "homeworkOptions" JSONB,
ADD COLUMN     "homeworkPrompt" TEXT,
ADD COLUMN     "homeworkTitle" TEXT,
ADD COLUMN     "homeworkType" TEXT,
ADD COLUMN     "videoProvider" TEXT,
ADD COLUMN     "videoUrl" TEXT;
