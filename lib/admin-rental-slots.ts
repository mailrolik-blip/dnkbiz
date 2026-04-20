import {
  Prisma,
  type PrismaClient,
  type RentalBookingStatus,
  type RentalSlotStatus,
} from '@prisma/client';

import { staffRentalSlotSelect } from './selects';
import { assertGlobalStaffAccess } from './staff';
import { HttpError } from './training-bookings';

type CreateRentalSlotByStaffInput = {
  currentUserId: number;
  resourceId: number;
  startsAt: Date;
  endsAt: Date;
  status: StaffManagedRentalSlotStatus;
  visibleToPublic: boolean;
};

type UpdateRentalSlotByStaffInput = {
  slotId: number;
  currentUserId: number;
  status?: StaffManagedRentalSlotStatus;
  startsAt?: Date;
  endsAt?: Date;
  visibleToPublic?: boolean;
};

type StaffRentalSlotRecord = Prisma.RentalSlotGetPayload<{
  select: typeof staffRentalSlotSelect;
}>;

export type StaffManagedRentalSlotStatus =
  | 'AVAILABLE'
  | 'BOOKED'
  | 'UNAVAILABLE';

const ACTIVE_RENTAL_BOOKING_STATUSES: RentalBookingStatus[] = [
  'PENDING_CONFIRMATION',
  'CONFIRMED',
];

function mapRentalSlotForStaff(slot: StaffRentalSlotRecord) {
  const activeBooking = slot.bookings[0] ?? null;

  return {
    id: slot.id,
    status: slot.status,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    visibleToPublic: slot.isPublic,
    resource: {
      id: slot.resource.id,
      name: slot.resource.name,
      resourceType: slot.resource.resourceType,
    },
    facility: {
      id: slot.resource.facility.id,
      name: slot.resource.facility.name,
    },
    city: slot.resource.facility.city,
    activeBookingSummary: activeBooking
      ? {
          id: activeBooking.id,
          status: activeBooking.status,
          bookingType: activeBooking.participantId ? 'PARTICIPANT' : 'SELF',
          createdAt: activeBooking.createdAt,
          updatedAt: activeBooking.updatedAt,
          user: activeBooking.user,
          participant: activeBooking.participant,
        }
      : null,
  };
}

async function ensureRentalResourceExists(
  tx: Prisma.TransactionClient,
  resourceId: number
) {
  const resource = await tx.rentalResource.findUnique({
    where: { id: resourceId },
    select: { id: true },
  });

  if (!resource) {
    throw new HttpError(404, 'Rental resource not found');
  }
}

async function ensureNoOverlappingSlot(
  tx: Prisma.TransactionClient,
  input: {
    resourceId: number;
    startsAt: Date;
    endsAt: Date;
    excludeSlotId?: number;
  }
) {
  const overlappingSlot = await tx.rentalSlot.findFirst({
    where: {
      resourceId: input.resourceId,
      ...(input.excludeSlotId !== undefined
        ? {
            id: {
              not: input.excludeSlotId,
            },
          }
        : {}),
      startsAt: {
        lt: input.endsAt,
      },
      endsAt: {
        gt: input.startsAt,
      },
    },
    select: {
      id: true,
    },
  });

  if (overlappingSlot) {
    throw new HttpError(409, 'Rental slot overlaps with an existing slot');
  }
}

function resolveNextSlotStatus(
  currentStatus: RentalSlotStatus,
  requestedStatus: StaffManagedRentalSlotStatus | undefined,
  hasActiveBooking: boolean
) {
  if (hasActiveBooking) {
    if (requestedStatus !== undefined && requestedStatus !== 'BOOKED') {
      throw new HttpError(
        409,
        'Rental slot with an active booking must stay BOOKED'
      );
    }

    return 'BOOKED';
  }

  if (requestedStatus === 'BOOKED') {
    throw new HttpError(
      409,
      'Rental slot cannot be set to BOOKED without an active booking'
    );
  }

  if (requestedStatus !== undefined) {
    return requestedStatus;
  }

  if (currentStatus === 'BOOKED') {
    return 'AVAILABLE';
  }

  return currentStatus;
}

export async function listRentalSlotsForStaff(
  prisma: PrismaClient,
  currentUserId: number
) {
  await assertGlobalStaffAccess(prisma, currentUserId);

  const slots = await prisma.rentalSlot.findMany({
    select: staffRentalSlotSelect,
    orderBy: [
      {
        startsAt: 'asc',
      },
      {
        id: 'asc',
      },
    ],
  });

  return slots.map(mapRentalSlotForStaff);
}

export async function createRentalSlotByStaff(
  prisma: PrismaClient,
  input: CreateRentalSlotByStaffInput
) {
  const {
    currentUserId,
    resourceId,
    startsAt,
    endsAt,
    status,
    visibleToPublic,
  } = input;

  await assertGlobalStaffAccess(prisma, currentUserId);

  if (status === 'BOOKED') {
    throw new HttpError(
      409,
      'Rental slot cannot be created as BOOKED without an active booking'
    );
  }

  return prisma.$transaction(async (tx) => {
    await ensureRentalResourceExists(tx, resourceId);
    await ensureNoOverlappingSlot(tx, {
      resourceId,
      startsAt,
      endsAt,
    });

    const slot = await tx.rentalSlot.create({
      data: {
        resource: {
          connect: { id: resourceId },
        },
        startsAt,
        endsAt,
        status,
        isPublic: visibleToPublic,
      },
      select: staffRentalSlotSelect,
    });

    return mapRentalSlotForStaff(slot);
  });
}

export async function updateRentalSlotByStaff(
  prisma: PrismaClient,
  input: UpdateRentalSlotByStaffInput
) {
  const {
    slotId,
    currentUserId,
    status,
    startsAt,
    endsAt,
    visibleToPublic,
  } = input;

  await assertGlobalStaffAccess(prisma, currentUserId);

  return prisma.$transaction(async (tx) => {
    const slot = await tx.rentalSlot.findUnique({
      where: { id: slotId },
      select: {
        id: true,
        resourceId: true,
        startsAt: true,
        endsAt: true,
        status: true,
        isPublic: true,
        bookings: {
          where: {
            status: {
              in: ACTIVE_RENTAL_BOOKING_STATUSES,
            },
          },
          take: 1,
          select: {
            id: true,
          },
        },
      },
    });

    if (!slot) {
      throw new HttpError(404, 'Rental slot not found');
    }

    const nextStartsAt = startsAt ?? slot.startsAt;
    const nextEndsAt = endsAt ?? slot.endsAt;

    if (nextEndsAt <= nextStartsAt) {
      throw new HttpError(400, 'endsAt must be later than startsAt');
    }

    await ensureNoOverlappingSlot(tx, {
      resourceId: slot.resourceId,
      startsAt: nextStartsAt,
      endsAt: nextEndsAt,
      excludeSlotId: slot.id,
    });

    const nextStatus = resolveNextSlotStatus(
      slot.status,
      status,
      slot.bookings.length > 0
    );

    const updatedSlot = await tx.rentalSlot.update({
      where: { id: slot.id },
      data: {
        status: nextStatus,
        startsAt: nextStartsAt,
        endsAt: nextEndsAt,
        ...(visibleToPublic !== undefined
          ? {
              isPublic: visibleToPublic,
            }
          : {}),
      },
      select: staffRentalSlotSelect,
    });

    return mapRentalSlotForStaff(updatedSlot);
  });
}
