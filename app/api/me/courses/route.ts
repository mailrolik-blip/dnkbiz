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
          lessons: {
            where: {
              isPublished: true,
            },
            orderBy: {
              position: 'asc',
            },
            select: {
              title: true,
              progress: {
                where: {
                  userId: user.id,
                },
                select: {
                  completed: true,
                },
                take: 1,
              },
            },
          },
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
      lessonsCount: item.course.lessons.length,
      completedLessonsCount: item.course.lessons.filter(
        (lesson) => lesson.progress[0]?.completed
      ).length,
      progressPercent:
        item.course.lessons.length > 0
          ? Math.round(
              (item.course.lessons.filter((lesson) => lesson.progress[0]?.completed)
                .length /
                item.course.lessons.length) *
                100
            )
          : 0,
      nextLessonTitle:
        item.course.lessons.find((lesson) => !lesson.progress[0]?.completed)?.title ??
        item.course.lessons[0]?.title ??
        null,
      enrolledAt: item.createdAt,
    })),
  });
}
