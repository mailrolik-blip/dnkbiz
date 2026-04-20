import type { NextApiRequest, NextApiResponse } from 'next';

import {
  type StaffManagedRentalSlotStatus,
  updateRentalSlotByStaff,
} from '../../../../lib/admin-rental-slots';
import { requireManagerOrAdmin } from '../../../../lib/current-user';
import prisma from '../../../../lib/prisma';
import { HttpError } from '../../../../lib/training-bookings';

const STAFF_MANAGED_RENTAL_SLOT_STATUSES: StaffManagedRentalSlotStatus[] = [
  'AVAILABLE',
  'BOOKED',
  'UNAVAILABLE',
];

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function toDate(value: unknown): Date | null {
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function toStaffManagedRentalSlotStatus(
  value: unknown
): StaffManagedRentalSlotStatus | undefined | 'invalid' {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return 'invalid';
  }

  if (
    STAFF_MANAGED_RENTAL_SLOT_STATUSES.includes(
      value as StaffManagedRentalSlotStatus
    )
  ) {
    return value as StaffManagedRentalSlotStatus;
  }

  return 'invalid';
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
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawSlotId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const slotId = toPositiveInt(rawSlotId);
  const startsAt =
    req.body.startsAt === undefined ? undefined : toDate(req.body.startsAt);
  const endsAt =
    req.body.endsAt === undefined ? undefined : toDate(req.body.endsAt);
  const status = toStaffManagedRentalSlotStatus(req.body.status);
  const visibleToPublic = toOptionalBoolean(
    req.body.visibleToPublic ?? req.body.isPublic
  );

  if (!slotId) {
    return res.status(400).json({ error: 'Invalid rental slot id' });
  }

  if (startsAt === null) {
    return res.status(400).json({ error: 'startsAt must be a valid date' });
  }

  if (endsAt === null) {
    return res.status(400).json({ error: 'endsAt must be a valid date' });
  }

  if (status === 'invalid') {
    return res.status(400).json({
      error: 'status must be one of AVAILABLE, BOOKED, UNAVAILABLE',
    });
  }

  if (visibleToPublic === 'invalid') {
    return res.status(400).json({ error: 'visibleToPublic must be true or false' });
  }

  if (
    startsAt === undefined &&
    endsAt === undefined &&
    status === undefined &&
    visibleToPublic === undefined
  ) {
    return res.status(400).json({
      error: 'At least one of status, startsAt, endsAt or visibleToPublic is required',
    });
  }

  if (startsAt !== undefined && endsAt !== undefined && endsAt <= startsAt) {
    return res.status(400).json({ error: 'endsAt must be later than startsAt' });
  }

  try {
    const currentUser = await requireManagerOrAdmin(prisma, req);
    const slot = await updateRentalSlotByStaff(prisma, {
      slotId,
      currentUserId: currentUser.id,
      ...(status !== undefined ? { status } : {}),
      ...(startsAt !== undefined ? { startsAt } : {}),
      ...(endsAt !== undefined ? { endsAt } : {}),
      ...(visibleToPublic !== undefined ? { visibleToPublic } : {}),
    });

    return res.status(200).json(slot);
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to update rental slot' });
  }
}
