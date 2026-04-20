import { Prisma, type PrismaClient } from '@prisma/client';

import { staffTrainingSelect } from './selects';
import { assertGlobalStaffAccess } from './staff';
import { HttpError } from './training-bookings';

type CreateTrainingByStaffInput = {
  currentUserId: number;
  name: string;
  description: string | null;
  trainingType: string;
  cityId: number;
  coachId: number | null;
  startTime: Date;
  endTime: Date;
  location: string;
  capacity?: number;
  isActive?: boolean;
};

type UpdateTrainingByStaffInput = {
  trainingId: number;
  currentUserId: number;
  name?: string;
  cityId?: number;
  coachId?: number | null;
  trainingType?: string;
  capacity?: number;
  isActive?: boolean;
};

type StaffTrainingRecord = Prisma.SchoolTrainingGetPayload<{
  select: typeof staffTrainingSelect;
}>;

function mapTrainingForStaff(training: StaffTrainingRecord) {
  return {
    id: training.trainingId,
    name: training.name,
    city: training.city,
    coach: training.trainer,
    trainingType: training.trainingType,
    capacity: training.capacity,
    isActive: training.isActive,
    createdAt: training.createdAt,
    updatedAt: training.updatedAt,
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

async function ensureCoachExists(
  tx: Prisma.TransactionClient,
  coachId: number | null
) {
  if (coachId === null) {
    return;
  }

  const coach = await tx.user.findUnique({
    where: { id: coachId },
    select: { id: true },
  });

  if (!coach) {
    throw new HttpError(404, 'Coach not found');
  }
}

export async function listTrainingsForStaff(
  prisma: PrismaClient,
  currentUserId: number
) {
  await assertGlobalStaffAccess(prisma, currentUserId);

  const trainings = await prisma.schoolTraining.findMany({
    select: staffTrainingSelect,
    orderBy: [
      {
        createdAt: 'desc',
      },
      {
        trainingId: 'desc',
      },
    ],
  });

  return trainings.map(mapTrainingForStaff);
}

export async function createTrainingByStaff(
  prisma: PrismaClient,
  input: CreateTrainingByStaffInput
) {
  const {
    currentUserId,
    name,
    description,
    trainingType,
    cityId,
    coachId,
    startTime,
    endTime,
    location,
    capacity,
    isActive,
  } = input;

  await assertGlobalStaffAccess(prisma, currentUserId);

  return prisma.$transaction(async (tx) => {
    await Promise.all([ensureCityExists(tx, cityId), ensureCoachExists(tx, coachId)]);

    const training = await tx.schoolTraining.create({
      data: {
        name,
        description,
        trainingType,
        startTime,
        endTime,
        location,
        city: {
          connect: { id: cityId },
        },
        ...(coachId !== null
          ? {
              trainer: {
                connect: { id: coachId },
              },
            }
          : {}),
        ...(capacity !== undefined ? { capacity } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      select: staffTrainingSelect,
    });

    return mapTrainingForStaff(training);
  });
}

export async function updateTrainingByStaff(
  prisma: PrismaClient,
  input: UpdateTrainingByStaffInput
) {
  const {
    trainingId,
    currentUserId,
    name,
    cityId,
    coachId,
    trainingType,
    capacity,
    isActive,
  } = input;

  await assertGlobalStaffAccess(prisma, currentUserId);

  return prisma.$transaction(async (tx) => {
    const existingTraining = await tx.schoolTraining.findUnique({
      where: { trainingId },
      select: { trainingId: true },
    });

    if (!existingTraining) {
      throw new HttpError(404, 'Training not found');
    }

    await Promise.all([
      cityId !== undefined ? ensureCityExists(tx, cityId) : Promise.resolve(),
      coachId !== undefined ? ensureCoachExists(tx, coachId) : Promise.resolve(),
    ]);

    const data: Prisma.SchoolTrainingUpdateInput = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (cityId !== undefined) {
      data.city = {
        connect: { id: cityId },
      };
    }

    if (coachId !== undefined) {
      data.trainer =
        coachId === null
          ? {
              disconnect: true,
            }
          : {
              connect: { id: coachId },
            };
    }

    if (trainingType !== undefined) {
      data.trainingType = trainingType;
    }

    if (capacity !== undefined) {
      data.capacity = capacity;
    }

    if (isActive !== undefined) {
      data.isActive = isActive;
    }

    const training = await tx.schoolTraining.update({
      where: { trainingId },
      data,
      select: staffTrainingSelect,
    });

    return mapTrainingForStaff(training);
  });
}
