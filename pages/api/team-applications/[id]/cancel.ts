import type { NextApiRequest, NextApiResponse } from 'next';

import { requireCurrentUser } from '../../../../lib/current-user';
import prisma from '../../../../lib/prisma';
import {
  cancelTeamApplicationForUser,
} from '../../../../lib/team-applications';
import { HttpError } from '../../../../lib/training-bookings';

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

  const rawApplicationId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const applicationId = toPositiveInt(rawApplicationId);

  if (!applicationId) {
    return res.status(400).json({ error: 'Invalid team application id' });
  }

  try {
    const currentUser = await requireCurrentUser(prisma, req);
    const cancelledApplication = await cancelTeamApplicationForUser(
      prisma,
      applicationId,
      currentUser.id
    );

    return res.status(200).json(cancelledApplication);
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to cancel team application' });
  }
}
