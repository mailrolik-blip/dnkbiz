import type { NextApiRequest, NextApiResponse } from 'next';

import { requireCurrentUser } from '../../../lib/current-user';
import { getDashboardForCurrentUser } from '../../../lib/dashboard';
import prisma from '../../../lib/prisma';
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
    const dashboard = await getDashboardForCurrentUser(prisma, currentUser);

    return res.status(200).json(dashboard);
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
}
