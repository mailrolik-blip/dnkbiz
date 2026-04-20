/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `City` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "SchoolTraining" DROP CONSTRAINT "SchoolTraining_trainerId_fkey";

-- AlterTable
ALTER TABLE "SchoolTraining" ALTER COLUMN "trainerId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "City_name_key" ON "City"("name");

-- CreateIndex
CREATE INDEX "SchoolTraining_cityId_idx" ON "SchoolTraining"("cityId");

-- AddForeignKey
ALTER TABLE "SchoolTraining" ADD CONSTRAINT "SchoolTraining_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
