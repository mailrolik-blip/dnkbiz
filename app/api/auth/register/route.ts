import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import {
  createSessionCookieHeader,
  createSessionToken,
  hashPassword,
} from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  isValidEmail,
  isValidName,
  isValidPasswordLength,
  normalizeEmail,
  normalizeName,
  securityInputLimits,
} from '@/lib/security/input';
import { consumeRateLimit, getRequestClientIp } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { email?: unknown; password?: unknown; name?: unknown }
      | null;

    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === 'string' ? body.password : '';
    const name = normalizeName(body?.name);
    const rateLimit = consumeRateLimit({
      bucket: 'auth-register',
      key: `${getRequestClientIp(request)}:${email || 'unknown'}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return Response.json(
        { error: 'Слишком много попыток регистрации. Повторите позже.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    if (!email) {
      return Response.json({ error: 'Укажите email.' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return Response.json({ error: 'Укажите корректный email.' }, { status: 400 });
    }

    if (!isValidPasswordLength(password)) {
      return Response.json(
        {
          error: `Пароль должен содержать от ${securityInputLimits.passwordMinLength} до ${securityInputLimits.passwordMaxLength} символов.`,
        },
        { status: 400 }
      );
    }

    if (!isValidName(name)) {
      return Response.json(
        {
          error: `Имя не должно быть длиннее ${securityInputLimits.nameMaxLength} символов.`,
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    const token = await createSessionToken(user.id);
    const response = NextResponse.json({ user }, { status: 201 });
    response.headers.append('Set-Cookie', createSessionCookieHeader(token, request));
    return response;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return Response.json(
        { error: 'Пользователь с таким email уже существует.' },
        { status: 409 }
      );
    }

    console.error(error);
    return Response.json({ error: 'Не удалось завершить регистрацию.' }, { status: 500 });
  }
}
