import type { NextApiRequest, NextApiResponse } from 'next';

import { createTrainingByStaff, listTrainingsForStaff } from '../../../lib/admin-trainings';
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

function toDate(value: unknown): Date | null {
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
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
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    try {
      const currentUser = await requireManagerOrAdmin(prisma, req);
      const trainings = await listTrainingsForStaff(prisma, currentUser.id);
      return res.status(200).json(trainings);
    } catch (error) {
      console.error(error);

      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Failed to fetch trainings for staff' });
    }
  }

  if (req.method === 'POST') {
    const name = toRequiredString(req.body.name ?? req.body.title);
    const description = toOptionalString(req.body.description);
    const trainingTypeValue = toOptionalString(req.body.trainingType);
    const trainingType = trainingTypeValue ?? 'general';
    const cityId = toPositiveInt(req.body.cityId);
    const coachIdRaw = req.body.coachId ?? req.body.trainerId;
    const coachId =
      coachIdRaw === undefined || coachIdRaw === null || coachIdRaw === ''
        ? null
        : toPositiveInt(coachIdRaw);
    const startTime = toDate(req.body.startTime);
    const endTime = toDate(req.body.endTime);
    const location = toRequiredString(req.body.location);
    const capacity =
      req.body.capacity === undefined || req.body.capacity === null || req.body.capacity === ''
        ? undefined
        : toPositiveInt(req.body.capacity);
    const isActive = toOptionalBoolean(req.body.isActive);

    if (!name || !cityId || !startTime || !endTime || !location) {
      return res.status(400).json({
        error: 'name, cityId, startTime, endTime and location are required',
      });
    }

    if (description === 'invalid') {
      return res.status(400).json({ error: 'description must be a string or null' });
    }

    if (trainingTypeValue === 'invalid') {
      return res.status(400).json({ error: 'trainingType must be a string' });
    }

    if (coachId === null && coachIdRaw !== undefined && coachIdRaw !== null && coachIdRaw !== '') {
      return res.status(400).json({ error: 'coachId must be a positive integer' });
    }

    if (capacity === null) {
      return res.status(400).json({ error: 'capacity must be a positive integer' });
    }

    if (isActive === 'invalid') {
      return res.status(400).json({ error: 'isActive must be true or false' });
    }

    if (endTime <= startTime) {
      return res.status(400).json({ error: 'endTime must be later than startTime' });
    }

    try {
      const currentUser = await requireManagerOrAdmin(prisma, req);
      const training = await createTrainingByStaff(prisma, {
        currentUserId: currentUser.id,
        name,
        description: description ?? null,
        trainingType,
        cityId,
        coachId,
        startTime,
        endTime,
        location,
        ...(capacity !== undefined ? { capacity } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      });

      return res.status(201).json(training);
    } catch (error) {
      console.error(error);

      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Failed to create training' });
    }
  }
}
