import { Prisma, type PrismaClient, type TeamMemberStatus } from '@prisma/client';

import { staffTeamMemberSelect } from './selects';
import { assertGlobalStaffAccess } from './staff';
import { HttpError } from './training-bookings';

type CreateTeamMemberByStaffInput = {
  currentUserId: number;
  teamId: number;
  participantId: number;
  status: TeamMemberStatus;
  positionCode?: string | null;
  jerseyNumber?: number | null;
  joinedAt?: Date;
};

type UpdateTeamMemberByStaffInput = {
  teamMemberId: number;
  currentUserId: number;
  status?: TeamMemberStatus;
  positionCode?: string | null;
  jerseyNumber?: number | null;
  joinedAt?: Date;
};

type CreateTeamMemberFromAcceptedApplicationByStaffInput = {
  applicationId: number;
  currentUserId: number;
  status?: TeamMemberStatus;
  positionCode?: string | null;
  jerseyNumber?: number | null;
  joinedAt?: Date;
};

type ListTeamMembersForStaffInput = {
  currentUserId: number;
  teamId?: number;
};

type StaffTeamMemberRecord = Prisma.TeamMemberGetPayload<{
  select: typeof staffTeamMemberSelect;
}>;

function mapTeamMemberForStaff(teamMember: StaffTeamMemberRecord) {
  return {
    id: teamMember.id,
    team: teamMember.team,
    participant: teamMember.participant,
    status: teamMember.status,
    positionCode: teamMember.positionCode,
    jerseyNumber: teamMember.jerseyNumber,
    joinedAt: teamMember.joinedAt,
    createdAt: teamMember.createdAt,
    updatedAt: teamMember.updatedAt,
  };
}

async function ensureTeamExists(tx: Prisma.TransactionClient, teamId: number) {
  const team = await tx.team.findUnique({
    where: { id: teamId },
    select: { id: true },
  });

  if (!team) {
    throw new HttpError(404, 'Team not found');
  }
}

async function ensureParticipantExists(
  tx: Prisma.TransactionClient,
  participantId: number
) {
  const participant = await tx.userProfile.findUnique({
    where: { id: participantId },
    select: { id: true },
  });

  if (!participant) {
    throw new HttpError(404, 'Participant not found');
  }
}

async function ensureNoExistingParticipantMembership(
  tx: Prisma.TransactionClient,
  teamId: number,
  participantId: number
) {
  const existingMembership = await tx.teamMember.findFirst({
    where: {
      teamId,
      participantId,
    },
    select: {
      id: true,
    },
  });

  if (existingMembership) {
    throw new HttpError(409, 'Team member already exists');
  }
}

async function createParticipantTeamMember(
  tx: Prisma.TransactionClient,
  input: {
    teamId: number;
    participantId: number;
    status: TeamMemberStatus;
    positionCode?: string | null;
    jerseyNumber?: number | null;
    joinedAt?: Date;
  }
) {
  const { teamId, participantId, status, positionCode, jerseyNumber, joinedAt } =
    input;

  await Promise.all([
    ensureTeamExists(tx, teamId),
    ensureParticipantExists(tx, participantId),
    ensureNoExistingParticipantMembership(tx, teamId, participantId),
  ]);

  const teamMember = await tx.teamMember.create({
    data: {
      team: {
        connect: { id: teamId },
      },
      participant: {
        connect: { id: participantId },
      },
      role: 'PLAYER',
      status,
      ...(positionCode !== undefined ? { positionCode } : {}),
      ...(jerseyNumber !== undefined ? { jerseyNumber } : {}),
      ...(joinedAt !== undefined ? { joinedAt } : {}),
    },
    select: staffTeamMemberSelect,
  });

  return mapTeamMemberForStaff(teamMember);
}

export async function listTeamMembersForStaff(
  prisma: PrismaClient,
  input: ListTeamMembersForStaffInput
) {
  const { currentUserId, teamId } = input;

  await assertGlobalStaffAccess(prisma, currentUserId);

  const teamMembers = await prisma.teamMember.findMany({
    where: {
      participantId: {
        not: null,
      },
      ...(teamId !== undefined ? { teamId } : {}),
    },
    select: staffTeamMemberSelect,
    orderBy: [
      {
        createdAt: 'desc',
      },
      {
        id: 'desc',
      },
    ],
  });

  return teamMembers.map(mapTeamMemberForStaff);
}

export async function createTeamMemberByStaff(
  prisma: PrismaClient,
  input: CreateTeamMemberByStaffInput
) {
  const {
    currentUserId,
    teamId,
    participantId,
    status,
    positionCode,
    jerseyNumber,
    joinedAt,
  } = input;

  await assertGlobalStaffAccess(prisma, currentUserId);

  return prisma.$transaction((tx) =>
    createParticipantTeamMember(tx, {
      teamId,
      participantId,
      status,
      ...(positionCode !== undefined ? { positionCode } : {}),
      ...(jerseyNumber !== undefined ? { jerseyNumber } : {}),
      ...(joinedAt !== undefined ? { joinedAt } : {}),
    })
  );
}

export async function updateTeamMemberByStaff(
  prisma: PrismaClient,
  input: UpdateTeamMemberByStaffInput
) {
  const {
    teamMemberId,
    currentUserId,
    status,
    positionCode,
    jerseyNumber,
    joinedAt,
  } = input;

  await assertGlobalStaffAccess(prisma, currentUserId);

  const existingTeamMember = await prisma.teamMember.findFirst({
    where: {
      id: teamMemberId,
      participantId: {
        not: null,
      },
    },
    select: {
      id: true,
    },
  });

  if (!existingTeamMember) {
    throw new HttpError(404, 'Team member not found');
  }

  const data: Prisma.TeamMemberUpdateInput = {};

  if (status !== undefined) {
    data.status = status;
  }

  if (positionCode !== undefined) {
    data.positionCode = positionCode;
  }

  if (jerseyNumber !== undefined) {
    data.jerseyNumber = jerseyNumber;
  }

  if (joinedAt !== undefined) {
    data.joinedAt = joinedAt;
  }

  const teamMember = await prisma.teamMember.update({
    where: { id: teamMemberId },
    data,
    select: staffTeamMemberSelect,
  });

  return mapTeamMemberForStaff(teamMember);
}

export async function createTeamMemberFromAcceptedApplicationByStaff(
  prisma: PrismaClient,
  input: CreateTeamMemberFromAcceptedApplicationByStaffInput
) {
  const {
    applicationId,
    currentUserId,
    status = 'ACTIVE',
    positionCode,
    jerseyNumber,
    joinedAt,
  } = input;

  await assertGlobalStaffAccess(prisma, currentUserId);

  return prisma.$transaction(async (tx) => {
    const application = await tx.teamApplication.findUnique({
      where: { id: applicationId },
      select: {
        participantId: true,
        teamId: true,
        status: true,
      },
    });

    if (!application) {
      throw new HttpError(404, 'Team application not found');
    }

    if (application.status !== 'ACCEPTED') {
      throw new HttpError(409, 'Team application must be ACCEPTED');
    }

    return createParticipantTeamMember(tx, {
      teamId: application.teamId,
      participantId: application.participantId,
      status,
      ...(positionCode !== undefined ? { positionCode } : {}),
      ...(jerseyNumber !== undefined ? { jerseyNumber } : {}),
      ...(joinedAt !== undefined ? { joinedAt } : {}),
    });
  });
}
