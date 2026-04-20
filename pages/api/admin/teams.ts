import { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

import { createTeamByStaff, listTeamsForStaff } from '../../../lib/admin-teams';
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
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    try {
      const currentUser = await requireManagerOrAdmin(prisma, req);
      const teams = await listTeamsForStaff(prisma, currentUser.id);

      return res.status(200).json(teams);
    } catch (error) {
      console.error(error);

      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Failed to fetch teams for staff' });
    }
  }

  const name = toRequiredString(req.body.name);
  const slug = toRequiredString(req.body.slug);
  const cityId = toPositiveInt(req.body.cityId);
  const description = toOptionalString(req.body.description);

  if (!name || !slug || !cityId) {
    return res.status(400).json({
      error: 'name, slug and cityId are required',
    });
  }

  if (description === 'invalid') {
    return res.status(400).json({ error: 'description must be a string or null' });
  }

  try {
    const currentUser = await requireManagerOrAdmin(prisma, req);
    const team = await createTeamByStaff(prisma, {
      currentUserId: currentUser.id,
      name,
      slug,
      cityId,
      ...(description !== undefined ? { description } : {}),
    });

    return res.status(201).json(team);
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return res.status(409).json({ error: 'Team slug is already in use' });
    }

    return res.status(500).json({ error: 'Failed to create team' });
  }
}
