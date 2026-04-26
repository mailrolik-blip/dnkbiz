import { NextResponse } from 'next/server';

import {
  createSessionCookieHeader,
  createSessionToken,
  verifyPassword,
} from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isValidEmail, isValidLoginPasswordLength, normalizeEmail } from '@/lib/security/input';
import { consumeRateLimit, getRequestClientIp } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { email?: unknown; password?: unknown }
      | null;

    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === 'string' ? body.password : '';
    const rateLimit = consumeRateLimit({
      bucket: 'auth-login',
      key: `${getRequestClientIp(request)}:${email || 'unknown'}`,
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return Response.json(
        { error: 'Слишком много попыток входа. Повторите позже.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    if (!email || !password) {
      return Response.json({ error: 'Укажите email и пароль.' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return Response.json({ error: 'Укажите корректный email.' }, { status: 400 });
    }

    if (!isValidLoginPasswordLength(password)) {
      return Response.json({ error: 'Некорректный пароль.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
      },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return Response.json({ error: 'Неверный email или пароль.' }, { status: 401 });
    }

    const token = await createSessionToken(user.id);
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 }
    );

    response.headers.append('Set-Cookie', createSessionCookieHeader(token, request));

    return response;
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Не удалось выполнить вход.' }, { status: 500 });
  }
}
