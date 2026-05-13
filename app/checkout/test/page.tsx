import { redirect } from 'next/navigation';

type CheckoutPageProps = {
  searchParams: Promise<{
    orderId?: string | string[] | undefined;
    tariffId?: string | string[] | undefined;
  }>;
};

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
  return search ? `/checkout?${search}` : '/checkout';
}

export default async function TestCheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const query = await searchParams;
  redirect(buildCheckoutIntent(query));
}
