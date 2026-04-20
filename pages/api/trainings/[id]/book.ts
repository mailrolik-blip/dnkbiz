import { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../../../lib/prisma';
import { HttpError, createTrainingBooking } from '../../../../lib/training-bookings';

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    const trainingId = toPositiveInt(rawId);
    const participantId = toPositiveInt(req.body.participantId);

    if (!trainingId || !participantId) {
      return res.status(400).json({
        error: 'training id and participantId must be positive integers',
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

    return res.status(500).json({ error: 'Server error' });
  }
}

/*
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const trainingId = Number(req.query.id);
    const { participantId } = req.body;

    if (!trainingId || !participantId) {
      return res.status(400).json({ error: 'Missing data' });
    }

    const training = await prisma.schoolTraining.findUnique({
      where: { trainingId },
    });

    if (!training) {
      return res.status(404).json({ error: 'Training not found' });
    }

    const participant = await prisma.userProfile.findUnique({
      where: { id: Number(participantId) },
    });

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const booking = await prisma.booking.create({
      data: {
        sessionId: trainingId, // временно оставляем
        participantId: Number(participantId),
        status: 'booked',
      },
    });

    return res.status(201).json(booking);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
}
*/
