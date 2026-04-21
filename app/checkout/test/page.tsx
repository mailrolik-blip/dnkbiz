import { redirect } from 'next/navigation';

import TestCheckoutClient from '@/components/test-checkout-client';
import { getOptionalCurrentUser } from '@/lib/auth';
import { isTestPaymentsEnabled } from '@/lib/orders';
import prisma from '@/lib/prisma';

type CheckoutPageProps = {
  searchParams: Promise<{ orderId?: string | string[] | undefined }>;
};

function readOrderId(value: string | string[] | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function TestCheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const user = await getOptionalCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const query = await searchParams;
  const orderId = readOrderId(query.orderId);

  if (!orderId) {
    redirect('/lk');
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: user.id,
    },
    select: {
      id: true,
      status: true,
      amount: true,
      createdAt: true,
      paidAt: true,
      tariff: {
        select: {
          title: true,
          course: {
            select: {
              title: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    redirect('/lk');
  }

  return (
    <TestCheckoutClient
      order={{
        id: order.id,
        status: order.status,
        amount: order.amount,
        createdAt: order.createdAt.toISOString(),
        paidAt: order.paidAt?.toISOString() ?? null,
        tariffTitle: order.tariff.title,
        courseTitle: order.tariff.course.title,
        courseSlug: order.tariff.course.slug,
      }}
      testPaymentsEnabled={isTestPaymentsEnabled()}
    />
  );
}
