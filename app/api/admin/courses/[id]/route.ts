import { requireAdminRouteUser } from '@/lib/admin-guard';
import { updateAdminCourse } from '@/lib/admin-mutations';
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
  const courseId = Number(id);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return Response.json({ error: 'Некорректный идентификатор курса.' }, { status: 400 });
  }

  if (!body) {
    return Response.json({ error: 'Не удалось прочитать тело запроса.' }, { status: 400 });
  }

  try {
    const course = await updateAdminCourse(courseId, body);
    revalidateAdminPaths(course.slug);

    return Response.json({ course });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Не удалось обновить курс.' },
      { status: 400 }
    );
  }
}
