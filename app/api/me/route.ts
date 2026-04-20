import { getOptionalCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getOptionalCurrentUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  return Response.json({ user });
}
