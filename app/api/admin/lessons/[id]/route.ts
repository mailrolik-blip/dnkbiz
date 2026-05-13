import { requireAdminRouteUser } from '@/lib/admin-guard';
import {
  deleteAdminLesson,
  updateAdminLesson,
} from '@/lib/admin-mutations';
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
  const lessonId = Number(id);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return Response.json({ error: 'Некорректный идентификатор урока.' }, { status: 400 });
  }

  if (!body) {
    return Response.json({ error: 'Не удалось прочитать тело запроса.' }, { status: 400 });
  }

  try {
    const result = await updateAdminLesson(lessonId, body);
    revalidateAdminPaths(result.courseSlug);

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Не удалось обновить урок.' },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const adminGuard = await requireAdminRouteUser();

  if (!adminGuard.ok) {
    return adminGuard.response;
  }

  const { id } = await params;
  const lessonId = Number(id);

  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return Response.json({ error: 'Некорректный идентификатор урока.' }, { status: 400 });
  }

  try {
    const result = await deleteAdminLesson(lessonId);
    revalidateAdminPaths(result.courseSlug);

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Не удалось удалить урок.' },
      { status: 400 }
    );
  }
}
