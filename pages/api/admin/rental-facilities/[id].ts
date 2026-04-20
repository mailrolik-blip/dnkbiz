import type { NextApiRequest, NextApiResponse } from 'next';

import { requireManagerOrAdmin } from '../../../../lib/current-user';
import prisma from '../../../../lib/prisma';
import { updateRentalFacilityByStaff } from '../../../../lib/admin-rental-inventory';
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
): string | undefined | 'invalid' {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return 'invalid';
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : 'invalid';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawFacilityId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const facilityId = toPositiveInt(rawFacilityId);
  const parsedCityId =
    req.body.cityId === undefined ? undefined : toPositiveInt(req.body.cityId);
  const name = toOptionalString(req.body.name);

  if (!facilityId) {
    return res.status(400).json({ error: 'Invalid rental facility id' });
  }

  if (req.body.cityId !== undefined && !parsedCityId) {
    return res.status(400).json({ error: 'cityId must be a positive integer' });
  }

  if (name === 'invalid') {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }

  if (parsedCityId === undefined && name === undefined) {
    return res.status(400).json({
      error: 'At least one of cityId or name is required',
    });
  }

  const cityId = req.body.cityId === undefined ? undefined : (parsedCityId as number);

  try {
    const currentUser = await requireManagerOrAdmin(prisma, req);
    const facility = await updateRentalFacilityByStaff(prisma, {
      facilityId,
      currentUserId: currentUser.id,
      ...(cityId !== undefined ? { cityId } : {}),
      ...(name !== undefined ? { name } : {}),
    });

    return res.status(200).json(facility);
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to update rental facility' });
  }
}
