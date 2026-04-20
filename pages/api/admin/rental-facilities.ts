import type { NextApiRequest, NextApiResponse } from 'next';

import {
  createRentalFacilityByStaff,
  listRentalFacilitiesForStaff,
} from '../../../lib/admin-rental-inventory';
import { requireManagerOrAdmin } from '../../../lib/current-user';
import prisma from '../../../lib/prisma';
import { HttpError } from '../../../lib/training-bookings';

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function toRequiredString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    try {
      const currentUser = await requireManagerOrAdmin(prisma, req);
      const facilities = await listRentalFacilitiesForStaff(prisma, currentUser.id);

      return res.status(200).json(facilities);
    } catch (error) {
      console.error(error);

      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Failed to fetch rental facilities for staff' });
    }
  }

  const cityId = toPositiveInt(req.body.cityId);
  const name = toRequiredString(req.body.name);

  if (!cityId || !name) {
    return res.status(400).json({ error: 'cityId and name are required' });
  }

  if (req.body.cityId !== undefined && !cityId) {
    return res.status(400).json({ error: 'cityId must be a positive integer' });
  }

  if (req.body.name !== undefined && !name) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }

  try {
    const currentUser = await requireManagerOrAdmin(prisma, req);
    const facility = await createRentalFacilityByStaff(prisma, {
      currentUserId: currentUser.id,
      cityId,
      name,
    });

    return res.status(201).json(facility);
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to create rental facility' });
  }
}
