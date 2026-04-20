import type { NextApiRequest, NextApiResponse } from 'next';

import { requireManagerOrAdmin } from '../../../../lib/current-user';
import prisma from '../../../../lib/prisma';
import {
  type StaffManagedRentalBookingStatus,
  updateRentalBookingByStaff,
} from '../../../../lib/rental-bookings';
import { HttpError } from '../../../../lib/training-bookings';

const STAFF_MANAGED_RENTAL_BOOKING_STATUSES: StaffManagedRentalBookingStatus[] = [
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'CANCELLED',
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
): StaffManagedRentalBookingStatus | undefined | 'invalid' {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return 'invalid';
  }

  if (
    STAFF_MANAGED_RENTAL_BOOKING_STATUSES.includes(
      value as StaffManagedRentalBookingStatus
    )
  ) {
    return value as StaffManagedRentalBookingStatus;
  }

  return 'invalid';
}

function toOptionalManagerNote(
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

  const rawBookingId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const bookingId = toPositiveInt(rawBookingId);
  const status = toStaffManagedStatus(req.body.status);
  const managerNote = toOptionalManagerNote(req.body.managerNote);

  if (!bookingId) {
    return res.status(400).json({ error: 'Invalid rental booking id' });
  }

  if (status === 'invalid') {
    return res.status(400).json({
      error: 'status must be one of PENDING_CONFIRMATION, CONFIRMED, CANCELLED',
    });
  }

  if (managerNote === 'invalid') {
    return res.status(400).json({ error: 'managerNote must be a string or null' });
  }

  if (status === undefined && managerNote === undefined) {
    return res.status(400).json({ error: 'At least one of status or managerNote is required' });
  }

  try {
    const currentUser = await requireManagerOrAdmin(prisma, req);
    const booking = await updateRentalBookingByStaff(prisma, {
      bookingId,
      currentUserId: currentUser.id,
      status,
      managerNote,
    });

    return res.status(200).json(booking);
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to update rental booking' });
  }
}
