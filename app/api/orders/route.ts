import { getOptionalCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

function toPositiveInt(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function POST(request: Request) {
  const user = await getOptionalCurrentUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { tariffId?: unknown }
    | null;
  const tariffId = toPositiveInt(body?.tariffId);

  if (!tariffId) {
    return Response.json({ error: 'tariffId must be a positive integer.' }, { status: 400 });
  }

  const tariff = await prisma.tariff.findFirst({
    where: {
      id: tariffId,
      isActive: true,
      course: {
        isPublished: true,
      },
    },
    select: {
      id: true,
      price: true,
      title: true,
      courseId: true,
      course: {
        select: {
          title: true,
          slug: true,
        },
      },
    },
  });

  if (!tariff) {
    return Response.json({ error: 'Tariff not found.' }, { status: 404 });
  }

  const [existingEnrollment, existingPendingOrder] = await Promise.all([
    prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: tariff.courseId,
        },
      },
    }),
    prisma.order.findFirst({
      where: {
        userId: user.id,
        tariffId: tariff.id,
        status: 'PENDING',
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (existingEnrollment) {
    return Response.json(
      { error: 'Course is already unlocked for this user.' },
      { status: 409 }
    );
  }

  if (existingPendingOrder) {
    return Response.json(
      { error: `Pending order #${existingPendingOrder.id} already exists for this tariff.` },
      { status: 409 }
    );
  }

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      tariffId: tariff.id,
      amount: tariff.price,
      status: 'PENDING',
    },
    select: {
      id: true,
      status: true,
      amount: true,
      createdAt: true,
    },
  });

  return Response.json(
    {
      order,
      tariff: {
        title: tariff.title,
        courseTitle: tariff.course.title,
        courseSlug: tariff.course.slug,
      },
    },
    { status: 201 }
  );
}
