import type { NextApiRequest, NextApiResponse } from 'next';

import { requireCurrentUser } from '../../../lib/current-user';
import prisma from '../../../lib/prisma';
import { listRentalBookingsForUser } from '../../../lib/rental-bookings';
import { HttpError } from '../../../lib/training-bookings';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const currentUser = await requireCurrentUser(prisma, req);
    const bookings = await listRentalBookingsForUser(prisma, currentUser.id);

    return res.status(200).json(bookings);
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to fetch current user rental bookings' });
  }
}
