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

function hasOwn(body: unknown, key: string): boolean {
  return typeof body === 'object' && body !== null && Object.prototype.hasOwnProperty.call(body, key);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const participantId = toPositiveInt(rawId);

  if (!participantId) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    if (req.method === 'GET') {
      const participant = await prisma.userProfile.findUnique({
        where: { id: participantId },
        select: participantDetailSelect,
      });

      if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
      }

      return res.status(200).json(participant);
    }

    if (req.method === 'PATCH') {
      const existingParticipant = await prisma.userProfile.findUnique({
        where: { id: participantId },
        select: { id: true },
      });

      if (!existingParticipant) {
        return res.status(404).json({ error: 'Participant not found' });
      }

      const data: Prisma.UserProfileUpdateInput = {};

      if (hasOwn(req.body, 'profileType')) {
        const profileType = toOptionalString(req.body.profileType);

        if (!profileType) {
          return res.status(400).json({ error: 'profileType cannot be empty' });
        }

        data.profileType = profileType;
      }

      if (hasOwn(req.body, 'firstName')) {
        data.firstName = toOptionalString(req.body.firstName);
      }

      if (hasOwn(req.body, 'lastName')) {
        data.lastName = toOptionalString(req.body.lastName);
      }

      if (hasOwn(req.body, 'birthDate')) {
        const birthDate = toOptionalDate(req.body.birthDate);

        if (birthDate === 'invalid') {
          return res.status(400).json({ error: 'birthDate must be a valid date' });
        }

        data.birthDate = birthDate;
      }

      if (hasOwn(req.body, 'cityId')) {
        if (req.body.cityId === null || req.body.cityId === '') {
          data.city = { disconnect: true };
        } else {
          const cityId = toPositiveInt(req.body.cityId);

          if (!cityId) {
            return res.status(400).json({ error: 'cityId must be a positive integer' });
          }

          const city = await prisma.city.findUnique({
            where: { id: cityId },
            select: { id: true },
          });

          if (!city) {
            return res.status(404).json({ error: 'City not found' });
          }

          data.city = {
            connect: { id: cityId },
          };
        }
      }

      if (hasOwn(req.body, 'parentId')) {
        if (req.body.parentId === null || req.body.parentId === '') {
          data.parent = { disconnect: true };
        } else {
          const parentId = toPositiveInt(req.body.parentId);

          if (!parentId) {
            return res.status(400).json({ error: 'parentId must be a positive integer' });
          }

          if (parentId === participantId) {
            return res.status(400).json({ error: 'Participant cannot be its own parent' });
          }

          const parent = await prisma.userProfile.findUnique({
            where: { id: parentId },
            select: { id: true },
          });

          if (!parent) {
            return res.status(404).json({ error: 'Parent participant not found' });
          }

          data.parent = {
            connect: { id: parentId },
          };
        }
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update' });
      }

      const updated = await prisma.userProfile.update({
        where: { id: participantId },
        data,
        select: participantDetailSelect,
      });

      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      await prisma.userProfile.delete({
        where: { id: participantId },
      });

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      return res.status(409).json({ error: 'Participant is still referenced by other records' });
    }

    return res.status(500).json({ error: 'Server error' });
  }
}

/*
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id } = req.query;
  const participantId = Number(id);

  if (!participantId) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    // =========================
    // GET ONE PARTICIPANT
    // =========================
    if (req.method === 'GET') {
      const participant = await prisma.userProfile.findUnique({
        where: { id: participantId },
        include: {
          user: true,
          children: true,
          parent: true,
        },
      });

      return res.status(200).json(participant);
    }

    // =========================
    // UPDATE PARTICIPANT
    // =========================
    if (req.method === 'PATCH') {
      const {
        profileType,
        firstName,
        lastName,
        birthDate,
        cityId,
        parentId,
      } = req.body;

      const updated = await prisma.userProfile.update({
        where: { id: participantId },
        data: {
          profileType,
          firstName,
          lastName,
          birthDate: birthDate ? new Date(birthDate) : undefined,
          cityId,
          parentId,
        },
      });

      return res.status(200).json(updated);
    }

    // =========================
    // DELETE (soft later)
    // =========================
    if (req.method === 'DELETE') {
      await prisma.userProfile.delete({
        where: { id: participantId },
      });

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
}
*/
