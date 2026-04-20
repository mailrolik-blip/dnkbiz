import type { NextApiRequest, NextApiResponse } from 'next';

import { requireManagerOrAdmin } from '../../../../lib/current-user';
import prisma from '../../../../lib/prisma';
import {
  type StaffManagedTeamApplicationStatus,
  updateTeamApplicationByAdmin,
} from '../../../../lib/team-applications';
import { HttpError } from '../../../../lib/training-bookings';

const STAFF_MANAGED_TEAM_APPLICATION_STATUSES: StaffManagedTeamApplicationStatus[] = [
  'PENDING',
  'IN_REVIEW',
  'ACCEPTED',
  'REJECTED',
];

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function toStaffManagedStatus(
  value: unknown
): StaffManagedTeamApplicationStatus | undefined | 'invalid' {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return 'invalid';
  }

  if (
    STAFF_MANAGED_TEAM_APPLICATION_STATUSES.includes(
      value as StaffManagedTeamApplicationStatus
    )
  ) {
    return value as StaffManagedTeamApplicationStatus;
  }

  return 'invalid';
}

function toOptionalInternalNote(
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

  const rawApplicationId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const applicationId = toPositiveInt(rawApplicationId);
  const status = toStaffManagedStatus(req.body.status);
  const internalNote = toOptionalInternalNote(req.body.internalNote);

  if (!applicationId) {
    return res.status(400).json({ error: 'Invalid team application id' });
  }

  if (status === 'invalid') {
    return res.status(400).json({
      error: 'status must be one of PENDING, IN_REVIEW, ACCEPTED, REJECTED',
    });
  }

  if (internalNote === 'invalid') {
    return res.status(400).json({ error: 'internalNote must be a string or null' });
  }

  if (status === undefined && internalNote === undefined) {
    return res.status(400).json({ error: 'At least one of status or internalNote is required' });
  }

  try {
    const currentUser = await requireManagerOrAdmin(prisma, req);
    const application = await updateTeamApplicationByAdmin(prisma, {
      applicationId,
      currentUserId: currentUser.id,
      status,
      internalNote,
    });

    return res.status(200).json(application);
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to update team application' });
  }
}
