import { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

import { updateTeamByStaff } from '../../../../lib/admin-teams';
import { requireManagerOrAdmin } from '../../../../lib/current-user';
import prisma from '../../../../lib/prisma';
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

  const rawTeamId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const teamId = toPositiveInt(rawTeamId);
  const name = toOptionalString(req.body.name);
  const slug = toOptionalString(req.body.slug);
  const parsedCityId =
    req.body.cityId === undefined ? undefined : toPositiveInt(req.body.cityId);
  const description = toOptionalString(req.body.description);

  if (!teamId) {
    return res.status(400).json({ error: 'Invalid team id' });
  }

  if (name === 'invalid' || name === null) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }

  if (slug === 'invalid' || slug === null) {
    return res.status(400).json({ error: 'slug must be a non-empty string' });
  }

  if (req.body.cityId !== undefined && !parsedCityId) {
    return res.status(400).json({ error: 'cityId must be a positive integer' });
  }

  if (description === 'invalid') {
    return res.status(400).json({ error: 'description must be a string or null' });
  }

  if (
    name === undefined &&
    slug === undefined &&
    parsedCityId === undefined &&
    description === undefined
  ) {
    return res.status(400).json({
      error: 'At least one of name, slug, cityId or description is required',
    });
  }

  const cityId = req.body.cityId === undefined ? undefined : (parsedCityId as number);

  try {
    const currentUser = await requireManagerOrAdmin(prisma, req);
    const team = await updateTeamByStaff(prisma, {
      teamId,
      currentUserId: currentUser.id,
      ...(name !== undefined ? { name } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(cityId !== undefined ? { cityId } : {}),
      ...(description !== undefined ? { description } : {}),
    });

    return res.status(200).json(team);
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

    return res.status(500).json({ error: 'Failed to update team' });
  }
}
