'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  formatCoursePrice,
  formatLessonCount,
  formatPreviewLessons,
} from '@/lib/purchase-ux';

type CheckoutOrder = {
  id: number;
  status: 'PENDING' | 'PAID' | 'CANCELED';
  amount: number;
  createdAt: string;
  paidAt: string | null;
  tariffTitle: string;
  courseTitle: string;
  courseSlug: string;
  courseDescription: string | null;
  lessonsCount: number;
  previewLessonsCount: number;
};

type TestCheckoutClientProps = {
  order: CheckoutOrder;
  testPaymentsEnabled: boolean;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return 'еще не подтверждено';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getStatusLabel(status: CheckoutOrder['status']) {
  if (status === 'PAID') {
    return 'Доступ открыт';
  }

  if (status === 'CANCELED') {
    return 'Покупка отменена';
  }

  return 'Ожидает оплаты';
}

function getStatusClass(status: CheckoutOrder['status']) {
  if (status === 'PAID') {
    return 'badge badge-paid';
  }

  if (status === 'CANCELED') {
    return 'badge badge-canceled';
  }

  return 'badge badge-pending';
}

export default function TestCheckoutClient({
  order,
  testPaymentsEnabled,
}: TestCheckoutClientProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: 'error' | 'success';
    message: string;
  } | null>(null);

  const canPay = testPaymentsEnabled && order.status === 'PENDING';
  const isPaid = order.status === 'PAID';

  async function handleTestPay() {
    setPending(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/orders/${order.id}/test-pay`, {
        method: 'POST',
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            courseSlug?: string;
          }
        | null;

      if (!response.ok || !payload?.courseSlug) {
        throw new Error(payload?.error || 'Не удалось подтвердить оплату.');
      }

      router.push(`/courses/${payload.courseSlug}`);
      router.refresh();
    } catch (paymentError) {
      setFeedback({
        tone: 'error',
        message:
          paymentError instanceof Error
            ? paymentError.message
            : 'Не удалось подтвердить оплату.',
      });
      setPending(false);
      return;
    }

    setPending(false);
  }

  return (
    <main className="page-shell">
      <div className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>Бизнес школа ДНК</span>
        </Link>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link href="/lk" className="ghost-button">
            В кабинет
          </Link>
        </div>
      </div>

      <section className="stack-grid">
        <article className="panel">
          <div className="badge-row" style={{ marginTop: 0 }}>
            <span className="eyebrow">Покупка курса</span>
            {testPaymentsEnabled ? (
              <span className="badge badge-pending">dev/test flow</span>
            ) : null}
          </div>
          <h1 style={{ marginTop: '0.9rem' }}>
            {isPaid ? 'Доступ к курсу открыт' : 'Завершите покупку курса'}
          </h1>
          <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
            {order.courseDescription ||
              'После подтверждения оплаты курс откроется в личном кабинете и будет доступен для прохождения в полном объеме.'}
          </p>
        </article>

        <div className="grid-two">
          <section className="panel">
            <span className="eyebrow">Доступ к курсу</span>
            <h2 style={{ marginTop: '0.9rem' }}>{order.courseTitle}</h2>
            <p className="muted-text" style={{ marginTop: '0.75rem' }}>
              {order.tariffTitle}
            </p>

            <div className="feature-metrics" style={{ marginTop: '1rem' }}>
              <div>
                <dt>Цена</dt>
                <dd>{formatCoursePrice(order.amount)}</dd>
              </div>
              <div>
                <dt>Внутри курса</dt>
                <dd>{formatLessonCount(order.lessonsCount)}</dd>
              </div>
              <div>
                <dt>До покупки</dt>
                <dd>
                  {order.previewLessonsCount > 0
                    ? formatPreviewLessons(order.previewLessonsCount)
                    : 'без первых уроков до покупки'}
                </dd>
              </div>
              <div>
                <dt>Статус</dt>
                <dd>{getStatusLabel(order.status)}</dd>
              </div>
            </div>

            <div className="status-stack" style={{ marginTop: '1rem' }}>
              <div className="status-card">
                <strong>Что входит в доступ</strong>
                <p>Все уроки курса, домашние задания, сохранение прогресса и возврат в кабинет с того места, где вы остановились.</p>
              </div>
              <div className="status-card">
                <strong>До покупки</strong>
                <p>
                  {order.previewLessonsCount > 0
                    ? `Вы можете открыть ${formatPreviewLessons(
                        order.previewLessonsCount
                      )} и познакомиться с курсом до оплаты.`
                    : 'Курс открывается только после оплаты.'}
                </p>
              </div>
              <div className="status-card">
                <strong>После оплаты</strong>
                <p>Курс сразу открывается в режиме FULL и становится доступен в личном кабинете без ручной выдачи доступа.</p>
              </div>
            </div>
          </section>

          <section className="panel">
            <span className="eyebrow">Статус покупки</span>
            <h2 style={{ marginTop: '0.9rem' }}>Заказ #{order.id}</h2>

            <div className="badge-row" style={{ marginTop: '1rem' }}>
              <span className={getStatusClass(order.status)}>{getStatusLabel(order.status)}</span>
              <span className="badge badge-complete">Создан {formatDateTime(order.createdAt)}</span>
              {isPaid ? (
                <span className="badge badge-paid">Оплачен {formatDateTime(order.paidAt)}</span>
              ) : null}
            </div>

            <p className="panel-copy" style={{ marginTop: '1rem' }}>
              {isPaid
                ? 'Покупка завершена. Можно сразу открыть курс и продолжить обучение.'
                : order.status === 'CANCELED'
                ? 'Этот заказ отменен и больше не может быть использован для открытия курса.'
                : 'Оплата уже начата. Подтвердите покупку, чтобы открыть полный доступ ко всем урокам курса.'}
            </p>

            {feedback ? (
              <p
                className={`feedback ${
                  feedback.tone === 'success' ? 'feedback-success' : 'feedback-error'
                }`}
              >
                {feedback.message}
              </p>
            ) : null}

            <div className="row-actions" style={{ marginTop: '1rem' }}>
              {isPaid ? (
                <Link href={`/courses/${order.courseSlug}`} className="primary-button">
                  Открыть курс
                </Link>
              ) : canPay ? (
                <button
                  className="primary-button"
                  disabled={pending}
                  onClick={handleTestPay}
                  type="button"
                >
                  {pending ? 'Подтверждаем оплату...' : 'Оплатить курс'}
                </button>
              ) : (
                <button className="primary-button" disabled type="button">
                  Оплата недоступна
                </button>
              )}

              <Link href={`/courses/${order.courseSlug}`} className="secondary-button">
                Назад к курсу
              </Link>
            </div>

            <div className="status-stack" style={{ marginTop: '1rem' }}>
              <div className="status-card">
                <strong>Следующий шаг</strong>
                <p>
                  {isPaid
                    ? 'Перейдите в курс и продолжайте обучение без ограничений.'
                    : 'После подтверждения оплаты курс автоматически откроется в полном доступе.'}
                </p>
              </div>
              {testPaymentsEnabled ? (
                <div className="status-card">
                  <strong>Текущий режим оплаты</strong>
                  <p>В локальной среде подтверждение платежа работает через dev/test flow, но сам пользовательский сценарий уже соответствует обычной покупке курса.</p>
                </div>
              ) : (
                <div className="feedback feedback-error" style={{ marginTop: 0 }}>
                  Для локальной покупки включите <span className="mono">ENABLE_TEST_PAYMENTS=true</span>.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
