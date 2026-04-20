import { Prisma, type PrismaClient, type StaffRole } from '@prisma/client';

import { HttpError } from './training-bookings';

export const GLOBAL_STAFF_ROLES: StaffRole[] = ['MANAGER', 'ADMIN'];

export type StaffPrisma = PrismaClient | Prisma.TransactionClient;

export type StaffAccessContext = {
  userId: number;
  staffRole: StaffRole | null;
  coachedTeamIds: number[];
  isGlobalStaff: boolean;
};

export async function getStaffAccessContext(
  prisma: StaffPrisma,
  userId: number
): Promise<StaffAccessContext> {
  const [user, coachedMemberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        staffRole: true,
      },
    }),
    prisma.teamMember.findMany({
      where: {
        userId,
        role: 'COACH',
      },
      select: {
        teamId: true,
      },
    }),
  ]);

  const staffRole = user?.staffRole ?? null;
  const coachedTeamIds = coachedMemberships.map((membership) => membership.teamId);
  const isGlobalStaff =
    staffRole !== null && GLOBAL_STAFF_ROLES.includes(staffRole);

  return {
    userId,
    staffRole,
    coachedTeamIds,
    isGlobalStaff,
  };
}

export async function assertStaffAccess(
  prisma: StaffPrisma,
  userId: number
) {
  const staffAccess = await getStaffAccessContext(prisma, userId);

  if (!staffAccess.isGlobalStaff && staffAccess.coachedTeamIds.length === 0) {
    throw new HttpError(403, 'Staff access required');
  }

  return staffAccess;
}

export async function assertGlobalStaffAccess(
  prisma: StaffPrisma,
  userId: number
) {
  const staffAccess = await getStaffAccessContext(prisma, userId);

  if (!staffAccess.isGlobalStaff || staffAccess.staffRole === null) {
    throw new HttpError(403, 'Staff access required');
  }

  return staffAccess.staffRole;
}
