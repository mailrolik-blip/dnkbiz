import { NextResponse } from 'next/server';

import {
  createClearedSessionCookieHeader,
} from '@/lib/auth';

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.headers.append('Set-Cookie', createClearedSessionCookieHeader(request));
  return response;
}
