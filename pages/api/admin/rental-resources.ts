import type { NextApiRequest, NextApiResponse } from 'next';

import {
  createRentalResourceByStaff,
  listRentalResourcesForStaff,
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
      const resources = await listRentalResourcesForStaff(prisma, currentUser.id);

      return res.status(200).json(resources);
    } catch (error) {
      console.error(error);

      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Failed to fetch rental resources for staff' });
    }
  }

  const facilityId = toPositiveInt(req.body.facilityId);
  const name = toRequiredString(req.body.name);
  const type = toRequiredString(req.body.type ?? req.body.resourceType);

  if (!facilityId || !name || !type) {
    return res.status(400).json({ error: 'facilityId, name and type are required' });
  }

  if (req.body.facilityId !== undefined && !facilityId) {
    return res.status(400).json({ error: 'facilityId must be a positive integer' });
  }

  if (req.body.name !== undefined && !name) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }

  if ((req.body.type !== undefined || req.body.resourceType !== undefined) && !type) {
    return res.status(400).json({ error: 'type must be a non-empty string' });
  }

  try {
    const currentUser = await requireManagerOrAdmin(prisma, req);
    const resource = await createRentalResourceByStaff(prisma, {
      currentUserId: currentUser.id,
      facilityId,
      name,
      type,
    });

    return res.status(201).json(resource);
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to create rental resource' });
  }
}
