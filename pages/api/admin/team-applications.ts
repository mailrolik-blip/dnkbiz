import type { TeamApplicationStatus } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

import { requireManagerOrAdmin } from '../../../lib/current-user';
import prisma from '../../../lib/prisma';
import { listTeamApplicationsForAdmin } from '../../../lib/team-applications';
import { HttpError } from '../../../lib/training-bookings';

const TEAM_APPLICATION_STATUSES: TeamApplicationStatus[] = [
  'PENDING',
  'IN_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'CANCELLED',
];

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

function toTeamApplicationStatus(
  value: unknown
): TeamApplicationStatus | undefined | 'invalid' {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return 'invalid';
  }

  if (TEAM_APPLICATION_STATUSES.includes(value as TeamApplicationStatus)) {
    return value as TeamApplicationStatus;
  }

  return 'invalid';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const teamIdQuery = getSingleValue(req.query.teamId);
  const statusQuery = getSingleValue(req.query.status);
  const parsedTeamId =
    teamIdQuery === undefined ? undefined : toPositiveInt(teamIdQuery);
  const status = toTeamApplicationStatus(statusQuery);

  if (teamIdQuery !== undefined && !parsedTeamId) {
    return res.status(400).json({ error: 'teamId must be a positive integer' });
  }

  if (status === 'invalid') {
    return res.status(400).json({
      error: 'status must be one of PENDING, IN_REVIEW, ACCEPTED, REJECTED, CANCELLED',
    });
  }

  const teamId = teamIdQuery === undefined ? undefined : (parsedTeamId as number);

  try {
    const currentUser = await requireManagerOrAdmin(prisma, req);
    const applications = await listTeamApplicationsForAdmin(prisma, {
      currentUserId: currentUser.id,
      ...(teamId !== undefined ? { teamId } : {}),
      ...(status !== undefined ? { status } : {}),
    });

    return res.status(200).json(applications);
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to fetch team applications for admin' });
  }
}
