import { getOptionalCurrentUser } from '@/lib/auth';
import { getCourseForViewer } from '@/lib/course-access';

type RouteParams = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getOptionalCurrentUser();

  if (!user) {
    return Response.json({ error: 'Требуется авторизация.' }, { status: 401 });
  }

  const { slug } = await params;
  const course = await getCourseForViewer(slug, user.id);

  if (!course) {
    return Response.json(
      { error: 'Доступ к этому курсу не открыт.' },
      { status: 403 }
    );
  }

  return Response.json({ course });
}
