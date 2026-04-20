import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import {
  createSessionCookieHeader,
  createSessionToken,
  hashPassword,
} from '@/lib/auth';
import prisma from '@/lib/prisma';

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeName(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { email?: unknown; password?: unknown; name?: unknown }
      | null;

    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === 'string' ? body.password : '';
    const name = normalizeName(body?.name);

    if (!email) {
      return Response.json({ error: 'Email is required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json(
        { error: 'Password must be at least 8 characters.' },
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
        { error: 'A user with this email already exists.' },
        { status: 409 }
      );
    }

    console.error(error);
    return Response.json({ error: 'Registration failed.' }, { status: 500 });
  }
}
