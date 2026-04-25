'use client';

import Link from 'next/link';
import { useState } from 'react';

type ProgramRequestFormProps = {
  defaultEmail?: string | null;
  defaultName?: string | null;
  programSlug: string;
  programTitle: string;
  leadTitle: string;
  leadDescription: string;
};

type SubmitState =
  | {
      requestId: number;
      type: 'success';
    }
  | {
      message: string;
      type: 'error';
    }
  | null;

export default function ProgramRequestForm({
  defaultEmail,
  defaultName,
  programSlug,
  programTitle,
  leadTitle,
  leadDescription,
}: ProgramRequestFormProps) {
  const [name, setName] = useState(defaultName ?? '');
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [comment, setComment] = useState('');
  const [isCompanyRequest, setIsCompanyRequest] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/program-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment,
          companyName,
          email,
          isCompanyRequest,
          name,
          phone,
          programSlug,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            request?: {
              id: number;
            };
          }
        | null;

      if (!response.ok || !payload?.request) {
        throw new Error(payload?.error || 'Не удалось отправить заявку.');
      }

      setSubmitState({
        requestId: payload.request.id,
        type: 'success',
      });
      setComment('');
      setCompanyName('');
      setPhone('');
      setIsCompanyRequest(false);
    } catch (requestError) {
      setSubmitState({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Не удалось отправить заявку.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitState?.type === 'success') {
    return (
      <div className="panel program-lead-success">
        <span className="eyebrow">Заявка отправлена</span>
        <h2>Мы получили запрос по программе «{programTitle}».</h2>
        <p className="panel-copy">
          Номер заявки: <span className="mono">#{submitState.requestId}</span>. Мы
          свяжемся по указанным контактам и подскажем следующий шаг по доступу или
          запуску программы.
        </p>
        <div className="badge-row">
          <span className="badge badge-paid">заявка принята</span>
          <span className="badge badge-complete">ответим по контакту</span>
        </div>
        <div className="row-actions">
          <button
            className="secondary-button"
            onClick={() => setSubmitState(null)}
            type="button"
          >
            Отправить еще одну заявку
          </button>
          <Link className="ghost-button" href="/">
            Вернуться на главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="panel program-lead-card" id="program-request">
      <span className="eyebrow">Заявка на программу</span>
      <h2>{leadTitle}</h2>
      <p className="panel-copy">{leadDescription}</p>

      {submitState?.type === 'error' ? (
        <p className="feedback feedback-error">{submitState.message}</p>
      ) : null}

      <form className="program-lead-form" onSubmit={handleSubmit}>
        <div className="program-lead-form__grid">
          <div className="field">
            <label htmlFor="program-request-name">Имя</label>
            <input
              id="program-request-name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Как к вам обращаться"
              required
              value={name}
            />
          </div>

          <div className="field">
            <label htmlFor="program-request-email">Email</label>
            <input
              id="program-request-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="mail@example.com"
              type="email"
              value={email}
            />
          </div>

          <div className="field">
            <label htmlFor="program-request-phone">Телефон</label>
            <input
              id="program-request-phone"
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+7 (___) ___-__-__"
              value={phone}
            />
          </div>

          <div className="field">
            <label htmlFor="program-request-company">Компания</label>
            <input
              id="program-request-company"
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Если заявка для команды"
              value={companyName}
            />
          </div>
        </div>

        <label className="checkbox-row program-lead-form__toggle">
          <input
            checked={isCompanyRequest}
            onChange={(event) => setIsCompanyRequest(event.target.checked)}
            type="checkbox"
          />
          <span>Нужно обучение для сотрудников или команды</span>
        </label>

        <div className="field">
          <label htmlFor="program-request-comment">Комментарий</label>
          <textarea
            id="program-request-comment"
            onChange={(event) => setComment(event.target.value)}
            placeholder="Опишите задачу, роль сотрудника или желаемый формат запуска"
            value={comment}
          />
        </div>

        <div className="program-lead-form__footer">
          <div className="program-lead-form__note">
            <span className="badge badge-complete">{programTitle}</span>
            <span className="program-lead-form__hint">
              Можно оставить телефон, email или оба контакта сразу.
            </span>
          </div>
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Отправляем заявку...' : 'Отправить заявку'}
          </button>
        </div>
      </form>
    </div>
  );
}
