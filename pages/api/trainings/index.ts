import { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../../lib/prisma';
import { trainingSelect } from '../../../lib/selects';

function getSingleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

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

function toOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return toRequiredString(value);
}

function toDate(value: unknown): Date | null {
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function toOptionalBoolean(value: unknown): boolean | null {
  if (value === undefined || value === null || value === '') {
    return null;
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

  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const name = toRequiredString(req.body.name);
      const description = toOptionalString(req.body.description);
      const trainingType = toRequiredString(req.body.trainingType) ?? 'general';
      const cityId = toPositiveInt(req.body.cityId);
      const trainerId =
        req.body.trainerId === undefined || req.body.trainerId === null || req.body.trainerId === ''
          ? null
          : toPositiveInt(req.body.trainerId);
      const startTime = toDate(req.body.startTime);
      const endTime = toDate(req.body.endTime);
      const location = toRequiredString(req.body.location);
      const capacity =
        req.body.capacity === undefined || req.body.capacity === null || req.body.capacity === ''
          ? null
          : toPositiveInt(req.body.capacity);
      const isActive = toOptionalBoolean(req.body.isActive);

      if (!name || !cityId || !startTime || !endTime || !location) {
        return res.status(400).json({
          error: 'name, cityId, startTime, endTime and location are required',
        });
      }

      if (trainerId === null && req.body.trainerId) {
        return res.status(400).json({ error: 'trainerId must be a positive integer' });
      }

      if (capacity === null && req.body.capacity) {
        return res.status(400).json({ error: 'capacity must be a positive integer' });
      }

      if (req.body.isActive !== undefined && isActive === null) {
        return res.status(400).json({ error: 'isActive must be true or false' });
      }

      if (endTime <= startTime) {
        return res.status(400).json({ error: 'endTime must be later than startTime' });
      }

      const [city, trainer] = await Promise.all([
        prisma.city.findUnique({ where: { id: cityId }, select: { id: true } }),
        trainerId ? prisma.user.findUnique({ where: { id: trainerId }, select: { id: true } }) : Promise.resolve(null),
      ]);

      if (!city) {
        return res.status(404).json({ error: 'City not found' });
      }

      if (trainerId && !trainer) {
        return res.status(404).json({ error: 'Trainer not found' });
      }

      const training = await prisma.schoolTraining.create({
        data: {
          name,
          description,
          trainingType,
          startTime,
          endTime,
          location,
          ...(capacity ? { capacity } : {}),
          ...(isActive !== null ? { isActive } : {}),
          city: {
            connect: { id: cityId },
          },
          ...(trainerId
            ? {
                trainer: {
                  connect: { id: trainerId },
                },
              }
            : {}),
        },
        select: trainingSelect,
      });

      return res.status(201).json(training);
    } catch (error) {
      console.error(error);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        return res.status(400).json({ error: 'Invalid relation provided' });
      }

      return res.status(500).json({ error: 'Failed to create training' });
    }
  }

  if (req.method === 'GET') {
    try {
      const cityIdQuery = getSingleValue(req.query.cityId);
      const trainerIdQuery = getSingleValue(req.query.trainerId);
      const isActiveQuery = getSingleValue(req.query.isActive);

      const cityId = cityIdQuery ? toPositiveInt(cityIdQuery) : null;
      const trainerId = trainerIdQuery ? toPositiveInt(trainerIdQuery) : null;
      const isActive =
        isActiveQuery === undefined ? null : toOptionalBoolean(isActiveQuery);

      if (cityIdQuery && !cityId) {
        return res.status(400).json({ error: 'cityId must be a positive integer' });
      }

      if (trainerIdQuery && !trainerId) {
        return res.status(400).json({ error: 'trainerId must be a positive integer' });
      }

      if (isActiveQuery !== undefined && isActive === null) {
        return res.status(400).json({ error: 'isActive must be true or false' });
      }

      const trainings = await prisma.schoolTraining.findMany({
        where: {
          ...(cityId ? { cityId } : {}),
          ...(trainerId ? { trainerId } : {}),
          ...(isActive !== null ? { isActive } : {}),
        },
        select: trainingSelect,
        orderBy: {
          startTime: 'asc',
        },
      });

      return res.status(200).json(trainings);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch trainings' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/*
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  // =========================
  // CREATE TRAINING
  // =========================
  if (req.method === 'POST') {
    try {
      console.log('BODY:', req.body);

      const {
        name,
        description,
        trainingType,
        cityId,
        trainerId,
        startTime,
        endTime,
        location
      } = req.body;

      // базовая валидация
      if (!name || !startTime || !endTime || !cityId) {
        return res.status(400).json({
          error: 'name, cityId, startTime, endTime are required',
        });
      }

      const training = await prisma.schoolTraining.create({
        data: {
          name,
          description: description || null,
          trainingType: trainingType || 'default',

          cityId: Number(cityId),

          // ключевой момент — trainer НЕ обязателен
          trainerId: trainerId ? Number(trainerId) : null,

          startTime: new Date(startTime),
          endTime: new Date(endTime),

          location: location || '',
        },
        include: {
          trainer: true,
          city: true,
        },
      });

      return res.status(201).json(training);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create training' });
    }
  }

  // =========================
  // GET TRAININGS
  // =========================
  if (req.method === 'GET') {
    try {
      const { cityId, trainerId } = req.query;

      const trainings = await prisma.schoolTraining.findMany({
        where: {
          ...(cityId && { cityId: Number(cityId) }),
          ...(trainerId && { trainerId: Number(trainerId) }),
        },
        include: {
          trainer: true,
          city: true,
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      return res.status(200).json(trainings);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch trainings' });
    }
  }

  return res.status(405).end();
}
*/
