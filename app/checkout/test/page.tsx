import { redirect } from 'next/navigation';

import TestCheckoutClient from '@/components/test-checkout-client';
import { getOptionalCurrentUser } from '@/lib/auth';
import { buildAuthHref } from '@/lib/auth-intent';
import {
  createOrderForTariff,
  expireOrderIfNeeded,
  getOrderCheckoutUrl,
  isTestPaymentsEnabled,
} from '@/lib/payments/service';
import prisma from '@/lib/prisma';

type CheckoutPageProps = {
  searchParams: Promise<{
    orderId?: string | string[] | undefined;
    tariffId?: string | string[] | undefined;
  }>;
};

function toPositiveInt(value: string | string[] | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildCheckoutIntent(query: {
  orderId?: string | string[] | undefined;
  tariffId?: string | string[] | undefined;
}) {
  const params = new URLSearchParams();
  const orderId = Array.isArray(query.orderId) ? query.orderId[0] : query.orderId;
  const tariffId = Array.isArray(query.tariffId) ? query.tariffId[0] : query.tariffId;

  if (orderId) {
    params.set('orderId', orderId);
  }

  if (tariffId) {
    params.set('tariffId', tariffId);
  }

  const search = params.toString();
  return search ? `/checkout/test?${search}` : '/checkout/test';
}

export default async function TestCheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const query = await searchParams;
  const user = await getOptionalCurrentUser();

  if (!user) {
    redirect(buildAuthHref('login', buildCheckoutIntent(query)));
  }

  let orderId = toPositiveInt(query.orderId);
  const tariffId = toPositiveInt(query.tariffId);

  if (!orderId && tariffId) {
    const result = await createOrderForTariff({
      userId: user.id,
      tariffId,
    });

    if (result.kind === 'missing_tariff') {
      redirect('/catalog');
    }

    if (result.kind === 'already_owned') {
      redirect(`/courses/${result.tariff.course.slug}`);
    }

    orderId = result.order.id;
    redirect(getOrderCheckoutUrl(orderId));
  }

  if (!orderId) {
    redirect('/lk');
  }

  await expireOrderIfNeeded(orderId);

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: user.id,
    },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      amount: true,
      statusText: true,
      paymentFailureCode: true,
      paymentFailureText: true,
      paymentReference: true,
      createdAt: true,
      expiresAt: true,
      paidAt: true,
      tariff: {
        select: {
          id: true,
          title: true,
          course: {
            select: {
              title: true,
              slug: true,
              description: true,
              lessons: {
                where: {
                  isPublished: true,
                },
                select: {
                  id: true,
                  isPreview: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order) {
    redirect('/lk');
  }

  const lessonsCount = order.tariff.course.lessons.length;
  const previewLessonsCount = order.tariff.course.lessons.filter(
    (lesson) => lesson.isPreview
  ).length;

  return (
    <TestCheckoutClient
      order={{
        id: order.id,
        tariffId: order.tariff.id,
        status: order.status,
        paymentMethod: order.paymentMethod,
        amount: order.amount,
        statusText: order.statusText,
        paymentFailureCode: order.paymentFailureCode,
        paymentFailureText: order.paymentFailureText,
        paymentReference: order.paymentReference,
        createdAt: order.createdAt.toISOString(),
        expiresAt: order.expiresAt?.toISOString() ?? null,
        paidAt: order.paidAt?.toISOString() ?? null,
        tariffTitle: order.tariff.title,
        courseTitle: order.tariff.course.title,
        courseSlug: order.tariff.course.slug,
        courseDescription: order.tariff.course.description,
        lessonsCount,
        previewLessonsCount,
      }}
      testPaymentsEnabled={isTestPaymentsEnabled()}
    />
  );
}
