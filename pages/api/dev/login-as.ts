import type { NextApiRequest, NextApiResponse } from 'next';

import {
  assertDevAuthBridgeEnabled,
  getCurrentUserById,
  setDevCurrentUserCookie,
  toCurrentUserSummary,
} from '../../../lib/current-user';
import prisma from '../../../lib/prisma';
import { HttpError } from '../../../lib/training-bookings';

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
  try {
    assertDevAuthBridgeEnabled();

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = toPositiveInt(req.body.userId);

    if (!userId) {
      return res.status(400).json({ error: 'userId must be a positive integer' });
    }

    const currentUser = await getCurrentUserById(prisma, userId);

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    setDevCurrentUserCookie(res, currentUser.id);

    return res.status(200).json({
      ok: true,
      currentUser: toCurrentUserSummary(currentUser),
    });
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to log in as user' });
  }
}
