-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('TEST', 'MANUAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "OrderStatus" ADD VALUE 'FAILED';
ALTER TYPE "OrderStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "paymentFailureCode" TEXT,
ADD COLUMN     "paymentFailureText" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "providerPayload" JSONB,
ADD COLUMN     "statusText" TEXT;

-- CreateIndex
CREATE INDEX "Order_expiresAt_idx" ON "Order"("expiresAt");
