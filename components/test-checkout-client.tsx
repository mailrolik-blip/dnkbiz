'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type CheckoutOrder = {
  id: number;
  status: 'PENDING' | 'PAID' | 'CANCELED';
  amount: number;
  createdAt: string;
  paidAt: string | null;
  tariffTitle: string;
  courseTitle: string;
  courseSlug: string;
};

type TestCheckoutClientProps = {
  order: CheckoutOrder;
  testPaymentsEnabled: boolean;
};

function formatMoney(value: number) {
  return `${value.toLocaleString('ru-RU')} ₽`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'ещё не оплачено';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getStatusLabel(status: CheckoutOrder['status']) {
  if (status === 'PAID') {
    return 'Оплачен';
  }

  if (status === 'CANCELED') {
    return 'Отменён';
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
        throw new Error(payload?.error || 'Не удалось выполнить тестовую оплату.');
      }

      router.push(`/courses/${payload.courseSlug}`);
      router.refresh();
    } catch (paymentError) {
      setFeedback({
        tone: 'error',
        message:
          paymentError instanceof Error
            ? paymentError.message
            : 'Не удалось выполнить тестовую оплату.',
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
          <span>БИЗНЕС ШКОЛА ДНК</span>
        </Link>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link href="/lk" className="ghost-button">
            В кабинет
          </Link>
        </div>
      </div>

      <section className="stack-grid">
        <article className="panel">
          <span className="eyebrow">Тестовая оплата</span>
          <h1 style={{ marginTop: '0.9rem' }}>Проверьте заказ и сразу откройте курс.</h1>
          <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
            Это MVP-страница для локального checkout-flow без реальной платежки. После
            тестовой оплаты заказ перейдёт в статус PAID, доступ к курсу откроется автоматически.
          </p>
        </article>

        <div className="grid-two">
          <section className="panel">
            <span className="eyebrow">Заказ</span>
            <h2 style={{ marginTop: '0.9rem' }}>Заказ #{order.id}</h2>

            <div className="feature-metrics" style={{ marginTop: '1rem' }}>
              <div>
                <dt>Тариф</dt>
                <dd>{order.tariffTitle}</dd>
              </div>
              <div>
                <dt>Курс</dt>
                <dd>{order.courseTitle}</dd>
              </div>
              <div>
                <dt>Сумма</dt>
                <dd>{formatMoney(order.amount)}</dd>
              </div>
              <div>
                <dt>Создан</dt>
                <dd>{formatDateTime(order.createdAt)}</dd>
              </div>
            </div>

            <div className="badge-row" style={{ marginTop: '1rem' }}>
              <span className={getStatusClass(order.status)}>{getStatusLabel(order.status)}</span>
              {order.status === 'PAID' ? (
                <span className="badge badge-complete">
                  оплачено {formatDateTime(order.paidAt)}
                </span>
              ) : null}
            </div>

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
              {order.status === 'PAID' ? (
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
                  {pending ? 'Проводим оплату...' : 'Оплатить тестово'}
                </button>
              ) : (
                <button className="primary-button" disabled type="button">
                  Оплата недоступна
                </button>
              )}

              <Link href="/lk" className="secondary-button">
                Назад
              </Link>
            </div>
          </section>

          <section className="panel">
            <span className="eyebrow">Что произойдёт дальше</span>
            <div className="status-stack" style={{ marginTop: '1rem' }}>
              <div className="status-card">
                <strong>1. Смена статуса</strong>
                <p>Тестовый endpoint переведёт ваш заказ из PENDING в PAID.</p>
              </div>
              <div className="status-card">
                <strong>2. Выдача доступа</strong>
                <p>Для курса автоматически создастся Enrollment по текущей рабочей логике.</p>
              </div>
              <div className="status-card">
                <strong>3. Редирект в обучение</strong>
                <p>После успешной оплаты вы сразу попадёте на защищённую страницу курса.</p>
              </div>
            </div>

            {!testPaymentsEnabled ? (
              <div className="feedback feedback-error" style={{ marginTop: '1rem' }}>
                Тестовые оплаты отключены. Для локального MVP включите флаг
                <span className="mono"> ENABLE_TEST_PAYMENTS=true</span>.
              </div>
            ) : null}

            {order.status === 'CANCELED' ? (
              <div className="feedback feedback-error" style={{ marginTop: '1rem' }}>
                Этот заказ отменён и не может быть оплачен повторно.
              </div>
            ) : null}

            {order.status === 'PAID' ? (
              <div className="feedback feedback-success" style={{ marginTop: '1rem' }}>
                Заказ уже оплачен. Доступ к курсу открыт.
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}
