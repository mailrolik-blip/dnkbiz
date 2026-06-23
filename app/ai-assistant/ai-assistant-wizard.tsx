'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';

type WizardStatus = {
  message: string;
  tone: 'error' | 'success';
} | null;

type WorkspaceTab = 'chat' | 'request' | 'functions' | 'status';

type ChatMessage = {
  author: 'assistant' | 'user';
  text: string;
};

export type AiAssistantWizardSummary = {
  businessType: string;
  channels: string[];
  comment: string | null;
  contact: string;
  contactOverride?: string | null;
  name: string;
  pain: string;
  requestId?: number;
  status?: string;
  tasks: string[];
  user?: {
    email: string;
    id: number;
    name: string | null;
  } | null;
};

type WizardOption = {
  detail?: string;
  marker: string;
  title: string;
  value: string;
};

const businessTypes: WizardOption[] = [
  { marker: '01', title: 'Салон', detail: 'студия услуг', value: 'салон / студия услуг' },
  { marker: '02', title: 'Обучение', detail: 'эксперты', value: 'обучение / эксперты' },
  { marker: '03', title: 'Магазин', detail: 'продажи', value: 'магазин / продажи' },
  { marker: '04', title: 'Производство', detail: 'handmade', value: 'производство / handmade' },
  { marker: '05', title: 'Другое', value: 'другое' },
];

const pains: WizardOption[] = [
  { marker: '01', title: 'Запись клиентов', value: 'запись клиентов' },
  { marker: '02', title: 'Частые вопросы', value: 'ответы на частые вопросы' },
  { marker: '03', title: 'Потеря заявок', value: 'потеря заявок' },
  { marker: '04', title: 'Обучение сотрудников', value: 'обучение сотрудников' },
  { marker: '05', title: 'Контроль процессов', value: 'контроль процессов' },
  { marker: '06', title: 'Все на собственнике', value: 'собственник все делает сам' },
  { marker: '07', title: 'Другое', value: 'другое' },
];

const taskOptions: WizardOption[] = [
  { marker: '01', title: 'Первичные ответы', detail: 'клиентам', value: 'первичные ответы клиентам' },
  { marker: '02', title: 'Сбор заявки', value: 'сбор заявки' },
  { marker: '03', title: 'Запись', detail: 'напоминания', value: 'запись / напоминания' },
  { marker: '04', title: 'База знаний', value: 'база знаний' },
  { marker: '05', title: 'Инструкции', detail: 'для команды', value: 'подготовка инструкций' },
  { marker: '06', title: 'Разбор проблемы', value: 'разбор проблемы' },
  { marker: '07', title: 'Контроль задач', detail: 'повторяющихся', value: 'контроль повторяющихся задач' },
  { marker: '08', title: 'Помощь администратору', value: 'помощь администратору' },
  { marker: '09', title: 'Обучение сотрудников', value: 'помощь в обучении сотрудников' },
  { marker: '10', title: 'Уведомления', detail: 'собственнику', value: 'уведомления собственнику' },
  { marker: '11', title: 'Таблица / CRM', detail: 'передача заявки', value: 'передача заявки в таблицу/CRM' },
];

const channelOptions: WizardOption[] = [
  { marker: 'TG', title: 'Telegram', value: 'Telegram' },
  { marker: 'WA', title: 'WhatsApp', value: 'WhatsApp' },
  { marker: 'SM', title: 'Instagram', detail: 'VK', value: 'Instagram/VK' },
  { marker: 'PH', title: 'Телефон', value: 'телефон' },
  { marker: 'CR', title: 'CRM', value: 'CRM' },
  { marker: 'TB', title: 'Таблицы', value: 'таблицы' },
  { marker: 'MN', title: 'Вручную', value: 'вручную' },
];

const steps = [
  { title: 'Тип бизнеса', note: 'Выберите ближайший формат, чтобы помощник понимал контекст.' },
  { title: 'Главная боль', note: 'Что сейчас забирает больше всего внимания или денег.' },
  { title: 'Функции помощника', note: 'Соберите набор возможностей для первого теста.' },
  { title: 'Каналы общения', note: 'Где сейчас появляются вопросы, заявки и ручная рутина.' },
  { title: 'Контакт', note: 'Куда вернуться с тестовым сценарием помощника.' },
] as const;

const workspaceTabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'chat', label: 'Чат' },
  { id: 'request', label: 'Заявка' },
  { id: 'functions', label: 'Функции' },
  { id: 'status', label: 'Статус' },
];

const assistantMockReply =
  'Пилотный помощник пока отвечает в тестовом режиме. Опишите задачу, вопрос клиента или ручной процесс, и мы используем это для подготовки сценария.';

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function formatList(values: string[]) {
  return values.length > 0 ? values.join(', ') : 'Не выбрано';
}

function getFunctionCountLabel(count: number) {
  if (count === 1) {
    return 'Вы выбрали 1 функцию помощника';
  }

  if (count > 1 && count < 5) {
    return `Вы выбрали ${count} функции помощника`;
  }

  return `Вы выбрали ${count} функций помощника`;
}

function createSessionId(summary: AiAssistantWizardSummary) {
  return `dnk-ai-${summary.requestId ?? 'draft'}-${Date.now().toString(36)}`;
}

function getStatusLabel(status?: string) {
  if (status === 'READY') {
    return 'Готово к тесту';
  }

  if (status === 'IN_PROGRESS') {
    return 'В работе';
  }

  if (status === 'REVIEWED') {
    return 'На рассмотрении';
  }

  if (status === 'CLOSED') {
    return 'Закрыта';
  }

  return 'Заявка отправлена';
}

function SummaryRows({ summary }: { summary: AiAssistantWizardSummary }) {
  return (
    <div className="ai-flow-summary ai-flow-summary--lines">
      <p><strong>Бизнес:</strong> {summary.businessType}</p>
      <p><strong>Боль:</strong> {summary.pain}</p>
      <p><strong>Помощнику:</strong> {formatList(summary.tasks)}</p>
      <p><strong>Каналы:</strong> {formatList(summary.channels)}</p>
      <p><strong>Контакт:</strong> {summary.name} · {summary.contact}</p>
      {summary.comment ? <p><strong>Комментарий:</strong> {summary.comment}</p> : null}
    </div>
  );
}

