import { Prisma, type PrismaClient } from '@prisma/client';

import { adminTeamSelect } from './selects';
import { assertGlobalStaffAccess } from './staff';
import { HttpError } from './training-bookings';

type CreateTeamByStaffInput = {
  currentUserId: number;
  name: string;
  slug: string;
  cityId: number;
  description?: string | null;
};

type UpdateTeamByStaffInput = {
  teamId: number;
  currentUserId: number;
  name?: string;
  slug?: string;
  cityId?: number;
  description?: string | null;
};

type AdminTeamRecord = Prisma.TeamGetPayload<{
  select: typeof adminTeamSelect;
}>;

function mapTeamForAdmin(team: AdminTeamRecord) {
  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    city: team.city,
    description: team.description,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

async function ensureCityExists(tx: Prisma.TransactionClient, cityId: number) {
  const city = await tx.city.findUnique({
    where: { id: cityId },
    select: { id: true },
  });

  if (!city) {
    throw new HttpError(404, 'City not found');
  }
}

async function ensureTeamSlugIsAvailable(
  tx: Prisma.TransactionClient,
  slug: string,
  excludeTeamId?: number
) {
  const existingTeam = await tx.team.findFirst({
    where: {
      slug,
      ...(excludeTeamId !== undefined
        ? {
            id: {
              not: excludeTeamId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  if (existingTeam) {
    throw new HttpError(409, 'Team slug is already in use');
  }
}

export async function listTeamsForStaff(
  prisma: PrismaClient,
  currentUserId: number
) {
  await assertGlobalStaffAccess(prisma, currentUserId);

  const teams = await prisma.team.findMany({
    select: adminTeamSelect,
    orderBy: [
      {
        createdAt: 'desc',
      },
      {
        id: 'desc',
      },
    ],
  });

  return teams.map(mapTeamForAdmin);
}

export async function createTeamByStaff(
  prisma: PrismaClient,
  input: CreateTeamByStaffInput
) {
  const { currentUserId, name, slug, cityId, description } = input;

  await assertGlobalStaffAccess(prisma, currentUserId);

  return prisma.$transaction(async (tx) => {
    await Promise.all([
      ensureCityExists(tx, cityId),
      ensureTeamSlugIsAvailable(tx, slug),
    ]);

    const team = await tx.team.create({
      data: {
        name,
        slug,
        ...(description !== undefined ? { description } : {}),
        city: {
          connect: { id: cityId },
        },
      },
      select: adminTeamSelect,
    });

    return mapTeamForAdmin(team);
  });
}

export async function updateTeamByStaff(
  prisma: PrismaClient,
  input: UpdateTeamByStaffInput
) {
  const { teamId, currentUserId, name, slug, cityId, description } = input;

  await assertGlobalStaffAccess(prisma, currentUserId);

  return prisma.$transaction(async (tx) => {
    const existingTeam = await tx.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
      },
    });

    if (!existingTeam) {
      throw new HttpError(404, 'Team not found');
    }

    await Promise.all([
      cityId !== undefined ? ensureCityExists(tx, cityId) : Promise.resolve(),
      slug !== undefined
        ? ensureTeamSlugIsAvailable(tx, slug, teamId)
        : Promise.resolve(),
    ]);

    const data: Prisma.TeamUpdateInput = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (slug !== undefined) {
      data.slug = slug;
    }

    if (cityId !== undefined) {
      data.city = {
        connect: { id: cityId },
      };
    }

    if (description !== undefined) {
      data.description = description;
    }

    const team = await tx.team.update({
      where: { id: teamId },
      data,
      select: adminTeamSelect,
    });

    return mapTeamForAdmin(team);
  });
}
