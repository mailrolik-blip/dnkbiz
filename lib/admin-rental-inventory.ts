import { Prisma, type PrismaClient } from '@prisma/client';

import {
  staffRentalFacilitySelect,
  staffRentalResourceSelect,
} from './selects';
import { assertGlobalStaffAccess } from './staff';
import { HttpError } from './training-bookings';

type CreateRentalFacilityByStaffInput = {
  currentUserId: number;
  cityId: number;
  name: string;
};

type UpdateRentalFacilityByStaffInput = {
  facilityId: number;
  currentUserId: number;
  cityId?: number;
  name?: string;
};

type CreateRentalResourceByStaffInput = {
  currentUserId: number;
  facilityId: number;
  name: string;
  type: string;
};

type UpdateRentalResourceByStaffInput = {
  resourceId: number;
  currentUserId: number;
  facilityId?: number;
  name?: string;
  type?: string | null;
};

type StaffRentalFacilityRecord = Prisma.RentalFacilityGetPayload<{
  select: typeof staffRentalFacilitySelect;
}>;

type StaffRentalResourceRecord = Prisma.RentalResourceGetPayload<{
  select: typeof staffRentalResourceSelect;
}>;

function mapRentalFacilityForStaff(facility: StaffRentalFacilityRecord) {
  return {
    id: facility.id,
    name: facility.name,
    city: facility.city,
    createdAt: facility.createdAt,
    updatedAt: facility.updatedAt,
  };
}

function mapRentalResourceForStaff(resource: StaffRentalResourceRecord) {
  return {
    id: resource.id,
    facility: resource.facility,
    name: resource.name,
    type: resource.resourceType,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
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

async function ensureRentalFacilityExists(
  tx: Prisma.TransactionClient,
  facilityId: number
) {
  const facility = await tx.rentalFacility.findUnique({
    where: { id: facilityId },
    select: { id: true },
  });

  if (!facility) {
    throw new HttpError(404, 'Rental facility not found');
  }
}

export async function listRentalFacilitiesForStaff(
  prisma: PrismaClient,
  currentUserId: number
) {
  await assertGlobalStaffAccess(prisma, currentUserId);

  const facilities = await prisma.rentalFacility.findMany({
    select: staffRentalFacilitySelect,
    orderBy: [
      {
        createdAt: 'desc',
      },
      {
        id: 'desc',
      },
    ],
  });

  return facilities.map(mapRentalFacilityForStaff);
}

export async function createRentalFacilityByStaff(
  prisma: PrismaClient,
  input: CreateRentalFacilityByStaffInput
) {
  const { currentUserId, cityId, name } = input;

  await assertGlobalStaffAccess(prisma, currentUserId);

  return prisma.$transaction(async (tx) => {
    await ensureCityExists(tx, cityId);

    const facility = await tx.rentalFacility.create({
      data: {
        name,
        city: {
          connect: { id: cityId },
        },
      },
      select: staffRentalFacilitySelect,
    });

    return mapRentalFacilityForStaff(facility);
  });
}

export async function updateRentalFacilityByStaff(
  prisma: PrismaClient,
  input: UpdateRentalFacilityByStaffInput
) {
  const { facilityId, currentUserId, cityId, name } = input;

  await assertGlobalStaffAccess(prisma, currentUserId);

  return prisma.$transaction(async (tx) => {
    const existingFacility = await tx.rentalFacility.findUnique({
      where: { id: facilityId },
      select: { id: true },
    });

    if (!existingFacility) {
      throw new HttpError(404, 'Rental facility not found');
    }

    if (cityId !== undefined) {
      await ensureCityExists(tx, cityId);
    }

    const data: Prisma.RentalFacilityUpdateInput = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (cityId !== undefined) {
      data.city = {
        connect: { id: cityId },
      };
    }

    const facility = await tx.rentalFacility.update({
      where: { id: facilityId },
      data,
      select: staffRentalFacilitySelect,
    });

    return mapRentalFacilityForStaff(facility);
  });
}

export async function listRentalResourcesForStaff(
  prisma: PrismaClient,
  currentUserId: number
) {
  await assertGlobalStaffAccess(prisma, currentUserId);

  const resources = await prisma.rentalResource.findMany({
    select: staffRentalResourceSelect,
    orderBy: [
      {
        createdAt: 'desc',
      },
      {
        id: 'desc',
      },
    ],
  });

  return resources.map(mapRentalResourceForStaff);
}

export async function createRentalResourceByStaff(
  prisma: PrismaClient,
  input: CreateRentalResourceByStaffInput
) {
  const { currentUserId, facilityId, name, type } = input;

  await assertGlobalStaffAccess(prisma, currentUserId);

  return prisma.$transaction(async (tx) => {
    await ensureRentalFacilityExists(tx, facilityId);

    const resource = await tx.rentalResource.create({
      data: {
        name,
        resourceType: type,
        facility: {
          connect: { id: facilityId },
        },
      },
      select: staffRentalResourceSelect,
    });

    return mapRentalResourceForStaff(resource);
  });
}

export async function updateRentalResourceByStaff(
  prisma: PrismaClient,
  input: UpdateRentalResourceByStaffInput
) {
  const { resourceId, currentUserId, facilityId, name, type } = input;

  await assertGlobalStaffAccess(prisma, currentUserId);

  return prisma.$transaction(async (tx) => {
    const existingResource = await tx.rentalResource.findUnique({
      where: { id: resourceId },
      select: { id: true },
    });

    if (!existingResource) {
      throw new HttpError(404, 'Rental resource not found');
    }

    if (facilityId !== undefined) {
      await ensureRentalFacilityExists(tx, facilityId);
    }

    const data: Prisma.RentalResourceUpdateInput = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (type !== undefined) {
      data.resourceType = type;
    }

    if (facilityId !== undefined) {
      data.facility = {
        connect: { id: facilityId },
      };
    }

    const resource = await tx.rentalResource.update({
      where: { id: resourceId },
      data,
      select: staffRentalResourceSelect,
    });

    return mapRentalResourceForStaff(resource);
  });
}
