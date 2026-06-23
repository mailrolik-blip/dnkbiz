-- CreateEnum
CREATE TYPE "AiAssistantRequestStatus" AS ENUM ('NEW', 'REVIEWED', 'IN_PROGRESS', 'READY', 'CLOSED');

-- CreateTable
CREATE TABLE "AiAssistantRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "pain" TEXT NOT NULL,
    "tasks" JSONB NOT NULL,
    "channels" JSONB NOT NULL,
    "comment" TEXT,
    "status" "AiAssistantRequestStatus" NOT NULL DEFAULT 'NEW',
    "n8nStatus" TEXT,
    "n8nResponse" JSONB,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAssistantRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiAssistantRequest_userId_createdAt_idx" ON "AiAssistantRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiAssistantRequest_status_createdAt_idx" ON "AiAssistantRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "AiAssistantRequest" ADD CONSTRAINT "AiAssistantRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
