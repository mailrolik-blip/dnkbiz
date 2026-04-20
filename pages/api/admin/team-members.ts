import type { TeamMemberStatus } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

import { requireManagerOrAdmin } from '../../../lib/current-user';
import prisma from '../../../lib/prisma';
import { createTeamMemberByStaff, listTeamMembersForStaff } from '../../../lib/team-members';
import { HttpError } from '../../../lib/training-bookings';

const TEAM_MEMBER_STATUSES: TeamMemberStatus[] = ['ACTIVE', 'INJURED', 'SUSPENDED'];

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

function toTeamMemberStatus(
  value: unknown
): TeamMemberStatus | undefined | 'invalid' {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return 'invalid';
  }

  if (TEAM_MEMBER_STATUSES.includes(value as TeamMemberStatus)) {
    return value as TeamMemberStatus;
  }

  return 'invalid';
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

function toOptionalJerseyNumber(
  value: unknown
): number | null | undefined | 'invalid' {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 'invalid';
  }

  return parsed;
}

function toDate(value: unknown): Date | null {
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    const teamIdQuery = getSingleValue(req.query.teamId);
    let teamId: number | undefined;

    if (teamIdQuery !== undefined) {
      const parsedTeamId = toPositiveInt(teamIdQuery);

      if (!parsedTeamId) {
        return res.status(400).json({ error: 'teamId must be a positive integer' });
      }

      teamId = parsedTeamId;
    }

    try {
      const currentUser = await requireManagerOrAdmin(prisma, req);
      const teamMembers = await listTeamMembersForStaff(prisma, {
        currentUserId: currentUser.id,
        ...(teamId !== undefined ? { teamId } : {}),
      });

      return res.status(200).json(teamMembers);
    } catch (error) {
      console.error(error);

      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Failed to fetch team members for staff' });
    }
  }

  const teamId = toPositiveInt(req.body.teamId);
  const participantId = toPositiveInt(req.body.participantId);
  const status = toTeamMemberStatus(req.body.status);
  const positionCode = toOptionalString(req.body.positionCode);
  const jerseyNumber = toOptionalJerseyNumber(req.body.jerseyNumber);
  const joinedAt =
    req.body.joinedAt === undefined ? undefined : toDate(req.body.joinedAt);

  if (!teamId || !participantId || status === undefined) {
    return res.status(400).json({
      error: 'teamId, participantId and status are required',
    });
  }

  if (req.body.teamId !== undefined && !teamId) {
    return res.status(400).json({ error: 'teamId must be a positive integer' });
  }

  if (req.body.participantId !== undefined && !participantId) {
    return res.status(400).json({ error: 'participantId must be a positive integer' });
  }

  if (status === 'invalid') {
    return res.status(400).json({
      error: 'status must be one of ACTIVE, INJURED, SUSPENDED',
    });
  }

  if (positionCode === 'invalid') {
    return res.status(400).json({ error: 'positionCode must be a string or null' });
  }

  if (jerseyNumber === 'invalid') {
    return res.status(400).json({ error: 'jerseyNumber must be a positive integer or null' });
  }

  if (joinedAt === null) {
    return res.status(400).json({ error: 'joinedAt must be a valid date' });
  }

  try {
    const currentUser = await requireManagerOrAdmin(prisma, req);
    const teamMember = await createTeamMemberByStaff(prisma, {
      currentUserId: currentUser.id,
      teamId,
      participantId,
      status,
      ...(positionCode !== undefined ? { positionCode } : {}),
      ...(jerseyNumber !== undefined ? { jerseyNumber } : {}),
      ...(joinedAt !== undefined ? { joinedAt } : {}),
    });

    return res.status(201).json(teamMember);
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to create team member' });
  }
}
