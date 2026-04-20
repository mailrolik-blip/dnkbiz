/*
  Warnings:

  - Added the required column `status` to the `TeamMember` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TeamMemberStatus" AS ENUM ('ACTIVE', 'INJURED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "TeamMember" DROP COLUMN "status",
ADD COLUMN     "status" "TeamMemberStatus" NOT NULL;

-- CreateIndex
CREATE INDEX "SchoolTraining_startTime_idx" ON "SchoolTraining"("startTime");

-- CreateIndex
CREATE INDEX "SchoolTraining_endTime_idx" ON "SchoolTraining"("endTime");
