import { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../../lib/prisma';
import { trainingBookingInclude } from '../../../lib/selects';
import { HttpError, createTrainingBooking } from '../../../lib/training-bookings';

function getSingleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const participantId = toPositiveInt(req.body.participantId);
      const trainingId = toPositiveInt(req.body.trainingId);

      if (!participantId || !trainingId) {
        return res.status(400).json({
          error: 'participantId and trainingId must be positive integers',
        });
      }

      const booking = await createTrainingBooking(prisma, {
        participantId,
        trainingId,
      });

      return res.status(201).json(booking);
    } catch (error) {
      console.error(error);

      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return res.status(409).json({ error: 'Already booked' });
      }

      return res.status(500).json({ error: 'Failed to create booking' });
    }
  }

  if (req.method === 'GET') {
    try {
      const participantIdQuery = getSingleValue(req.query.participantId);
      const trainingIdQuery = getSingleValue(req.query.trainingId);
      const status = getSingleValue(req.query.status);

      const participantId = participantIdQuery ? toPositiveInt(participantIdQuery) : null;
      const trainingId = trainingIdQuery ? toPositiveInt(trainingIdQuery) : null;

      if (participantIdQuery && !participantId) {
        return res.status(400).json({ error: 'participantId must be a positive integer' });
      }

      if (trainingIdQuery && !trainingId) {
        return res.status(400).json({ error: 'trainingId must be a positive integer' });
      }

      const bookings = await prisma.trainingBooking.findMany({
        where: {
          ...(participantId ? { participantId } : {}),
          ...(trainingId ? { trainingId } : {}),
          ...(status ? { status } : {}),
        },
        include: trainingBookingInclude,
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json(bookings);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/*
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  // =========================
  // CREATE BOOKING
  // =========================
  if (req.method === 'POST') {
    try {
      console.log('BOOKING BODY:', req.body);

      const { participantId, trainingId } = req.body;

      if (!participantId || !trainingId) {
        return res.status(400).json({
          error: 'participantId and trainingId required',
        });
      }

      // проверяем существование участника
      const participant = await prisma.userProfile.findUnique({
        where: { id: Number(participantId) },
      });

      if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
      }

      // проверяем тренировку
      const training = await prisma.schoolTraining.findUnique({
        where: { trainingId: Number(trainingId) },
      });

      if (!training) {
        return res.status(404).json({ error: 'Training not found' });
      }

      // создаем запись
      const booking = await prisma.trainingBooking.create({
        data: {
          participantId: Number(participantId),
          trainingId: Number(trainingId),
          status: 'booked',
        },
      });

      return res.status(201).json(booking);

    } catch (error: any) {
      console.error(error);

      // ловим дубль записи
      if (error.code === 'P2002') {
        return res.status(400).json({
          error: 'Already booked',
        });
      }

      return res.status(500).json({
        error: 'Failed to create booking',
      });
    }
  }

  // =========================
  // GET BOOKINGS
  // =========================
  if (req.method === 'GET') {
    try {
      const bookings = await prisma.trainingBooking.findMany({
        include: {
          participant: true,
          training: true,
        },
      });

      return res.status(200).json(bookings);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  }

  return res.status(405).end();
}
*/
