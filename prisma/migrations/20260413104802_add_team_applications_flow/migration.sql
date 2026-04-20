-- CreateEnum
CREATE TYPE "TeamApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "TeamApplication" (
    "id" SERIAL NOT NULL,
    "participantId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "status" "TeamApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "commentFromApplicant" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamApplication_participantId_idx" ON "TeamApplication"("participantId");

-- CreateIndex
CREATE INDEX "TeamApplication_teamId_idx" ON "TeamApplication"("teamId");

-- CreateIndex
CREATE INDEX "TeamApplication_status_idx" ON "TeamApplication"("status");

-- AddForeignKey
ALTER TABLE "TeamApplication" ADD CONSTRAINT "TeamApplication_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamApplication" ADD CONSTRAINT "TeamApplication_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
