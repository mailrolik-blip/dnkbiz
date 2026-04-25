-- CreateTable
CREATE TABLE "ProgramRequest" (
    "id" SERIAL NOT NULL,
    "programSlug" TEXT NOT NULL,
    "programTitle" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "companyName" TEXT,
    "comment" TEXT,
    "isCompanyRequest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgramRequest_programSlug_createdAt_idx" ON "ProgramRequest"("programSlug", "createdAt");
