import { requireAdminRouteUser } from '@/lib/admin-guard';
import { createAdminTariff } from '@/lib/admin-mutations';
import { revalidateAdminPaths } from '@/lib/admin-revalidate';

export async function POST(request: Request) {
  const adminGuard = await requireAdminRouteUser();

  if (!adminGuard.ok) {
    return adminGuard.response;
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return Response.json({ error: 'Не удалось прочитать тело запроса.' }, { status: 400 });
  }

  try {
    const result = await createAdminTariff(body);
    revalidateAdminPaths(result.courseSlug);

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Не удалось создать тариф.' },
      { status: 400 }
    );
  }
}
