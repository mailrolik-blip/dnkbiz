'use client';

import type { PaymentMethod } from '@prisma/client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { getCourseCatalogHref } from '@/lib/lms-catalog';
import {
  getOrderStatusBadgeClass,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  isRetryableOrderStatus,
} from '@/lib/payments/constants';
import {
  formatCoursePrice,
  formatLessonCount,
  formatPreviewLessons,
} from '@/lib/purchase-ux';
import { publicContact } from '@/lib/public-site';

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

type CheckoutClientProps = {
  order: CheckoutOrder;
  tbankEnabled: boolean;
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

function isTbankPrimaryFlow(order: CheckoutOrder, tbankEnabled: boolean) {
  return tbankEnabled && order.status === 'PENDING' && order.paymentMethod !== 'TEST';
}

function getCheckoutPaymentMethod(order: CheckoutOrder, tbankEnabled: boolean): PaymentMethod {
  if (isTbankPrimaryFlow(order, tbankEnabled)) {
    return 'TBANK';
  }

  return order.paymentMethod;
}

function getOrderTitle(order: CheckoutOrder, tbankEnabled: boolean) {
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

  if (isTbankPrimaryFlow(order, tbankEnabled)) {
    return 'Перейдите к оплате через T-Bank';
  }

  return 'Оплатите курс по QR СБП';
}

function getOrderSummary(order: CheckoutOrder, tbankEnabled: boolean) {
  if (order.status === 'PAID') {
    return 'Оплата подтверждена. Полный доступ к курсу уже открыт.';
  }

  if (order.status === 'PROCESSING') {
    return 'Платеж уже отправлен на ручную проверку. Повторно оплачивать заказ не нужно. Дождитесь подтверждения оплаты и затем обновите статус.';
  }

  if (order.status === 'FAILED') {
    return 'Поступление оплаты по этому заказу не удалось подтвердить. Проверьте платеж и при необходимости создайте новый заказ.';
  }

  if (order.status === 'CANCELED') {
    return 'Этот заказ отменен. При необходимости создайте новый заказ и оплатите его заново.';
  }

  if (order.status === 'EXPIRED') {
    return 'У этого заказа истек срок действия. Создайте новый заказ, чтобы снова открыть оплату.';
  }

  if (isTbankPrimaryFlow(order, tbankEnabled)) {
    return 'Основной сценарий оплаты ведет в T-Bank PaymentURL. После подтверждения оплаты статус заказа обновится автоматически, а доступ к курсу откроется без дополнительных шагов.';
  }

  return 'Отсканируйте QR СБП в банковском приложении, оплатите курс и затем нажмите «Я оплатил вручную», чтобы отправить платеж на ручную проверку.';
}

export default function TestCheckoutClient({
  order,
  tbankEnabled,
}: CheckoutClientProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [manualFallbackOpen, setManualFallbackOpen] = useState(
    !isTbankPrimaryFlow(order, tbankEnabled) || order.status === 'PROCESSING'
  );
  const [feedback, setFeedback] = useState<{
    tone: 'error' | 'success';
    message: string;
  } | null>(null);

  const canRetry = isRetryableOrderStatus(order.status);
  const canSubmitManualReview = order.status === 'PENDING';
  const tbankPrimaryFlow = isTbankPrimaryFlow(order, tbankEnabled);
  const showManualFallbackToggle = tbankPrimaryFlow;
  const showManualQr =
    (order.status === 'PENDING' || order.status === 'PROCESSING') &&
    (manualFallbackOpen || !tbankEnabled || order.status === 'PROCESSING');
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
        throw new Error(payload?.error || 'Не удалось отправить платеж на ручную проверку.');
      }

      setManualFallbackOpen(true);
      setFeedback({
        tone: 'success',
        message:
          payload?.order?.status === 'PROCESSING'
            ? 'Платеж отправлен на ручную проверку. Как только оплата будет подтверждена, курс откроется полностью.'
            : 'Статус заказа обновлен.',
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Не удалось отправить платеж на ручную проверку.',
      });
    } finally {
      setPending(false);
    }
  }

  async function handleTbankCheckout() {
    setPending(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/orders/${order.id}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethod: 'TBANK',
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            paymentUrl?: string | null;
          }
        | null;

      if (!response.ok || !payload?.paymentUrl) {
        throw new Error(
          payload?.error ||
            'Не удалось открыть оплату через T-Bank. Можно перейти к ручной оплате.'
        );
      }

      window.location.assign(payload.paymentUrl);
    } catch (error) {
      setManualFallbackOpen(true);
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Не удалось открыть оплату через T-Bank. Можно перейти к ручной оплате.',
      });
      setPending(false);
      return;
    }
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
        message: error instanceof Error ? error.message : 'Не удалось создать новый заказ.',
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
          {pending ? 'Создаем новый заказ...' : 'Создать новый заказ'}
        </button>
      );
    }

    if (tbankPrimaryFlow) {
      return (
        <button
          className="primary-button"
          disabled={pending}
          onClick={handleTbankCheckout}
          type="button"
        >
          {pending ? 'Открываем T-Bank...' : 'Оплатить через T-Bank'}
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
          {pending ? 'Отправляем на проверку...' : 'Я оплатил вручную'}
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
        Оплата недоступна
      </button>
    );
  }

  function renderManualFallbackToggle() {
    if (!showManualFallbackToggle) {
      return null;
    }

    return (
      <button
        className="ghost-button"
        disabled={pending}
        onClick={() => setManualFallbackOpen((current) => !current)}
        type="button"
      >
        {manualFallbackOpen ? 'Скрыть ручную оплату' : 'Другой способ оплаты'}
      </button>
    );
  }

  return (
    <main className="page-shell page-shell--with-sticky-mobile-bar">
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
          <h1 style={{ marginTop: '0.9rem' }}>{getOrderTitle(order, tbankEnabled)}</h1>
          <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
            {getOrderSummary(order, tbankEnabled)}
          </p>
        </article>

        <div className="grid-two">
          <section className="panel">
            <span className="eyebrow">Курс и доступ</span>
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
                <dt>Стоимость</dt>
                <dd>{formatCoursePrice(order.amount)}</dd>
              </div>
              <div>
                <dt>Внутри курса</dt>
                <dd>{formatLessonCount(order.lessonsCount)}</dd>
              </div>
              <div>
                <dt>До оплаты</dt>
                <dd>
                  {order.previewLessonsCount > 0
                    ? formatPreviewLessons(order.previewLessonsCount)
                    : 'без ознакомительных уроков'}
                </dd>
              </div>
              <div>
                <dt>Способ оплаты</dt>
                <dd>{getPaymentMethodLabel(getCheckoutPaymentMethod(order, tbankEnabled))}</dd>
              </div>
            </div>

            <div className="status-stack" style={{ marginTop: '1rem' }}>
              <div className="status-card">
                <strong>Что входит в доступ</strong>
                <p>
                  Все уроки курса, домашние задания, сохранение прогресса и возврат в кабинет с
                  того места, где вы остановились.
                </p>
              </div>
              <div className="status-card">
                <strong>Как открывается курс</strong>
                <p>
                  После подтверждения оплаты курс полностью открывается и появляется в личном
                  кабинете без дополнительных шагов.
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
              <span className="badge badge-complete">Создан {formatDateTime(order.createdAt)}</span>
              {order.expiresAt ? (
                <span className="badge badge-pending">
                  Действует до {formatDateTime(order.expiresAt)}
                </span>
              ) : null}
              {order.paidAt ? (
                <span className="badge badge-paid">Оплачен {formatDateTime(order.paidAt)}</span>
              ) : null}
            </div>

            <p className="panel-copy" style={{ marginTop: '1rem' }}>
              {getOrderSummary(order, tbankEnabled)}
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
                    <strong>Ручная оплата по QR</strong>
                    <p>
                      Используйте этот сценарий как запасной, если T-Bank не открылся или нужен
                      резервный способ оплаты. Отсканируйте QR в банковском приложении и переведите{' '}
                      {formatCoursePrice(order.amount)}.
                    </p>
                  </div>
                  <div className="status-card">
                    <strong>Проверьте перед подтверждением</strong>
                    <p>
                      Курс: {order.courseTitle}. Сумма: {formatCoursePrice(order.amount)}. Номер
                      заказа: #{order.id}.
                    </p>
                  </div>
                  <div className="status-card">
                    <strong>После кнопки «Я оплатил вручную»</strong>
                    <p>
                      Заказ перейдет в ожидание подтверждения оплаты. Проверка может занять
                      некоторое время. Если статус уже «Проверка оплаты», повторно отправлять заказ
                      не нужно.
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

            <div className="row-actions checkout-actions" style={{ marginTop: '1rem' }}>
              {renderPrimaryAction()}
              <Link href={courseBackHref} className="secondary-button">
                {courseBackLabel}
              </Link>
              {renderManualFallbackToggle()}
            </div>

            <div className="checkout-mobile-bar">
              {renderPrimaryAction()}
              <Link href={courseBackHref} className="secondary-button">
                {courseBackLabel}
              </Link>
            </div>

            {showManualFallbackToggle ? (
              <div className="row-actions" style={{ marginTop: '0.75rem' }}>
                {renderManualFallbackToggle()}
              </div>
            ) : null}

            <div className="status-stack" style={{ marginTop: '1rem' }}>
              <div className="status-card">
                <strong>Что делать дальше</strong>
                <p>
                  {order.status === 'PAID'
                    ? 'Перейдите в курс или вернитесь в кабинет, чтобы продолжить обучение.'
                    : order.status === 'PROCESSING'
                    ? 'Платеж уже на ручной проверке. Дождитесь завершения проверки оплаты и затем обновите статус заказа. Если проверка затянулась, свяжитесь с нами.'
                    : canRetry
                    ? 'Создайте новый заказ и снова откройте оплату. После подтверждения оплаты доступ откроется автоматически.'
                    : tbankPrimaryFlow
                    ? 'Откройте T-Bank, завершите оплату и затем вернитесь на страницу заказа. Если ссылка не открылась, используйте ручную оплату как запасной сценарий.'
                    : 'Оплатите заказ по QR СБП и затем нажмите «Я оплатил вручную», чтобы передать платеж на ручную проверку.'}
                </p>
              </div>
              <div className="status-card">
                <strong>Если возник вопрос</strong>
                <p>
                  Подготовьте номер заказа #{order.id} и название курса. Напишите в{' '}
                  <a href={publicContact.telegramHref} rel="noreferrer" target="_blank">
                    Telegram {publicContact.telegramLabel}
                  </a>{' '}
                  или позвоните по номеру{' '}
                  <a href={publicContact.phoneHref}>{publicContact.phoneLabel}</a>.
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
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
