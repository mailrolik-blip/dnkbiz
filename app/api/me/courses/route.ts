import { getOptionalCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const user = await getOptionalCurrentUser();

  if (!user) {
    return Response.json({ error: 'Требуется авторизация.' }, { status: 401 });
  }

  const courses = await prisma.enrollment.findMany({
    where: {
      userId: user.id,
      course: {
        isPublished: true,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      createdAt: true,
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
        },
      },
    },
  });

  return Response.json({
    courses: courses.map((item) => ({
      id: item.course.id,
      title: item.course.title,
      slug: item.course.slug,
      description: item.course.description,
      enrolledAt: item.createdAt,
    })),
  });
}