function AssistantWorkspace({
  onReset,
  status,
  summary,
}: {
  onReset: () => void;
  status: WizardStatus;
  summary: AiAssistantWizardSummary;
}) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('chat');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [sessionId] = useState(() => createSessionId(summary));

  async function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = chatInput.trim();

    if (!message || isAssistantTyping) {
      return;
    }

    setChatInput('');
    setChatError(null);
    setChatMessages((current) => [...current, { author: 'user', text: message }]);
    setIsAssistantTyping(true);

    try {
      const response = await fetch('/api/ai-assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessType: summary.businessType,
          channels: summary.channels,
          message,
          pain: summary.pain,
          requestId: summary.requestId ?? null,
          sessionId,
          tasks: summary.tasks,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; reply?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || 'Не удалось получить ответ помощника.');
      }

      setChatMessages((current) => [
        ...current,
        {
          author: 'assistant',
          text: payload?.reply || assistantMockReply,
        },
      ]);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : assistantMockReply;
      setChatError(messageText);
      setChatMessages((current) => [...current, { author: 'assistant', text: messageText }]);
    } finally {
      setIsAssistantTyping(false);
    }
  }

  return (
    <section className="ai-flow-card ai-flow-card--workspace ai-assistant-workspace">
      <header className="ai-workspace-header">
        <div>
          <span className="badge badge-complete">{getStatusLabel(summary.status)}</span>
          <h2>AI-помощник</h2>
          <p>Чат открыт по умолчанию. Служебная информация по заявке доступна во вкладках.</p>
        </div>
        <div className="ai-workspace-header__actions">
          <Link className="ghost-button" href="/lk">В кабинет</Link>
          <button className="secondary-button" onClick={onReset} type="button">Новая задача</button>
        </div>
      </header>

      <div className="ai-workspace-tabs" role="tablist" aria-label="Разделы AI-помощника">
        {workspaceTabs.map((tab) => (
          <button
            aria-selected={activeTab === tab.id}
            className={`ai-workspace-tabs__button ${activeTab === tab.id ? 'ai-workspace-tabs__button--active' : ''}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'chat' ? (
        <div className="ai-chat-panel" role="tabpanel">
          <div className="ai-chat-panel__messages">
            {chatMessages.length === 0 ? (
              <div className="ai-chat-empty">
                <span className="eyebrow">AI-помощник</span>
                <h3>Напишите задачу или вопрос</h3>
                <p>Можно описать вопрос клиента, ручной процесс администратора или то, что хочется передать помощнику.</p>
              </div>
            ) : (
              chatMessages.map((message, index) => (
                <div
                  className={`ai-chat-message ${message.author === 'assistant' ? 'ai-chat-message--assistant' : ''}`}
                  key={`${message.author}-${index}`}
                >
                  <span>{message.author === 'assistant' ? 'AI-помощник' : 'Вы'}</span>
                  <p>{message.text}</p>
                </div>
              ))
            )}
            {isAssistantTyping ? (
              <div className="ai-chat-typing">
                <span />
                <span />
                <span />
                помощник отвечает
              </div>
            ) : null}
          </div>
          {chatError ? <p className="ai-flow-inline-status ai-flow-inline-status--error">{chatError}</p> : null}
          <form className="ai-chat-input" onSubmit={handleChatSubmit}>
            <input
              aria-label="Сообщение AI-помощнику"
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Напишите сообщение помощнику"
              value={chatInput}
            />
            <button className="primary-button" disabled={isAssistantTyping || !chatInput.trim()} type="submit">
              Отправить
            </button>
          </form>
        </div>
      ) : null}

      {activeTab === 'request' ? (
        <div className="ai-workspace-tab-panel" role="tabpanel">
          <SummaryRows summary={summary} />
        </div>
      ) : null}

      {activeTab === 'functions' ? (
        <div className="ai-workspace-tab-panel" role="tabpanel">
          <div className="ai-function-badges">
            {summary.tasks.map((task) => (
              <span className="ai-function-badge" key={task}>{task}</span>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === 'status' ? (
        <div className="ai-workspace-tab-panel" role="tabpanel">
          <div className="ai-status-card">
            <span className="badge badge-pending">{getStatusLabel(summary.status)}</span>
            <h3>{summary.requestId ? `Заявка #${summary.requestId}` : 'Заявка сохранена'}</h3>
            <p>Администратор видит заявку в очереди и готовит тестовый сценарий. Чат можно использовать для уточнений.</p>
            {status ? <p className="ai-flow-inline-status ai-flow-inline-status--success">{status.message}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function AiAssistantWizard({
  currentUser,
  initialSummary = null,
}: {
  currentUser: {
    email: string;
    id: number;
    name: string | null;
  } | null;
  initialSummary?: AiAssistantWizardSummary | null;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [businessType, setBusinessType] = useState('');
  const [pain, setPain] = useState('');
  const [tasks, setTasks] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [name, setName] = useState(currentUser?.name ?? '');
  const [contact, setContact] = useState('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<WizardStatus>(null);
  const [summary, setSummary] = useState<AiAssistantWizardSummary | null>(initialSummary);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaultContact = currentUser?.email ?? '';
  const resolvedName = currentUser?.name?.trim() || currentUser?.email || name.trim();
  const resolvedContact = contact.trim() || defaultContact;

  const currentStep = steps[stepIndex];
  const canContinue = useMemo(() => {
    if (stepIndex === 0) {
      return Boolean(businessType);
    }

    if (stepIndex === 1) {
      return Boolean(pain);
    }

    if (stepIndex === 2) {
      return tasks.length > 0;
    }

    if (stepIndex === 3) {
      return channels.length > 0;
    }

    if (currentUser) {
      return Boolean(resolvedName && resolvedContact);
    }

    return Boolean(name.trim() && contact.trim());
  }, [
    businessType,
    channels.length,
    contact,
    currentUser,
    name,
    pain,
    resolvedContact,
    resolvedName,
    stepIndex,
    tasks.length,
  ]);

  function resetWizard() {
    setStepIndex(0);
    setBusinessType('');
    setPain('');
    setTasks([]);
    setChannels([]);
    setName(currentUser?.name ?? '');
    setContact('');
    setComment('');
    setStatus(null);
    setSummary(null);
  }

  function goNext() {
    setStatus(null);

    if (!canContinue) {
      setStatus({
        message: 'Выберите обязательный вариант, чтобы продолжить.',
        tone: 'error',
      });
      return;
    }

    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  async function submitRequest() {
    setStatus(null);

    if (!canContinue) {
      setStatus({
        message: currentUser
          ? 'Проверьте контакт для связи.'
          : 'Заполните имя и Telegram/телефон, чтобы отправить заявку.',
        tone: 'error',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/ai-assistant/interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessType,
          channels,
          comment,
          contact: resolvedContact,
          contactOverride: currentUser ? contact.trim() || null : null,
          name: resolvedName,
          pain,
          tasks,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        id?: number;
        message?: string;
        status?: string;
        summary?: AiAssistantWizardSummary;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error || 'Не удалось отправить заявку.');
      }

      setSummary(
        payload?.summary ?? {
          businessType,
          channels,
          comment: comment.trim() || null,
          contact: resolvedContact,
          contactOverride: currentUser ? contact.trim() || null : null,
          name: resolvedName,
          pain,
          requestId: payload?.id,
          status: payload?.status,
          tasks,
          user: currentUser,
        }
      );
      setStatus({
        message:
          payload?.message ||
          'Мы получили заявку. Теперь можно уточнять задачу в чате помощника.',
        tone: 'success',
      });
    } catch (error) {
      setStatus({
        message:
          error instanceof Error
            ? error.message
            : 'Не удалось отправить заявку. Попробуйте еще раз.',
        tone: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderSingleChoice(options: WizardOption[], value: string, onChange: (value: string) => void) {
    return (
      <div className="ai-choice-grid">
        {options.map((option) => {
          const selected = value === option.value;

          return (
            <button
              aria-pressed={selected}
              className={`ai-choice ${selected ? 'ai-choice--selected' : ''}`}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              <span className="ai-choice__marker">{option.marker}</span>
              <span className="ai-choice__copy">
                <strong>{option.title}</strong>
                {option.detail ? <small>{option.detail}</small> : null}
              </span>
              <span className="ai-choice__check" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    );
  }

  function renderMultiChoice(
    options: WizardOption[],
    values: string[],
    onChange: (value: string[]) => void
  ) {
    return (
      <div className="ai-choice-grid">
        {options.map((option) => {
          const selected = values.includes(option.value);

          return (
            <button
              aria-pressed={selected}
              className={`ai-choice ai-choice--multi ${selected ? 'ai-choice--selected' : ''}`}
              key={option.value}
              onClick={() => onChange(toggleValue(values, option.value))}
              type="button"
            >
              <span className="ai-choice__marker">{option.marker}</span>
              <span className="ai-choice__copy">
                <strong>{option.title}</strong>
                {option.detail ? <small>{option.detail}</small> : null}
              </span>
              <span className="ai-choice__check" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    );
  }

  if (summary) {
    return <AssistantWorkspace onReset={resetWizard} status={status} summary={summary} />;
  }

  return (
    <section className="ai-flow-card">
      <div className="ai-flow-stepper" aria-label="Шаги квиза">
        {steps.map((step, index) => (
          <div
            className={`ai-flow-stepper__item ${
              index === stepIndex ? 'ai-flow-stepper__item--active' : ''
            } ${index < stepIndex ? 'ai-flow-stepper__item--done' : ''}`}
            key={step.title}
          >
            <span>{index + 1}</span>
            <strong>{step.title}</strong>
          </div>
        ))}
      </div>

      <div className="ai-flow-workspace">
        <aside className="ai-flow-context" aria-label="Текущая заявка">
          <span className="eyebrow">Заявка</span>
          <div>
            <span>Бизнес</span>
            <strong>{businessType || 'Не выбран'}</strong>
          </div>
          <div>
            <span>Боль</span>
            <strong>{pain || 'Не выбрана'}</strong>
          </div>
          <div>
            <span>Помощнику</span>
            <strong>{formatList(tasks)}</strong>
          </div>
          <div>
            <span>Каналы</span>
            <strong>{formatList(channels)}</strong>
          </div>
        </aside>

        <div className="ai-flow-step-card">
          <header className="ai-flow-step-card__head">
            <span className="eyebrow">
              Шаг {stepIndex + 1} из {steps.length}
            </span>
            <h2>{currentStep.title}</h2>
            <p>{currentStep.note}</p>
          </header>

          {stepIndex === 0 ? renderSingleChoice(businessTypes, businessType, setBusinessType) : null}
          {stepIndex === 1 ? renderSingleChoice(pains, pain, setPain) : null}
          {stepIndex === 2 ? (
            <>
              {renderMultiChoice(taskOptions, tasks, setTasks)}
              <p className="ai-function-count">{getFunctionCountLabel(tasks.length)}</p>
            </>
          ) : null}
          {stepIndex === 3 ? renderMultiChoice(channelOptions, channels, setChannels) : null}

          {stepIndex === 4 ? (
            <div className="ai-contact-grid">
              {currentUser ? (
                <div className="ai-contact-profile">
                  <span className="eyebrow">Профиль DNK</span>
                  <strong>{resolvedName}</strong>
                  <p>{currentUser.email}</p>
                  <small>Заявка будет привязана к вашему аккаунту.</small>
                </div>
              ) : (
                <div className="field">
                  <label htmlFor="ai-name">Имя</label>
                  <input
                    id="ai-name"
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Как к вам обращаться"
                    value={name}
                  />
                </div>
              )}
              <div className="field">
                <label htmlFor="ai-contact">
                  {currentUser ? 'Telegram/телефон для этой заявки' : 'Telegram/телефон'}
                </label>
                <input
                  id="ai-contact"
                  onChange={(event) => setContact(event.target.value)}
                  placeholder={currentUser ? defaultContact : '@username или телефон'}
                  value={contact}
                />
                {currentUser ? (
                  <small className="ai-contact-hint">
                    Если оставить пустым, используем email из профиля: {defaultContact}.
                  </small>
                ) : null}
              </div>
              <div className="field ai-contact-grid__comment">
                <label htmlFor="ai-comment">Комментарий</label>
                <textarea
                  id="ai-comment"
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Что важно знать перед разбором"
                  value={comment}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="ai-flow-bottom-bar">
        {status ? (
          <p className={`ai-flow-inline-status ${
            status.tone === 'success' ? 'ai-flow-inline-status--success' : 'ai-flow-inline-status--error'
          }`}>
            {status.message}
          </p>
        ) : (
          <p className="ai-flow-bottom-bar__hint">
            {stepIndex === 2
              ? 'Выберите одну или несколько функций будущего помощника.'
              : stepIndex === 3
                ? 'Можно выбрать несколько каналов.'
                : stepIndex === 4 && currentUser
                  ? 'Имя уже взято из профиля DNK. Контакт можно уточнить для этой заявки.'
                  : 'Выберите один вариант.'}
          </p>
        )}

        <div className="ai-flow-actions">
          <button
            className="ghost-button"
            disabled={stepIndex === 0 || isSubmitting}
            onClick={() => {
              setStatus(null);
              setStepIndex((current) => Math.max(current - 1, 0));
            }}
            type="button"
          >
            Назад
          </button>
          {stepIndex < steps.length - 1 ? (
            <button className="primary-button" onClick={goNext} type="button">
              Далее
            </button>
          ) : (
            <button className="primary-button" disabled={isSubmitting} onClick={submitRequest} type="button">
              {isSubmitting ? 'Отправляем...' : 'Отправить заявку'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
