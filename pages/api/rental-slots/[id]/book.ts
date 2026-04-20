import type { NextApiRequest, NextApiResponse } from 'next';

import { requireCurrentUser } from '../../../../lib/current-user';
import prisma from '../../../../lib/prisma';
import { createRentalBooking } from '../../../../lib/rental-bookings';
import { HttpError } from '../../../../lib/training-bookings';

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function toOptionalString(value: unknown): string | null | 'invalid' {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    return 'invalid';
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawSlotId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const slotId = toPositiveInt(rawSlotId);
  const participantId =
    req.body.participantId === undefined ||
    req.body.participantId === null ||
    req.body.participantId === ''
      ? null
      : toPositiveInt(req.body.participantId);
  const noteFromUser = toOptionalString(req.body.noteFromUser);

  if (!slotId) {
    return res.status(400).json({ error: 'Invalid rental slot id' });
  }

  if (participantId === null && req.body.participantId) {
    return res.status(400).json({ error: 'participantId must be a positive integer' });
  }

  if (noteFromUser === 'invalid') {
    return res.status(400).json({ error: 'noteFromUser must be a string' });
  }

  try {
    const currentUser = await requireCurrentUser(prisma, req);
    const booking = await createRentalBooking(prisma, {
      currentUserId: currentUser.id,
      slotId,
      participantId,
      noteFromUser,
    });

    return res.status(201).json(booking);
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to create rental booking' });
  }
}
