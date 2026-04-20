-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_userId_fkey";

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "jerseyNumber" INTEGER,
ADD COLUMN     "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "participantId" INTEGER,
ADD COLUMN     "positionCode" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "TeamMember_participantId_idx" ON "TeamMember"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_participantId_teamId_key" ON "TeamMember"("participantId", "teamId");

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
