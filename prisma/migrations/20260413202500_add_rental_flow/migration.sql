-- CreateEnum
CREATE TYPE "RentalSlotStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "RentalBookingStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "RentalFacility" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cityId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalResource" (
    "id" SERIAL NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "resourceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalSlot" (
    "id" SERIAL NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "RentalSlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalBooking" (
    "id" SERIAL NOT NULL,
    "slotId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "participantId" INTEGER,
    "status" "RentalBookingStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentalFacility_cityId_idx" ON "RentalFacility"("cityId");

-- CreateIndex
CREATE INDEX "RentalResource_facilityId_idx" ON "RentalResource"("facilityId");

-- CreateIndex
CREATE INDEX "RentalSlot_resourceId_idx" ON "RentalSlot"("resourceId");

-- CreateIndex
CREATE INDEX "RentalSlot_startsAt_idx" ON "RentalSlot"("startsAt");

-- CreateIndex
CREATE INDEX "RentalSlot_endsAt_idx" ON "RentalSlot"("endsAt");

-- CreateIndex
CREATE INDEX "RentalSlot_status_idx" ON "RentalSlot"("status");

-- CreateIndex
CREATE INDEX "RentalSlot_isPublic_idx" ON "RentalSlot"("isPublic");

-- CreateIndex
CREATE INDEX "RentalBooking_slotId_idx" ON "RentalBooking"("slotId");

-- CreateIndex
CREATE INDEX "RentalBooking_userId_idx" ON "RentalBooking"("userId");

-- CreateIndex
CREATE INDEX "RentalBooking_participantId_idx" ON "RentalBooking"("participantId");

-- CreateIndex
CREATE INDEX "RentalBooking_status_idx" ON "RentalBooking"("status");

-- AddForeignKey
ALTER TABLE "RentalFacility" ADD CONSTRAINT "RentalFacility_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalResource" ADD CONSTRAINT "RentalResource_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "RentalFacility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalSlot" ADD CONSTRAINT "RentalSlot_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "RentalResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalBooking" ADD CONSTRAINT "RentalBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "RentalSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalBooking" ADD CONSTRAINT "RentalBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalBooking" ADD CONSTRAINT "RentalBooking_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
