/*
  Warnings:

  - The primary key for the `SchoolTraining` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `city_id` on the `SchoolTraining` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `SchoolTraining` table. All the data in the column will be lost.
  - You are about to drop the column `end_time` on the `SchoolTraining` table. All the data in the column will be lost.
  - You are about to drop the column `start_time` on the `SchoolTraining` table. All the data in the column will be lost.
  - You are about to drop the column `trainer_id` on the `SchoolTraining` table. All the data in the column will be lost.
  - You are about to drop the column `training_id` on the `SchoolTraining` table. All the data in the column will be lost.
  - You are about to drop the column `training_type` on the `SchoolTraining` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `SchoolTraining` table. All the data in the column will be lost.
  - Added the required column `cityId` to the `SchoolTraining` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endTime` to the `SchoolTraining` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `SchoolTraining` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trainerId` to the `SchoolTraining` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trainingType` to the `SchoolTraining` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SchoolTraining` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SchoolTraining" DROP CONSTRAINT "SchoolTraining_pkey",
DROP COLUMN "city_id",
DROP COLUMN "created_at",
DROP COLUMN "end_time",
DROP COLUMN "start_time",
DROP COLUMN "trainer_id",
DROP COLUMN "training_id",
DROP COLUMN "training_type",
DROP COLUMN "updated_at",
ADD COLUMN     "cityId" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "trainerId" INTEGER NOT NULL,
ADD COLUMN     "trainingId" SERIAL NOT NULL,
ADD COLUMN     "trainingType" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "SchoolTraining_pkey" PRIMARY KEY ("trainingId");
