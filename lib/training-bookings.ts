import { Prisma, type PrismaClient } from '@prisma/client';

import { myTrainingBookingInclude, trainingBookingInclude } from './selects';

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

type CreateTrainingBookingInput = {
  participantId: number;
  trainingId: number;
};

const BOOKED_STATUS = 'booked';
const CANCELLED_STATUS = 'cancelled';

export async function createTrainingBooking(
  prisma: PrismaClient,
  input: CreateTrainingBookingInput
) {
  const { participantId, trainingId } = input;

  return prisma.$transaction(
    async (tx) => {
      const participant = await tx.userProfile.findUnique({
        where: { id: participantId },
      });

      if (!participant) {
        throw new HttpError(404, 'Participant not found');
      }

      const training = await tx.schoolTraining.findUnique({
        where: { trainingId },
      });

      if (!training) {
        throw new HttpError(404, 'Training not found');
      }

      if (!training.isActive) {
        throw new HttpError(409, 'Training is not active');
      }

      const existingBooking = await tx.trainingBooking.findUnique({
        where: {
          participantId_trainingId: {
            participantId,
            trainingId,
          },
        },
      });

      if (existingBooking?.status === BOOKED_STATUS) {
        throw new HttpError(409, 'Already booked');
      }

      const activeBookingsCount = await tx.trainingBooking.count({
        where: {
          trainingId,
          status: BOOKED_STATUS,
        },
      });

      if (activeBookingsCount >= training.capacity) {
        throw new HttpError(409, 'Training is full');
      }

      if (existingBooking?.status === CANCELLED_STATUS) {
        return tx.trainingBooking.update({
          where: { id: existingBooking.id },
          data: { status: BOOKED_STATUS },
          include: trainingBookingInclude,
        });
      }

      return tx.trainingBooking.create({
        data: {
          participantId,
          trainingId,
          status: BOOKED_STATUS,
        },
        include: trainingBookingInclude,
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}

export async function listTrainingBookingsForUser(
  prisma: PrismaClient,
  userId: number
) {
  const bookings = await prisma.trainingBooking.findMany({
    where: {
      participant: {
        userId,
      },
    },
    include: myTrainingBookingInclude,
  });

  return bookings.sort(
    (left, right) =>
      left.training.startTime.getTime() - right.training.startTime.getTime()
  );
}

export async function cancelTrainingBookingForUser(
  prisma: PrismaClient,
  bookingId: number,
  userId: number
) {
  const booking = await prisma.trainingBooking.findUnique({
    where: { id: bookingId },
    include: {
      participant: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  if (!booking || booking.participant.userId !== userId) {
    throw new HttpError(404, 'Training booking not found');
  }

  if (booking.status === CANCELLED_STATUS) {
    throw new HttpError(409, 'Training booking is already cancelled');
  }

  return prisma.trainingBooking.update({
    where: { id: bookingId },
    data: {
      status: CANCELLED_STATUS,
    },
    include: myTrainingBookingInclude,
  });
}
