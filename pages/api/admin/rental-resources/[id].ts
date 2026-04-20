import type { NextApiRequest, NextApiResponse } from 'next';

import { requireManagerOrAdmin } from '../../../../lib/current-user';
import prisma from '../../../../lib/prisma';
import { updateRentalResourceByStaff } from '../../../../lib/admin-rental-inventory';
import { HttpError } from '../../../../lib/training-bookings';

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function toOptionalString(
  value: unknown
): string | null | undefined | 'invalid' {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
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
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawResourceId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const resourceId = toPositiveInt(rawResourceId);
  const parsedFacilityId =
    req.body.facilityId === undefined ? undefined : toPositiveInt(req.body.facilityId);
  const name = toOptionalString(req.body.name);
  const type = toOptionalString(req.body.type ?? req.body.resourceType);

  if (!resourceId) {
    return res.status(400).json({ error: 'Invalid rental resource id' });
  }

  if (req.body.facilityId !== undefined && !parsedFacilityId) {
    return res.status(400).json({ error: 'facilityId must be a positive integer' });
  }

  if (name === 'invalid' || name === null) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }

  if (type === 'invalid') {
    return res.status(400).json({ error: 'type must be a string or null' });
  }

  if (parsedFacilityId === undefined && name === undefined && type === undefined) {
    return res.status(400).json({
      error: 'At least one of facilityId, name or type is required',
    });
  }

  const facilityId =
    req.body.facilityId === undefined ? undefined : (parsedFacilityId as number);

  try {
    const currentUser = await requireManagerOrAdmin(prisma, req);
    const resource = await updateRentalResourceByStaff(prisma, {
      resourceId,
      currentUserId: currentUser.id,
      ...(facilityId !== undefined ? { facilityId } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(type !== undefined ? { type } : {}),
    });

    return res.status(200).json(resource);
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to update rental resource' });
  }
}
