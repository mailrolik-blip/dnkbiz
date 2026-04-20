import { Prisma, type PrismaClient, type TeamApplicationStatus } from '@prisma/client';

import {
  adminTeamApplicationSelect,
  myTeamApplicationSelect,
  staffTeamApplicationSelect,
} from './selects';
import { assertGlobalStaffAccess, assertStaffAccess, type StaffAccessContext } from './staff';
import { HttpError } from './training-bookings';

type CreateTeamApplicationInput = {
  currentUserId: number;
  participantId: number;
  teamId: number;
  commentFromApplicant: string | null;
};

type UpdateTeamApplicationByStaffInput = {
  applicationId: number;
  currentUserId: number;
  status?: StaffManagedTeamApplicationStatus;
  internalNote?: string | null;
};

type ListTeamApplicationsForAdminInput = {
  currentUserId: number;
  teamId?: number;
  status?: TeamApplicationStatus;
};

type UpdateTeamApplicationByAdminInput = UpdateTeamApplicationByStaffInput;

export type StaffManagedTeamApplicationStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED';

const ACTIVE_TEAM_APPLICATION_STATUSES: TeamApplicationStatus[] = [
  'PENDING',
  'IN_REVIEW',
  'ACCEPTED',
];

function getVisibleTeamApplicationsWhere(
  staffAccess: StaffAccessContext
): Prisma.TeamApplicationWhereInput {
  if (staffAccess.isGlobalStaff) {
    return {};
  }

  return {
    teamId: {
      in: staffAccess.coachedTeamIds,
    },
  };
}

export async function createTeamApplication(
  prisma: PrismaClient,
  input: CreateTeamApplicationInput
) {
  const { currentUserId, participantId, teamId, commentFromApplicant } = input;

  return prisma.$transaction(
    async (tx) => {
      const participant = await tx.userProfile.findFirst({
        where: {
          id: participantId,
          userId: currentUserId,
        },
        select: {
          id: true,
        },
      });

      if (!participant) {
        throw new HttpError(404, 'Participant not found');
      }

      const team = await tx.team.findUnique({
        where: { id: teamId },
        select: {
          id: true,
        },
      });

      if (!team) {
        throw new HttpError(404, 'Team not found');
      }

      const existingActiveApplication = await tx.teamApplication.findFirst({
        where: {
          participantId,
          teamId,
          status: {
            in: ACTIVE_TEAM_APPLICATION_STATUSES,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingActiveApplication) {
        throw new HttpError(409, 'Active team application already exists');
      }

      return tx.teamApplication.create({
        data: {
          participantId,
          teamId,
          status: 'PENDING',
          commentFromApplicant,
        },
        select: myTeamApplicationSelect,
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}

export async function listTeamApplicationsForUser(
  prisma: PrismaClient,
  userId: number
) {
  return prisma.teamApplication.findMany({
    where: {
      participant: {
        userId,
      },
    },
    select: myTeamApplicationSelect,
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function cancelTeamApplicationForUser(
  prisma: PrismaClient,
  applicationId: number,
  userId: number
) {
  const application = await prisma.teamApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      status: true,
      participant: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!application || application.participant.userId !== userId) {
    throw new HttpError(404, 'Team application not found');
  }

  if (application.status === 'CANCELLED') {
    throw new HttpError(409, 'Team application is already cancelled');
  }

  return prisma.teamApplication.update({
    where: { id: applicationId },
    data: {
      status: 'CANCELLED',
    },
    select: myTeamApplicationSelect,
  });
}

export async function listTeamApplicationsForStaff(
  prisma: PrismaClient,
  userId: number
) {
  const staffAccess = await assertStaffAccess(prisma, userId);

  return prisma.teamApplication.findMany({
    where: getVisibleTeamApplicationsWhere(staffAccess),
    select: staffTeamApplicationSelect,
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function listTeamApplicationsForAdmin(
  prisma: PrismaClient,
  input: ListTeamApplicationsForAdminInput
) {
  const { currentUserId, teamId, status } = input;

  await assertGlobalStaffAccess(prisma, currentUserId);

  return prisma.teamApplication.findMany({
    where: {
      ...(teamId !== undefined ? { teamId } : {}),
      ...(status !== undefined ? { status } : {}),
    },
    select: adminTeamApplicationSelect,
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function updateTeamApplicationByStaff(
  prisma: PrismaClient,
  input: UpdateTeamApplicationByStaffInput
) {
  const { applicationId, currentUserId, status, internalNote } = input;
  const staffAccess = await assertStaffAccess(prisma, currentUserId);

  const application = await prisma.teamApplication.findFirst({
    where: {
      id: applicationId,
      ...getVisibleTeamApplicationsWhere(staffAccess),
    },
    select: {
      id: true,
    },
  });

  if (!application) {
    throw new HttpError(404, 'Team application not found');
  }

  const data: Prisma.TeamApplicationUpdateInput = {};

  if (status !== undefined) {
    data.status = status;
  }

  if (internalNote !== undefined) {
    data.internalNote = internalNote;
  }

  if (status !== undefined || internalNote !== undefined) {
    data.reviewedBy = {
      connect: { id: currentUserId },
    };
  }

  return prisma.teamApplication.update({
    where: { id: applicationId },
    data,
    select: staffTeamApplicationSelect,
  });
}

export async function updateTeamApplicationByAdmin(
  prisma: PrismaClient,
  input: UpdateTeamApplicationByAdminInput
) {
  const { applicationId, currentUserId } = input;

  await assertGlobalStaffAccess(prisma, currentUserId);
  await updateTeamApplicationByStaff(prisma, input);

  const application = await prisma.teamApplication.findUnique({
    where: { id: applicationId },
    select: adminTeamApplicationSelect,
  });

  if (!application) {
    throw new HttpError(500, 'Team application was not updated');
  }

  return application;
}
