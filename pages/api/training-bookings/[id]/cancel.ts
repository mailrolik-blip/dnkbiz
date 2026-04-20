import type { NextApiRequest, NextApiResponse } from 'next';

import { requireCurrentUser } from '../../../../lib/current-user';
import prisma from '../../../../lib/prisma';
import {
  HttpError,
  cancelTrainingBookingForUser,
} from '../../../../lib/training-bookings';

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

  const rawBookingId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const bookingId = toPositiveInt(rawBookingId);

  if (!bookingId) {
    return res.status(400).json({ error: 'Invalid booking id' });
  }

  try {
    const currentUser = await requireCurrentUser(prisma, req);
    const cancelledBooking = await cancelTrainingBookingForUser(
      prisma,
      bookingId,
      currentUser.id
    );

    return res.status(200).json(cancelledBooking);
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to cancel training booking' });
  }
}
