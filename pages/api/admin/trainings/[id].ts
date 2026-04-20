import type { NextApiRequest, NextApiResponse } from 'next';

import { requireManagerOrAdmin } from '../../../../lib/current-user';
import prisma from '../../../../lib/prisma';
import { updateTrainingByStaff } from '../../../../lib/admin-trainings';
import { HttpError } from '../../../../lib/training-bookings';

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function toOptionalString(value: unknown): string | null | undefined | 'invalid' {
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

function toOptionalBoolean(value: unknown): boolean | undefined | 'invalid' {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return 'invalid';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawTrainingId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const trainingId = toPositiveInt(rawTrainingId);
  const name = toOptionalString(req.body.name ?? req.body.title);
  const parsedCityId =
    req.body.cityId === undefined ? undefined : toPositiveInt(req.body.cityId);
  const coachIdRaw =
    req.body.coachId !== undefined ? req.body.coachId : req.body.trainerId;
  const coachId =
    coachIdRaw === undefined
      ? undefined
      : coachIdRaw === null || coachIdRaw === ''
        ? null
        : toPositiveInt(coachIdRaw);
  const trainingType = toOptionalString(req.body.trainingType);
  const parsedCapacity =
    req.body.capacity === undefined
      ? undefined
      : req.body.capacity === null || req.body.capacity === ''
        ? null
        : toPositiveInt(req.body.capacity);
  const isActive = toOptionalBoolean(req.body.isActive);

  if (!trainingId) {
    return res.status(400).json({ error: 'Invalid training id' });
  }

  if (name === 'invalid' || name === null) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }

  if (req.body.cityId !== undefined && !parsedCityId) {
    return res.status(400).json({ error: 'cityId must be a positive integer' });
  }

  if (coachId === null && coachIdRaw !== undefined && coachIdRaw !== null && coachIdRaw !== '') {
    return res.status(400).json({ error: 'coachId must be a positive integer or null' });
  }

  if (trainingType === 'invalid' || trainingType === null) {
    return res.status(400).json({ error: 'trainingType must be a non-empty string' });
  }

  if (parsedCapacity === null) {
    return res.status(400).json({ error: 'capacity must be a positive integer' });
  }

  if (isActive === 'invalid') {
    return res.status(400).json({ error: 'isActive must be true or false' });
  }

  if (
    name === undefined &&
    parsedCityId === undefined &&
    coachId === undefined &&
    trainingType === undefined &&
    parsedCapacity === undefined &&
    isActive === undefined
  ) {
    return res.status(400).json({
      error: 'At least one of name, cityId, coachId, trainingType, capacity or isActive is required',
    });
  }

  const cityId =
    req.body.cityId === undefined ? undefined : (parsedCityId as number);
  const capacity =
    req.body.capacity === undefined ? undefined : (parsedCapacity as number);

  try {
    const currentUser = await requireManagerOrAdmin(prisma, req);
    const training = await updateTrainingByStaff(prisma, {
      trainingId,
      currentUserId: currentUser.id,
      ...(name !== undefined ? { name } : {}),
      ...(cityId !== undefined ? { cityId } : {}),
      ...(coachId !== undefined ? { coachId } : {}),
      ...(trainingType !== undefined ? { trainingType } : {}),
      ...(capacity !== undefined ? { capacity } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    });

    return res.status(200).json(training);
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to update training' });
  }
}
