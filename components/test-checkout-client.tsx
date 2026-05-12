'use client';

import type { PaymentMethod } from '@prisma/client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { getCourseCatalogHref } from '@/lib/lms-catalog';
import {
  getPaymentMethodLabel,
  getOrderStatusBadgeClass,
  getOrderStatusLabel,
  isRetryableOrderStatus,
} from '@/lib/payments/constants';
import {
  formatCoursePrice,
  formatLessonCount,
  formatPreviewLessons,
} from '@/lib/purchase-ux';

type CheckoutOrder = {
  id: number;
  tariffId: number;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELED' | 'EXPIRED';
  paymentMethod: PaymentMethod;
  amount: number;
  statusText: string | null;
  paymentFailureCode: string | null;
  paymentFailureText: string | null;
  paymentReference: string | null;
  createdAt: string;
  expiresAt: string | null;
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

type PaymentMethodOption = {
  value: PaymentMethod;
  label: string;
  description: string;
  badge?: string;
};

const MANUAL_SBP_QR_SRC = '/payments/sbp-qr-manual.png';

function formatDateTime(value: string | null) {
  if (!value) {
    return 'не указано';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getOrderTitle(order: CheckoutOrder) {
  if (order.status === 'PAID') {
    return 'Доступ к курсу открыт';
  }

  if (order.status === 'PROCESSING') {
    return 'Платеж отправлен на проверку';
  }

  if (order.status === 'FAILED') {
    return 'Оплата не подтверждена';
  }

  if (order.status === 'CANCELED') {
    return 'Оплата отменена';
  }

  if (order.status === 'EXPIRED') {
    return 'Срок действия заказа истек';
  }

  if (order.paymentMethod === 'MANUAL') {
    return 'Оплатите курс по СБП';
  }

  return 'Завершите покупку курса';
}

function getOrderSummary(order: CheckoutOrder) {
  if (order.paymentMethod === 'MANUAL') {
    if (order.status === 'PAID') {
      return 'Оплата подтверждена менеджером. Курс уже доступен в полном объеме.';
    }

    if (order.status === 'PROCESSING') {
      return 'Платеж отправлен на ручную проверку. Повторно оплачивать заказ не нужно: дождитесь подтверждения менеджера и затем обновите статус.';
    }

    if (order.status === 'FAILED') {
      return 'Менеджер не смог подтвердить поступление оплаты по этому заказу. Проверьте перевод и создайте новый заказ при необходимости.';
    }

    if (order.status === 'CANCELED') {
      return 'Этот заказ отменен. При необходимости создайте новый заказ и оплатите его заново.';
    }

    if (order.status === 'EXPIRED') {
      return 'У этого заказа истек срок действия. Создайте новый заказ, чтобы снова открыть QR для оплаты.';
    }

    return 'Отсканируйте QR в банковском приложении, оплатите заказ и нажмите «Я оплатил». После этого платеж уйдет на ручную проверку менеджеру.';
  }

  if (order.statusText) {
    return order.statusText;
  }

  if (order.status === 'PAID') {
    return 'Покупка завершена. Курс уже доступен в полном объеме и синхронизирован с личным кабинетом.';
  }

  if (order.status === 'PROCESSING') {
    return 'Платеж ожидает обновления статуса. Обновите страницу позже или вернитесь в кабинет.';
  }

  if (order.status === 'FAILED') {
    return 'Платеж не был подтвержден. Можно выбрать способ оплаты заново и повторить покупку.';
  }

  if (order.status === 'CANCELED') {
    return 'Этот заказ отменен. При необходимости начните оплату заново.';
  }

  if (order.status === 'EXPIRED') {
    return 'У этого заказа истек срок действия. Создайте новый заказ, чтобы продолжить покупку.';
  }

  return 'После подтверждения оплаты курс откроется в личном кабинете и будет доступен для прохождения в полном объеме.';
}

function getPaymentMethodOptions(
  testPaymentsEnabled: boolean
): PaymentMethodOption[] {
  const options: PaymentMethodOption[] = [
    {
      value: 'MANUAL',
      label: 'СБП / ручная проверка',
      description:
        'Оплатите заказ по QR в приложении банка и нажмите «Я оплатил». После этого менеджер проверит платеж вручную.',
      badge: 'основной',
    },
  ];

  if (testPaymentsEnabled) {
    options.push({
      value: 'TEST',
      label: 'Тестовая оплата',
      description:
        'Временный fallback для разработки и staging-проверок. Позволяет подтвердить покупку без боевого эквайринга.',
      badge: 'dev only',
    });
  }

  return options;
}

export default function TestCheckoutClient({
  order,
  testPaymentsEnabled,
}: TestCheckoutClientProps) {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
    testPaymentsEnabled || order.paymentMethod !== 'TEST'
      ? order.paymentMethod
      : 'MANUAL'
  );
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: 'error' | 'success';
    message: string;
  } | null>(null);

  const methodOptions = getPaymentMethodOptions(testPaymentsEnabled);
  const isManualSelected = selectedMethod === 'MANUAL';
  const canSwitchMethod = order.status === 'PENDING';
  const canRetry = isRetryableOrderStatus(order.status);
  const canSubmitManualReview = order.status === 'PENDING' && isManualSelected;
  const canConfirmTestPayment =
    testPaymentsEnabled && selectedMethod === 'TEST' && order.status === 'PENDING';
  const showManualQr =
    isManualSelected && (order.status === 'PENDING' || order.status === 'PROCESSING');
  const courseBackHref =
    order.status === 'PAID' || order.previewLessonsCount > 0
      ? `/courses/${order.courseSlug}`
      : getCourseCatalogHref(order.courseSlug);
  const courseBackLabel =
    order.status === 'PAID' || order.previewLessonsCount > 0
      ? 'Назад к курсу'
      : 'Назад к странице курса';

  async function handleManualSubmit() {
    setPending(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/orders/${order.id}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethod: 'MANUAL',
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            order?: { status: CheckoutOrder['status'] };
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || 'Не удалось отправить платеж на проверку.');
      }

      setFeedback({
        tone: 'success',
        message:
          payload?.order?.status === 'PROCESSING'
            ? 'Платеж отправлен на ручную проверку. Как только менеджер подтвердит оплату, доступ к курсу откроется.'
            : 'Статус заказа обновлен.',
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Не удалось отправить платеж на проверку.',
      });
    } finally {
      setPending(false);
    }
  }

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
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error ? error.message : 'Не удалось подтвердить оплату.',
      });
      setPending(false);
      return;
    }

    setPending(false);
  }

  async function handleRetryPurchase() {
    setPending(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tariffId: order.tariffId,
          paymentMethod: selectedMethod,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            checkoutUrl?: string;
          }
        | null;

      if (!response.ok || !payload?.checkoutUrl) {
        throw new Error(payload?.error || 'Не удалось создать новый заказ.');
      }

      router.push(payload.checkoutUrl);
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error ? error.message : 'Не удалось создать новый заказ.',
      });
      setPending(false);
      return;
    }

    setPending(false);
  }

  function renderPrimaryAction() {
    if (order.status === 'PAID') {
      return (
        <Link href={`/courses/${order.courseSlug}`} className="primary-button">
          Открыть курс
        </Link>
      );
    }

    if (canRetry) {
      return (
        <button
          className="primary-button"
          disabled={pending}
          onClick={handleRetryPurchase}
          type="button"
        >
          {pending ? 'Создаем новый заказ...' : 'Попробовать снова'}
        </button>
      );
    }

    if (canConfirmTestPayment) {
      return (
        <button
          className="primary-button"
          disabled={pending}
          onClick={handleTestPay}
          type="button"
        >
          {pending ? 'Подтверждаем оплату...' : 'Оплатить курс'}
        </button>
      );
    }

    if (canSubmitManualReview) {
      return (
        <button
          className="primary-button"
          disabled={pending}
          onClick={handleManualSubmit}
          type="button"
        >
          {pending ? 'Отправляем на проверку...' : 'Я оплатил'}
        </button>
      );
    }

    if (order.status === 'PROCESSING') {
      return (
        <button
          className="primary-button"
          disabled={pending}
          onClick={() => router.refresh()}
          type="button"
        >
          Проверить статус
        </button>
      );
    }

    return (
      <button className="primary-button" disabled type="button">
        Способ оплаты недоступен
      </button>
    );
  }

  return (
    <main className="page-shell">
      <div className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>Бизнес школа ДНК</span>
        </Link>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link href="/catalog" className="ghost-button">
            В каталог
          </Link>
          <Link href="/lk" className="ghost-button">
            В кабинет
          </Link>
        </div>
      </div>

      <section className="stack-grid">
        <article className="panel">
          <div className="badge-row" style={{ marginTop: 0 }}>
            <span className="eyebrow">Покупка курса</span>
            <span className={getOrderStatusBadgeClass(order.status)}>
              {getOrderStatusLabel(order.status)}
            </span>
          </div>
          <h1 style={{ marginTop: '0.9rem' }}>{getOrderTitle(order)}</h1>
          <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
            {getOrderSummary(order)}
          </p>
        </article>

        <div className="grid-two">
          <section className="panel">
            <span className="eyebrow">Доступ к курсу</span>
            <h2 style={{ marginTop: '0.9rem' }}>{order.courseTitle}</h2>
            <p className="muted-text" style={{ marginTop: '0.75rem' }}>
              {order.tariffTitle}
            </p>
            {order.courseDescription ? (
              <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
                {order.courseDescription}
              </p>
            ) : null}

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
                    : 'без ознакомительных уроков'}
                </dd>
              </div>
              <div>
                <dt>Способ оплаты</dt>
                <dd>{getPaymentMethodLabel(selectedMethod)}</dd>
              </div>
            </div>

            <div className="status-stack" style={{ marginTop: '1rem' }}>
              <div className="status-card">
                <strong>Что входит в доступ</strong>
                <p>
                  Все уроки курса, домашние задания, сохранение прогресса и возврат в
                  кабинет с того места, где вы остановились.
                </p>
              </div>
              <div className="status-card">
                <strong>До покупки</strong>
                <p>
                  {order.previewLessonsCount > 0
                    ? `Можно открыть ${formatPreviewLessons(
                        order.previewLessonsCount
                      )} и оценить курс до оплаты.`
                    : 'Курс открывается только после подтверждения оплаты.'}
                </p>
              </div>
              <div className="status-card">
                <strong>После подтверждения оплаты</strong>
                <p>
                  Курс откроется в режиме FULL и появится в личном кабинете сразу после
                  ручного подтверждения менеджером.
                </p>
              </div>
            </div>
          </section>

          <section className="panel">
            <span className="eyebrow">Заказ и оплата</span>
            <h2 style={{ marginTop: '0.9rem' }}>Заказ #{order.id}</h2>

            <div className="badge-row" style={{ marginTop: '1rem' }}>
              <span className={getOrderStatusBadgeClass(order.status)}>
                {getOrderStatusLabel(order.status)}
              </span>
              <span className="badge badge-complete">
                Создан {formatDateTime(order.createdAt)}
              </span>
              {order.expiresAt ? (
                <span className="badge badge-pending">
                  Действует до {formatDateTime(order.expiresAt)}
                </span>
              ) : null}
              {order.paidAt ? (
                <span className="badge badge-paid">
                  Оплачен {formatDateTime(order.paidAt)}
                </span>
              ) : null}
            </div>

            <p className="panel-copy" style={{ marginTop: '1rem' }}>
              {getOrderSummary(order)}
            </p>

            {showManualQr ? (
              <div className="manual-qr-card" style={{ marginTop: '1rem' }}>
                <div className="manual-qr-card__image">
                  <Image
                    alt="QR-код СБП для ручной оплаты"
                    height={320}
                    src={MANUAL_SBP_QR_SRC}
                    width={320}
                  />
                </div>
                <div className="manual-qr-card__content">
                  <div className="status-card">
                    <strong>Как оплатить</strong>
                    <p>
                      Отсканируйте QR в банковском приложении, переведите{' '}
                      {formatCoursePrice(order.amount)} и затем нажмите «Я оплатил».
                    </p>
                  </div>
                  <div className="status-card">
                    <strong>Что проверить перед отправкой</strong>
                    <p>
                      Номер заказа: #{order.id}. Курс: {order.courseTitle}. Сумма:{' '}
                      {formatCoursePrice(order.amount)}.
                    </p>
                  </div>
                  <div className="status-card">
                    <strong>После кнопки «Я оплатил»</strong>
                    <p>
                      Заказ перейдет в ожидание ручной проверки. Если статус уже «Проверка
                      оплаты», повторно оплачивать заказ не нужно.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {feedback ? (
              <p
                className={`feedback ${
                  feedback.tone === 'success' ? 'feedback-success' : 'feedback-error'
                }`}
              >
                {feedback.message}
              </p>
            ) : null}

            <div className="status-stack" style={{ marginTop: '1rem' }}>
              <div className="status-card">
                <strong>Способ оплаты</strong>
                <p>
                  Выберите подходящий сценарий. Для СБП платеж проверяется вручную, а
                  тестовая оплата нужна только для внутренней разработки.
                </p>
              </div>

              <div className="course-grid checkout-methods" style={{ marginTop: 0 }}>
                {methodOptions.map((method) => {
                  const isSelected = selectedMethod === method.value;

                  return (
                    <button
                      key={method.value}
                      type="button"
                      className={`course-card payment-method-card ${
                        isSelected ? 'payment-method-card--selected' : ''
                      }`}
                      disabled={!canSwitchMethod}
                      onClick={() => setSelectedMethod(method.value)}
                    >
                      <div className="badge-row">
                        <span className={isSelected ? 'badge badge-paid' : 'badge badge-pending'}>
                          {method.label}
                        </span>
                        {method.badge ? (
                          <span className="badge badge-complete">{method.badge}</span>
                        ) : null}
                      </div>
                      <p className="muted-text" style={{ marginTop: '0.75rem' }}>
                        {method.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="row-actions checkout-actions" style={{ marginTop: '1rem' }}>
              {renderPrimaryAction()}
              <Link href={courseBackHref} className="secondary-button">
                {courseBackLabel}
              </Link>
            </div>

            <div className="checkout-mobile-bar">
              {renderPrimaryAction()}
              <Link href={courseBackHref} className="secondary-button">
                {courseBackLabel}
              </Link>
            </div>

            <div className="status-stack" style={{ marginTop: '1rem' }}>
              <div className="status-card">
                <strong>Что делать дальше</strong>
                <p>
                  {order.status === 'PAID'
                    ? 'Перейдите в курс или вернитесь в кабинет, чтобы продолжить обучение.'
                    : order.status === 'PROCESSING'
                    ? 'Платеж уже на ручной проверке. Дождитесь подтверждения менеджера и затем обновите статус заказа.'
                    : canRetry
                    ? 'Создайте новый заказ и повторите оплату через нужный способ.'
                    : isManualSelected
                    ? 'Оплатите заказ по QR и нажмите «Я оплатил», чтобы передать платеж на ручную проверку.'
                    : 'Подтвердите покупку тестовым способом и сразу откройте курс.'}
                </p>
              </div>
              {order.paymentFailureText ? (
                <div className="status-card">
                  <strong>Причина статуса</strong>
                  <p>{order.paymentFailureText}</p>
                </div>
              ) : null}
              {order.paymentReference ? (
                <div className="status-card">
                  <strong>Идентификатор платежа</strong>
                  <p>{order.paymentReference}</p>
                </div>
              ) : null}
              {testPaymentsEnabled ? (
                <div className="status-card">
                  <strong>Тестовый fallback</strong>
                  <p>
                    Этот способ подтверждения оплаты включается только через
                    <span className="mono"> ENABLE_TEST_PAYMENTS=true</span>. В публичном
                    окружении он должен оставаться выключенным и нужен только для
                    разработки и коротких staging-проверок.
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
