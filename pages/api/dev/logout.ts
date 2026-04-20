import type { NextApiRequest, NextApiResponse } from 'next';

import {
  assertDevAuthBridgeEnabled,
  clearDevCurrentUserCookie,
} from '../../../lib/current-user';
import { HttpError } from '../../../lib/training-bookings';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    assertDevAuthBridgeEnabled();

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    clearDevCurrentUserCookie(res);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to log out' });
  }
}
