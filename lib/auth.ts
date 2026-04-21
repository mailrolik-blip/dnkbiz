import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

import type { UserRole } from '@prisma/client';
import { cookies } from 'next/headers';

import prisma from './prisma';

const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME?.trim() || 'dnkbiz_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type SessionPayload = {
  userId: number;
  exp: number;
};

type CookieRequestLike = Request | URL | string | undefined;
type SessionCookieOptions = {
  httpOnly: true;
  maxAge: number;
  path: string;
  sameSite: 'lax';
  secure: boolean;
  expires?: Date;
};

export type CurrentUser = {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

function derivePasswordKey(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error('AUTH_SECRET is not set.');
  }

  return secret;
}

function signPayload(encodedPayload: string) {
  return createHmac('sha256', getAuthSecret())
    .update(encodedPayload)
    .digest('base64url');
}

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function shouldUseSecureCookies(request: CookieRequestLike) {
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  if (!request) {
    return true;
  }

  try {
    const url =
      request instanceof Request
        ? new URL(request.url)
        : request instanceof URL
          ? request
          : new URL(request);

    return !isLocalHostname(url.hostname);
  } catch {
    return true;
  }
}

function encodeSession(payload: SessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function decodeSession(token: string | undefined | null) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split('.');

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as
    | SessionPayload
    | undefined;

  if (!payload?.userId || payload.exp <= Date.now()) {
    return null;
  }

  return payload;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await derivePasswordKey(password, salt);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(':');

  if (!salt || !storedHash) {
    return false;
  }

  const storedBuffer = Buffer.from(storedHash, 'hex');
  const derivedKey = await derivePasswordKey(password, salt);

  return (
    storedBuffer.length === derivedKey.length &&
    timingSafeEqual(storedBuffer, derivedKey)
  );
}

export async function createSessionToken(userId: number) {
  return encodeSession({
    userId,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  });
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function getSessionCookieOptions(request?: CookieRequestLike): SessionCookieOptions {
  return {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax' as const,
    secure: shouldUseSecureCookies(request),
  };
}

export function getClearedSessionCookieOptions(request?: CookieRequestLike) {
  return {
    ...getSessionCookieOptions(request),
    expires: new Date(0),
    maxAge: 0,
  };
}

function serializeCookieValue(value: string) {
  return encodeURIComponent(value);
}

function serializeCookie(name: string, value: string, options: SessionCookieOptions) {
  const parts = [
    `${name}=${serializeCookieValue(value)}`,
    `Path=${options.path}`,
    `Max-Age=${options.maxAge}`,
    `SameSite=${options.sameSite}`,
  ];

  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function createSessionCookieHeader(token: string, request?: CookieRequestLike) {
  return serializeCookie(
    getSessionCookieName(),
    token,
    getSessionCookieOptions(request)
  );
}

export function createClearedSessionCookieHeader(request?: CookieRequestLike) {
  return serializeCookie(
    getSessionCookieName(),
    '',
    getClearedSessionCookieOptions(request)
  );
}

export async function getOptionalCurrentUser(): Promise<CurrentUser | null> {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = decodeSession(sessionCookie);

  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
