'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { dnkShowcaseCourses } from '@/lib/dnk-content';

type DashboardUser = {
  email: string;
  name: string | null;
  role: 'ADMIN' | 'USER';
};

type EnrolledCourse = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  lessonsCount: number;
  completedLessonsCount: number;
  progressPercent: number;
  nextLessonTitle: string | null;
  enrolledAt: string;
};

type TariffCard = {
  id: number;
  title: string;
  price: number;
  interval: string | null;
  courseTitle: string;
  courseSlug: string;
  courseDescription: string | null;
  isOwned: boolean;
  pendingOrder: {
    id: number;
    checkoutUrl: string;
  } | null;
};

type OrderCard = {
  id: number;
  status: 'PENDING' | 'PAID' | 'CANCELED';
  amount: number;
  createdAt: string;
  paidAt: string | null;
  checkoutUrl: string | null;
  tariffTitle: string;
  courseTitle: string;
};

type DashboardClientProps = {
  user: DashboardUser;
  courses: EnrolledCourse[];
  tariffs: TariffCard[];
  orders: OrderCard[];
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

function getStatusClass(status: OrderCard['status']) {
  if (status === 'PAID') {
    return 'badge badge-paid';
  }

  if (status === 'CANCELED') {
    return 'badge badge-canceled';
  }

  return 'badge badge-pending';
}

function getStatusLabel(status: OrderCard['status']) {
  if (status === 'PAID') {
    return 'Оплачен';
  }

  if (status === 'CANCELED') {
    return 'Отменён';
  }

  return 'Ожидает оплаты';
}

function formatInterval(value: string | null) {
  if (!value || value === 'one-time') {
    return 'разовый доступ';
  }

  return value;
}

function getShowcaseStatusLabel(status: 'ACTIVE' | 'SHOWCASE' | 'SOON') {
  if (status === 'ACTIVE') {
    return 'Доступен';
  }

  if (status === 'SHOWCASE') {
    return 'Витрина';
  }

  return 'Скоро';
}

function getShowcaseStatusClass(status: 'ACTIVE' | 'SHOWCASE' | 'SOON') {
  if (status === 'ACTIVE') {
    return 'badge badge-paid';
  }

  if (status === 'SHOWCASE') {
    return 'badge badge-complete';
  }

  return 'badge badge-pending';
}

export default function DashboardClient({
  user,
  courses,
  tariffs,
  orders,
}: DashboardClientProps) {
  const router = useRouter();
  const [buyingTariffId, setBuyingTariffId] = useState<number | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: 'error' | 'success';
    message: string;
  } | null>(null);
  const ownedCourseSlugs = new Set(courses.map((course) => course.slug));

  async function handleLogout() {
    setFeedback(null);
    setLogoutPending(true);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || 'Не удалось завершить сессию.');
      }

      router.push('/login');
      router.refresh();
    } catch (logoutError) {
      setFeedback({
        tone: 'error',
        message:
          logoutError instanceof Error
            ? logoutError.message
            : 'Не удалось завершить сессию.',
      });
      setLogoutPending(false);
      return;
    }

    setLogoutPending(false);
  }

  async function handleCreateOrder(tariffId: number) {
    setFeedback(null);
    setBuyingTariffId(tariffId);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tariffId,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            order?: { id: number };
            checkoutUrl?: string;
          }
        | null;

      if (payload?.checkoutUrl) {
        router.push(payload.checkoutUrl);
        router.refresh();
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.error || 'Не удалось создать заказ.');
      }

      setFeedback({
        tone: 'success',
        message: `Заказ #${payload?.order?.id ?? ''} создан.`,
      });
      router.refresh();
    } catch (orderError) {
      setFeedback({
        tone: 'error',
        message:
          orderError instanceof Error
            ? orderError.message
            : 'Не удалось создать заказ.',
      });
    } finally {
      setBuyingTariffId(null);
    }
  }

  return (
    <main className="page-shell">
      <div className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>БИЗНЕС ШКОЛА ДНК</span>
        </Link>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <button
            className="ghost-button"
            disabled={logoutPending}
            onClick={handleLogout}
            type="button"
          >
            {logoutPending ? 'Выходим...' : 'Выйти'}
          </button>
        </div>
      </div>

      <section className="stack-grid">
        <article className="panel">
          <span className="eyebrow">Личный кабинет</span>
          <div className="panel-head" style={{ marginTop: '0.9rem' }}>
            <div>
              <h1>{user.name || user.email}</h1>
              <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
                Аккаунт <span className="mono">{user.email}</span>. Роль:{' '}
                <span className="mono">
                  {user.role === 'ADMIN' ? 'администратор' : 'пользователь'}
                </span>
                .
              </p>
            </div>
            <div className="badge-row" style={{ marginTop: 0 }}>
              <span className="badge badge-paid">{courses.length} курсов</span>
              <span className="badge badge-pending">{orders.length} заказов</span>
            </div>
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

          {user.role === 'ADMIN' ? (
            <div className="course-card" style={{ marginTop: '1rem' }}>
              <h2 style={{ marginBottom: '0.5rem' }}>Резервный admin flow</h2>
              <p className="muted-text">
                Основной пользовательский путь идёт через `checkout/test`. Этот PATCH оставлен
                как вторичный инструмент локальной отладки:{' '}
                <span className="mono">PATCH /api/orders/{'{id}'}/status</span> с телом{' '}
                <span className="mono">{'{"status":"PAID"}'}</span>. После этого создаётся
                Enrollment и курс становится доступен пользователю.
              </p>
            </div>
          ) : null}
        </article>

        <div className="grid-two">
          <section className="panel">
            <span className="eyebrow">Мои курсы</span>
            <h2 style={{ marginTop: '0.9rem' }}>Открытые программы</h2>
            <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
              Здесь отображаются только те курсы, по которым уже есть доступ.
            </p>

            <div className="course-grid" style={{ marginTop: '1rem' }}>
              {courses.length === 0 ? (
                <div className="empty-card">
                  <p className="muted-text">
                    Доступных курсов пока нет. Создайте заказ внизу страницы и дождитесь
                    подтверждения оплаты.
                  </p>
                </div>
              ) : (
                courses.map((course) => (
                  <article key={course.id} className="course-card">
                    <span className="eyebrow">Курс</span>
                    <h2 style={{ marginTop: '0.8rem' }}>{course.title}</h2>
                    <p className="muted-text" style={{ marginTop: '0.65rem' }}>
                      {course.description || 'Закрытая программа с уроками и сохранением прогресса.'}
                    </p>
                    <div className="badge-row">
                      <span className="badge badge-paid">{course.lessonsCount} уроков</span>
                      <span className="badge badge-complete">
                        {course.completedLessonsCount}/{course.lessonsCount} пройдено
                      </span>
                      <span className="badge badge-complete">
                        открыт {formatDateTime(course.enrolledAt)}
                      </span>
                    </div>
                    <div className="progress-box" style={{ marginTop: '1rem', paddingBottom: 0, borderBottom: 'none' }}>
                      <div className="progress-info" style={{ marginBottom: '0.55rem' }}>
                        <span>Прогресс по курсу</span>
                        <span>{course.progressPercent}%</span>
                      </div>
                      <div className="progress-line">
                        <div className="progress-fill" style={{ width: `${course.progressPercent}%` }} />
                      </div>
                    </div>
                    <p className="muted-text" style={{ marginTop: '0.9rem' }}>
                      {course.nextLessonTitle
                        ? `Следующий урок: ${course.nextLessonTitle}.`
                        : 'Все уроки завершены, можно вернуться к материалам в любой момент.'}
                    </p>
                    <div className="row-actions">
                      <Link className="primary-button" href={`/courses/${course.slug}`}>
                        Продолжить обучение
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="panel">
            <span className="eyebrow">Заказы</span>
            <h2 style={{ marginTop: '0.9rem' }}>История покупок</h2>
            <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
              Если заказ ещё в статусе PENDING, его можно сразу открыть в test checkout и
              завершить оплату.
            </p>

            <div className="course-grid" style={{ marginTop: '1rem' }}>
              {orders.length === 0 ? (
                <div className="empty-card">
                  <p className="muted-text">У вас пока нет заказов.</p>
                </div>
              ) : (
                orders.map((order) => (
                  <article key={order.id} className="order-card">
                    <div className="panel-head">
                      <div>
                        <h2>Заказ #{order.id}</h2>
                        <p className="muted-text" style={{ marginTop: '0.55rem' }}>
                          {order.tariffTitle} · {order.courseTitle}
                        </p>
                      </div>
                      <span className={getStatusClass(order.status)}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="badge-row">
                      <span className="badge badge-pending">{formatMoney(order.amount)}</span>
                      <span className="badge badge-complete">
                        создан {formatDateTime(order.createdAt)}
                      </span>
                      {order.status === 'PAID' ? (
                        <span className="badge badge-paid">
                          оплачено {formatDateTime(order.paidAt)}
                        </span>
                      ) : null}
                    </div>
                    {order.checkoutUrl ? (
                      <div className="row-actions" style={{ marginTop: '1rem' }}>
                        <Link href={order.checkoutUrl} className="secondary-button">
                          Продолжить оплату
                        </Link>
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="panel">
          <span className="eyebrow">Тарифы</span>
          <h2 style={{ marginTop: '0.9rem' }}>Оформить доступ</h2>
          <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
            Основной путь: выбрать тариф, попасть в test checkout, оплатить тестово и сразу
            открыть курс.
          </p>

          <div className="tariff-grid" style={{ marginTop: '1rem' }}>
            {tariffs.length === 0 ? (
              <div className="empty-card">
                <p className="muted-text">Активные тарифы не найдены.</p>
              </div>
            ) : (
              tariffs.map((tariff) => (
                <article key={tariff.id} className="tariff-card">
                  <span className="eyebrow">Тариф</span>
                  <h2 style={{ marginTop: '0.8rem' }}>{tariff.title}</h2>
                  <p className="muted-text" style={{ marginTop: '0.65rem' }}>
                    {tariff.courseTitle}
                  </p>
                  <div className="badge-row">
                    <span className="badge badge-pending">{formatMoney(tariff.price)}</span>
                    <span className="badge badge-complete">{formatInterval(tariff.interval)}</span>
                    {tariff.isOwned ? (
                      <span className="badge badge-paid">доступ уже открыт</span>
                    ) : null}
                    {tariff.pendingOrder ? (
                      <span className="badge badge-pending">
                        заказ #{tariff.pendingOrder.id} ожидает оплаты
                      </span>
                    ) : null}
                  </div>
                  <p className="muted-text" style={{ marginTop: '0.9rem' }}>
                    {tariff.courseDescription ||
                      'После оплаты курс откроется на защищённой странице, а прогресс будет сохраняться по пользователю.'}
                  </p>
                  <div className="row-actions">
                    {tariff.isOwned ? (
                      <Link className="secondary-button" href={`/courses/${tariff.courseSlug}`}>
                        Открыть курс
                      </Link>
                    ) : tariff.pendingOrder ? (
                      <Link
                        className="secondary-button"
                        href={tariff.pendingOrder.checkoutUrl}
                      >
                        Продолжить оплату
                      </Link>
                    ) : (
                      <button
                        className="primary-button"
                        disabled={buyingTariffId === tariff.id}
                        onClick={() => handleCreateOrder(tariff.id)}
                        type="button"
                      >
                        {buyingTariffId === tariff.id
                          ? 'Создаём заказ...'
                          : 'Купить доступ'}
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <span className="eyebrow">Каталог</span>
          <h2 style={{ marginTop: '0.9rem' }}>Другие программы</h2>
          <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
            Ниже показан ограниченный набор реальных курсов из пользовательской таблицы. Сейчас
            они работают как витрина без отдельного checkout-flow для каждого направления.
          </p>

          <div className="program-grid" style={{ marginTop: '1rem' }}>
            {dnkShowcaseCourses.map((course) => {
              const isOwned = ownedCourseSlugs.has(course.slug);

              return (
                <article key={course.slug} className="program-highlight-card showcase-course-card">
                  <div className="badge-row" style={{ marginTop: 0 }}>
                    <span className="badge badge-complete">{course.category}</span>
                    <span className={getShowcaseStatusClass(course.status)}>
                      {getShowcaseStatusLabel(course.status)}
                    </span>
                  </div>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                  <div className="showcase-course-card__footer">
                    <span className="showcase-course-card__price">{formatMoney(course.price)}</span>
                    {isOwned ? (
                      <Link className="secondary-button" href={`/courses/${course.slug}`}>
                        Продолжить обучение
                      </Link>
                    ) : (
                      <button className="ghost-button" disabled type="button">
                        {course.status === 'SOON' ? 'Скоро' : 'В разработке'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
