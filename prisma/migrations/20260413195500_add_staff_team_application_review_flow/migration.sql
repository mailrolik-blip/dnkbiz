-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('MANAGER', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "staffRole" "StaffRole";

-- AlterTable
ALTER TABLE "TeamApplication" ADD COLUMN "internalNote" TEXT;

-- AlterEnum
ALTER TYPE "TeamApplicationStatus" RENAME TO "TeamApplicationStatus_old";

CREATE TYPE "TeamApplicationStatus" AS ENUM (
    'PENDING',
    'IN_REVIEW',
    'ACCEPTED',
    'REJECTED',
    'CANCELLED'
);

ALTER TABLE "TeamApplication"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "TeamApplication"
ALTER COLUMN "status" TYPE "TeamApplicationStatus"
USING (
    CASE
        WHEN "status"::text = 'APPROVED' THEN 'ACCEPTED'
        ELSE "status"::text
    END
)::"TeamApplicationStatus";

ALTER TABLE "TeamApplication"
ALTER COLUMN "status" SET DEFAULT 'PENDING';

DROP TYPE "TeamApplicationStatus_old";
