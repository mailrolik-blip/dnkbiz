import { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../../lib/prisma';
import { participantDetailSelect } from '../../../lib/selects';

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toOptionalDate(value: unknown): Date | null | 'invalid' {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.valueOf()) ? 'invalid' : parsed;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'POST') {
      const userId = toPositiveInt(req.body.userId);
      const profileType = toOptionalString(req.body.profileType);
      const parentId =
        req.body.parentId === undefined || req.body.parentId === null || req.body.parentId === ''
          ? null
          : toPositiveInt(req.body.parentId);
      const cityId =
        req.body.cityId === undefined || req.body.cityId === null || req.body.cityId === ''
          ? null
          : toPositiveInt(req.body.cityId);
      const birthDate = toOptionalDate(req.body.birthDate);

      if (!userId || !profileType) {
        return res.status(400).json({ error: 'userId and profileType are required' });
      }

      if (parentId === null && req.body.parentId) {
        return res.status(400).json({ error: 'parentId must be a positive integer' });
      }

      if (cityId === null && req.body.cityId) {
        return res.status(400).json({ error: 'cityId must be a positive integer' });
      }

      if (birthDate === 'invalid') {
        return res.status(400).json({ error: 'birthDate must be a valid date' });
      }

      const [user, parent, city] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
        parentId
          ? prisma.userProfile.findUnique({ where: { id: parentId }, select: { id: true } })
          : Promise.resolve(null),
        cityId ? prisma.city.findUnique({ where: { id: cityId }, select: { id: true } }) : Promise.resolve(null),
      ]);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (parentId && !parent) {
        return res.status(404).json({ error: 'Parent participant not found' });
      }

      if (cityId && !city) {
        return res.status(404).json({ error: 'City not found' });
      }

      const participant = await prisma.userProfile.create({
        data: {
          user: {
            connect: { id: userId },
          },
          profileType,
          firstName: toOptionalString(req.body.firstName),
          lastName: toOptionalString(req.body.lastName),
          birthDate,
          ...(parentId
            ? {
                parent: {
                  connect: { id: parentId },
                },
              }
            : {}),
          ...(cityId
            ? {
                city: {
                  connect: { id: cityId },
                },
              }
            : {}),
        },
        select: participantDetailSelect,
      });

      return res.status(201).json(participant);
    }

    if (req.method === 'GET') {
      const participants = await prisma.userProfile.findMany({
        select: participantDetailSelect,
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json(participants);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      return res.status(400).json({ error: 'Invalid relation provided' });
    }

    return res.status(500).json({ error: 'Server error' });
  }
}

/*
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    // =========================
    // CREATE PARTICIPANT
    // =========================
    if (req.method === 'POST') {
      console.log('CREATE PARTICIPANT BODY:', req.body);

      const {
        userId,
        profileType,
        firstName,
        lastName,
        birthDate,
        parentId,
        cityId,
      } = req.body;

      if (!userId || !profileType) {
        return res.status(400).json({
          error: 'userId and profileType required',
        });
      }

      const participant = await prisma.userProfile.create({
        data: {
          userId: Number(userId),
          profileType,
          firstName: firstName || null,
          lastName: lastName || null,
          birthDate: birthDate ? new Date(birthDate) : null,
          parentId: parentId ? Number(parentId) : null,
          cityId: cityId ? Number(cityId) : null,
        },
      });

      return res.status(201).json(participant);
    }

    // =========================
    // GET ALL PARTICIPANTS
    // =========================
    if (req.method === 'GET') {
      const participants = await prisma.userProfile.findMany({
        include: {
          user: true,
        },
      });

      return res.status(200).json(participants);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
}
*/
