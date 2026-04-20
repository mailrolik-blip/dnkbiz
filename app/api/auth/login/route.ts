import { NextResponse } from 'next/server';

import {
  createSessionCookieHeader,
  createSessionToken,
  verifyPassword,
} from '@/lib/auth';
import prisma from '@/lib/prisma';

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { email?: unknown; password?: unknown }
      | null;

    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      return Response.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
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
      return Response.json({ error: 'Invalid credentials.' }, { status: 401 });
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
    return Response.json({ error: 'Login failed.' }, { status: 500 });
  }
}
