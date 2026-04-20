import type { NextApiRequest, NextApiResponse } from 'next';

import { requireCurrentUser } from '../../../../lib/current-user';
import prisma from '../../../../lib/prisma';
import { createTeamApplication } from '../../../../lib/team-applications';
import { HttpError } from '../../../../lib/training-bookings';

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function toOptionalString(value: unknown): string | null | 'invalid' {
  if (value === undefined || value === null || value === '') {
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawTeamId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const teamId = toPositiveInt(rawTeamId);
  const participantId = toPositiveInt(req.body.participantId);
  const commentFromApplicant = toOptionalString(req.body.commentFromApplicant);

  if (!teamId) {
    return res.status(400).json({ error: 'Invalid team id' });
  }

  if (!participantId) {
    return res.status(400).json({ error: 'participantId must be a positive integer' });
  }

  if (commentFromApplicant === 'invalid') {
    return res.status(400).json({ error: 'commentFromApplicant must be a string' });
  }

  try {
    const currentUser = await requireCurrentUser(prisma, req);
    const application = await createTeamApplication(prisma, {
      currentUserId: currentUser.id,
      participantId,
      teamId,
      commentFromApplicant,
    });

    return res.status(201).json(application);
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to create team application' });
  }
}
