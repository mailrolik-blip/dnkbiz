import { requireAdminRouteUser } from '@/lib/admin-guard';
import { updateAdminTariff } from '@/lib/admin-mutations';
import { revalidateAdminPaths } from '@/lib/admin-revalidate';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const adminGuard = await requireAdminRouteUser();

  if (!adminGuard.ok) {
    return adminGuard.response;
  }

  const { id } = await params;
  const tariffId = Number(id);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!Number.isInteger(tariffId) || tariffId <= 0) {
    return Response.json({ error: 'Некорректный идентификатор тарифа.' }, { status: 400 });
  }

  if (!body) {
    return Response.json({ error: 'Не удалось прочитать тело запроса.' }, { status: 400 });
  }

  try {
    const result = await updateAdminTariff(tariffId, body);
    revalidateAdminPaths(result.courseSlug);

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Не удалось обновить тариф.' },
      { status: 400 }
    );
  }
}
