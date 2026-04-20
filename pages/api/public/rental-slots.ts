import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../../lib/prisma';
import { listPublicRentalSlots } from '../../../lib/rental-bookings';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const slots = await listPublicRentalSlots(prisma);

    return res.status(200).json(slots);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch public rental slots' });
  }
}
