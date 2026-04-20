-- AlterTable
ALTER TABLE "SchoolTraining" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "description" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TrainingBooking" (
    "id" SERIAL NOT NULL,
    "participantId" INTEGER NOT NULL,
    "trainingId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingBooking_participantId_idx" ON "TrainingBooking"("participantId");

-- CreateIndex
CREATE INDEX "TrainingBooking_trainingId_idx" ON "TrainingBooking"("trainingId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingBooking_participantId_trainingId_key" ON "TrainingBooking"("participantId", "trainingId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingBooking" ADD CONSTRAINT "TrainingBooking_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingBooking" ADD CONSTRAINT "TrainingBooking_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "SchoolTraining"("trainingId") ON DELETE RESTRICT ON UPDATE CASCADE;
