import type { Prisma, PrismaClient, StaffRole } from '@prisma/client';
import type { NextApiRequest } from 'next';
import type { NextApiResponse } from 'next';

import { currentUserSelect } from './selects';
import { GLOBAL_STAFF_ROLES } from './staff';
import { HttpError } from './training-bookings';

const DEV_CURRENT_USER_HEADER = 'x-user-id';
const DEV_CURRENT_USER_COOKIE = 'gorilla_dev_user_id';
const DEV_CURRENT_USER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type CurrentUserRecord = Prisma.UserGetPayload<{
  select: typeof currentUserSelect;
}>;

export type CurrentUserRole = 'USER' | 'COACH' | StaffRole;

export type CurrentUser = {
  id: number;
  email: string | null;
  phone: string | null;
  telegramId: string | null;
  staffRole: StaffRole | null;
  roles: CurrentUserRole[];
  coachedTeamIds: number[];
  profile: CurrentUserRecord['profiles'][number] | null;
  preferredCity: CurrentUserRecord['profiles'][number]['city'] | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CurrentUserSummary = {
  id: number;
  profile: CurrentUser['profile'];
  staffRole: CurrentUser['staffRole'];
  roles: CurrentUser['roles'];
  preferredCity: CurrentUser['preferredCity'];
  email: string | null;
  phone: string | null;
  telegramId: string | null;
};

function parsePositiveInteger(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function parseCookiesFromHeader(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, part) => {
    const [rawName, ...rawValueParts] = part.split('=');

    if (!rawName || rawValueParts.length === 0) {
      return cookies;
    }

    const name = rawName.trim();
    const value = rawValueParts.join('=').trim();

    if (!name) {
      return cookies;
    }

    cookies[name] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function getRequestCookies(req: NextApiRequest) {
  if (req.cookies && Object.keys(req.cookies).length > 0) {
    return req.cookies;
  }

  const cookieHeader = Array.isArray(req.headers.cookie)
    ? req.headers.cookie[0]
    : req.headers.cookie;

  return parseCookiesFromHeader(cookieHeader);
}

function serializeCookie(options: {
  name: string;
  value: string;
  maxAge?: number;
  expires?: Date;
}) {
  const parts = [
    `${options.name}=${encodeURIComponent(options.value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  return parts.join('; ');
}

function getCurrentUserIdFromDevCookie(req: NextApiRequest): number | null {
  const cookies = getRequestCookies(req);
  return parsePositiveInteger(cookies[DEV_CURRENT_USER_COOKIE]);
}

function getCurrentUserIdFromSession(req: NextApiRequest): number | null {
  // Reserved for future cookie/session-backed auth providers.
  void req;
  return null;
}

function getCurrentUserIdFromDevHeader(req: NextApiRequest): number | null {
  const rawUserId = req.headers[DEV_CURRENT_USER_HEADER];
  const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
  return parsePositiveInteger(userId);
}

function mapCurrentUser(user: CurrentUserRecord): CurrentUser {
  const profile = user.profiles[0] ?? null;
  const roles: CurrentUserRole[] = ['USER'];
  const coachedTeamIds = user.memberships.map((membership) => membership.teamId);

  if (coachedTeamIds.length > 0) {
    roles.push('COACH');
  }

  if (user.staffRole !== null && !roles.includes(user.staffRole)) {
    roles.push(user.staffRole);
  }

  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    telegramId: user.telegramId,
    staffRole: user.staffRole,
    roles,
    coachedTeamIds,
    profile,
    preferredCity: profile?.city ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function toCurrentUserSummary(currentUser: CurrentUser): CurrentUserSummary {
  return {
    id: currentUser.id,
    profile: currentUser.profile,
    staffRole: currentUser.staffRole,
    roles: currentUser.roles,
    preferredCity: currentUser.preferredCity,
    email: currentUser.email,
    phone: currentUser.phone,
    telegramId: currentUser.telegramId,
  };
}

export function getCurrentUserId(req: NextApiRequest): number | null {
  return (
    getCurrentUserIdFromSession(req) ??
    getCurrentUserIdFromDevCookie(req) ??
    getCurrentUserIdFromDevHeader(req)
  );
}

export async function getCurrentUserById(
  prisma: PrismaClient,
  userId: number
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: currentUserSelect,
  });

  return user ? mapCurrentUser(user) : null;
}

export async function getCurrentUser(
  prisma: PrismaClient,
  req: NextApiRequest
): Promise<CurrentUser | null> {
  const currentUserId = getCurrentUserId(req);

  if (!currentUserId) {
    return null;
  }

  return getCurrentUserById(prisma, currentUserId);
}

export const optionalCurrentUser = getCurrentUser;

export async function requireCurrentUser(
  prisma: PrismaClient,
  req: NextApiRequest
) {
  const currentUser = await getCurrentUser(prisma, req);

  if (!currentUser) {
    throw new HttpError(401, 'Current user is not authenticated');
  }

  return currentUser;
}

export async function requireStaffUser(
  prisma: PrismaClient,
  req: NextApiRequest
) {
  const currentUser = await requireCurrentUser(prisma, req);

  if (
    currentUser.coachedTeamIds.length === 0 &&
    (currentUser.staffRole === null ||
      !GLOBAL_STAFF_ROLES.includes(currentUser.staffRole))
  ) {
    throw new HttpError(403, 'Staff access required');
  }

  return currentUser;
}

export async function requireManagerOrAdmin(
  prisma: PrismaClient,
  req: NextApiRequest
) {
  const currentUser = await requireCurrentUser(prisma, req);

  if (
    currentUser.staffRole === null ||
    !GLOBAL_STAFF_ROLES.includes(currentUser.staffRole)
  ) {
    throw new HttpError(403, 'Manager or admin access required');
  }

  return currentUser;
}

export function isDevAuthBridgeEnabled() {
  return process.env.NODE_ENV !== 'production';
}

export function assertDevAuthBridgeEnabled() {
  if (!isDevAuthBridgeEnabled()) {
    throw new HttpError(404, 'Not found');
  }
}

export function setDevCurrentUserCookie(
  res: NextApiResponse,
  userId: number
) {
  res.setHeader(
    'Set-Cookie',
    serializeCookie({
      name: DEV_CURRENT_USER_COOKIE,
      value: String(userId),
      maxAge: DEV_CURRENT_USER_COOKIE_MAX_AGE_SECONDS,
    })
  );
}

export function clearDevCurrentUserCookie(res: NextApiResponse) {
  res.setHeader(
    'Set-Cookie',
    serializeCookie({
      name: DEV_CURRENT_USER_COOKIE,
      value: '',
      maxAge: 0,
      expires: new Date(0),
    })
  );
}
