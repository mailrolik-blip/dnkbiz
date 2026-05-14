-- CreateTable
CREATE TABLE "LessonActivityEvent" (
    "id" SERIAL NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonActivityEvent_pkey" PRIMARY KEY ("id")
);

-- Backfill baseline activity from existing progress snapshots so the
-- dashboard keeps historical signals after the schema change.
INSERT INTO "LessonActivityEvent" ("userId", "lessonId", "completed", "createdAt")
SELECT
    "userId",
    "lessonId",
    "completed",
    COALESCE("lastViewedAt", "updatedAt")
FROM "LessonProgress";

-- CreateIndex
CREATE INDEX "LessonActivityEvent_userId_createdAt_idx" ON "LessonActivityEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LessonActivityEvent_lessonId_createdAt_idx" ON "LessonActivityEvent"("lessonId", "createdAt");

-- AddForeignKey
ALTER TABLE "LessonActivityEvent" ADD CONSTRAINT "LessonActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonActivityEvent" ADD CONSTRAINT "LessonActivityEvent_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
