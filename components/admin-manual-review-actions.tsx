'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type AdminManualReviewActionsProps = {
  orderId: number;
};

export default function AdminManualReviewActions({
  orderId,
}: AdminManualReviewActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: 'error' | 'success';
    message: string;
  } | null>(null);

  async function handleAction(action: 'approve' | 'reject') {
    const confirmed = window.confirm(
      action === 'approve'
        ? `Подтвердить оплату по заказу #${orderId}? Перед этим проверьте поступление денег.`
        : `Отклонить оплату по заказу #${orderId}? Доступ к курсу не откроется.`
    );

    if (!confirmed) {
      return;
    }

    setPendingAction(action);
    setFeedback(null);

    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          action === 'approve'
            ? {
                status: 'PAID',
                statusText: 'Оплата подтверждена. Полный доступ к курсу открыт.',
              }
            : {
                status: 'FAILED',
                statusText: 'Оплата не подтверждена после ручной проверки.',
                paymentFailureCode: 'manual_review_rejected',
                paymentFailureText:
                  'Поступление оплаты по этому заказу не удалось подтвердить.',
              }
        ),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            (action === 'approve'
              ? 'Не удалось подтвердить оплату.'
              : 'Не удалось отклонить заказ.')
        );
      }

      setFeedback({
        tone: 'success',
        message:
          action === 'approve'
            ? 'Оплата подтверждена. Доступ к курсу открыт.'
            : 'Заказ отклонен. Доступ к курсу не открыт.',
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : action === 'approve'
            ? 'Не удалось подтвердить оплату.'
            : 'Не удалось отклонить заказ.',
      });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="admin-review-actions">
      <button
        className="primary-button"
        disabled={pendingAction !== null}
        onClick={() => handleAction('approve')}
        type="button"
      >
        {pendingAction === 'approve' ? 'Подтверждаем...' : 'Подтвердить оплату'}
      </button>
      <button
        className="secondary-button"
        disabled={pendingAction !== null}
        onClick={() => handleAction('reject')}
        type="button"
      >
        {pendingAction === 'reject' ? 'Отклоняем...' : 'Отклонить'}
      </button>
      {feedback ? (
        <p
          className={`feedback ${
            feedback.tone === 'success' ? 'feedback-success' : 'feedback-error'
          }`}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
