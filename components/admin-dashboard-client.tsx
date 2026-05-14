'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  AdminCourseRow,
  AdminDashboardData,
  AdminEnrollmentRow,
  AdminLessonRow,
  AdminOrderRow,
  AdminTariffRow,
  AdminUserRow,
} from '@/lib/admin-dashboard';
import { adminManualQueueHints, adminSafetyHints } from '@/lib/admin-help';
import AdminManualReviewActions from '@/components/admin-manual-review-actions';

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const moneyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

type FeedbackState = {
  tone: 'success' | 'error';
  message: string;
} | null;

type OrderStatusFilter = 'ALL' | AdminOrderRow['status'];

type CourseDraft = {
  title: string;
  description: string;
  isPublished: boolean;
};

type LessonDraft = {
  title: string;
  description: string;
  content: string;
  isPreview: boolean;
  isPublished: boolean;
};

type TariffDraft = {
  title: string;
  price: string;
  interval: string;
  isActive: boolean;
};

function formatDate(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function formatMoney(amount: number) {
  return moneyFormatter.format(amount);
}

function getBadgeClass(status: string) {
  if (
    status === 'PAID' ||
    status === 'paid' ||
    status === 'free' ||
    status === 'ADMIN' ||
    status === 'order'
  ) {
    return 'badge badge-paid';
  }

  if (
    status === 'PENDING' ||
    status === 'PROCESSING' ||
    status === 'preview'
  ) {
    return 'badge badge-pending';
  }

  if (
    status === 'FAILED' ||
    status === 'CANCELED' ||
    status === 'EXPIRED' ||
    status === 'showcase' ||
    status === 'hidden'
  ) {
    return 'badge badge-canceled';
  }

  return 'badge badge-complete';
}

function getRoleLabel(role: AdminUserRow['role']) {
  return role === 'ADMIN' ? 'Администратор' : 'Ученик';
}

function getCourseStateLabel(state: AdminCourseRow['state']) {
  if (state === 'free') {
    return 'Бесплатный';
  }

  if (state === 'paid') {
    return 'Платный';
  }

  if (state === 'showcase') {
    return 'Витрина';
  }

  return 'Скрыт';
}

function getEnrollmentSourceLabel(source: AdminEnrollmentRow['source']) {
  return source === 'order' ? 'Из заказа' : 'Бесплатно';
}

function toCourseDraft(course: AdminCourseRow): CourseDraft {
  return {
    title: course.title,
    description: course.description ?? '',
    isPublished: course.isPublished,
  };
}

function toLessonDraft(lesson: AdminLessonRow): LessonDraft {
  return {
    title: lesson.title,
    description: lesson.description ?? '',
    content: lesson.content ?? '',
    isPreview: lesson.isPreview,
    isPublished: lesson.isPublished,
  };
}

function toTariffDraft(tariff: AdminTariffRow): TariffDraft {
  return {
    title: tariff.title,
    price: String(tariff.price),
    interval: tariff.interval ?? '',
    isActive: tariff.isActive,
  };
}

async function requestJson<T>(input: string, init: RequestInit, fallbackMessage: string) {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } & T;

  if (!response.ok) {
    throw new Error(payload?.error || fallbackMessage);
  }

  return payload;
}

const emptyCreateCourseDraft = {
  title: '',
  slug: '',
  description: '',
  isPublished: false,
};

const emptyCreateLessonDraft: LessonDraft = {
  title: '',
  description: '',
  content: '',
  isPreview: false,
  isPublished: true,
};

const emptyCreateTariffDraft = {
  title: '',
  slug: '',
  price: '',
  interval: 'one-time',
  isActive: true,
};

export default function AdminDashboardClient({
  initialData,
}: {
  initialData: AdminDashboardData;
}) {
  const router = useRouter();
  const courseEditorRef = useRef<HTMLElement | null>(null);
  const [courseFeedback, setCourseFeedback] = useState<FeedbackState>(null);
  const [lessonFeedback, setLessonFeedback] = useState<FeedbackState>(null);
  const [tariffFeedback, setTariffFeedback] = useState<FeedbackState>(null);
  const [orderFilter, setOrderFilter] = useState<OrderStatusFilter>('ALL');
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(
    initialData.courses[0]?.id ?? null
  );
  const [courseDraft, setCourseDraft] = useState<CourseDraft | null>(
    initialData.courses[0] ? toCourseDraft(initialData.courses[0]) : null
  );
  const [createCourseDraft, setCreateCourseDraft] = useState(emptyCreateCourseDraft);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(
    initialData.courses[0]?.lessons[0]?.id ?? null
  );
  const [lessonDraft, setLessonDraft] = useState<LessonDraft | null>(
    initialData.courses[0]?.lessons[0]
      ? toLessonDraft(initialData.courses[0].lessons[0])
      : null
  );
  const [lessonOrder, setLessonOrder] = useState<number[]>(
    initialData.courses[0]?.lessons.map((lesson) => lesson.id) ?? []
  );
  const [createLessonDraft, setCreateLessonDraft] = useState<LessonDraft>(emptyCreateLessonDraft);
  const [selectedTariffId, setSelectedTariffId] = useState<number | null>(
    initialData.courses[0]?.tariffs[0]?.id ?? null
  );
  const [tariffDraft, setTariffDraft] = useState<TariffDraft | null>(
    initialData.courses[0]?.tariffs[0]
      ? toTariffDraft(initialData.courses[0].tariffs[0])
      : null
  );
  const [createTariffDraft, setCreateTariffDraft] = useState(emptyCreateTariffDraft);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const manualReviewOrders = useMemo(
    () =>
      initialData.orders.filter(
        (order) => order.paymentMethod === 'MANUAL' && order.status === 'PROCESSING'
      ),
    [initialData.orders]
  );

  const filteredOrders = useMemo(
    () =>
      orderFilter === 'ALL'
        ? initialData.orders
        : initialData.orders.filter((order) => order.status === orderFilter),
    [initialData.orders, orderFilter]
  );

  const selectedCourse = useMemo(
    () => initialData.courses.find((course) => course.id === selectedCourseId) ?? null,
    [initialData.courses, selectedCourseId]
  );

  const orderedLessons = useMemo(() => {
    if (!selectedCourse) {
      return [];
    }

    const lessonMap = new Map(selectedCourse.lessons.map((lesson) => [lesson.id, lesson]));

    return lessonOrder
      .map((lessonId) => lessonMap.get(lessonId) ?? null)
      .filter((lesson): lesson is AdminLessonRow => Boolean(lesson));
  }, [lessonOrder, selectedCourse]);

  const selectedLesson = useMemo(
    () => orderedLessons.find((lesson) => lesson.id === selectedLessonId) ?? null,
    [orderedLessons, selectedLessonId]
  );

  const selectedTariff = useMemo(
    () => selectedCourse?.tariffs.find((tariff) => tariff.id === selectedTariffId) ?? null,
    [selectedCourse, selectedTariffId]
  );

  const isLessonOrderDirty =
    selectedCourse &&
    selectedCourse.lessons.length === lessonOrder.length &&
    selectedCourse.lessons.some((lesson, index) => lesson.id !== lessonOrder[index]);

  useEffect(() => {
    if (!selectedCourseId || !initialData.courses.some((course) => course.id === selectedCourseId)) {
      setSelectedCourseId(initialData.courses[0]?.id ?? null);
    }
  }, [initialData.courses, selectedCourseId]);

  useEffect(() => {
    if (!selectedCourse) {
      setCourseDraft(null);
      setLessonOrder([]);
      setSelectedLessonId(null);
      setLessonDraft(null);
      setSelectedTariffId(null);
      setTariffDraft(null);
      return;
    }

    setCourseDraft(toCourseDraft(selectedCourse));
    setLessonOrder(selectedCourse.lessons.map((lesson) => lesson.id));
    setSelectedLessonId((current) =>
      current && selectedCourse.lessons.some((lesson) => lesson.id === current)
        ? current
        : selectedCourse.lessons[0]?.id ?? null
    );
    setSelectedTariffId((current) =>
      current && selectedCourse.tariffs.some((tariff) => tariff.id === current)
        ? current
        : selectedCourse.tariffs[0]?.id ?? null
    );
  }, [selectedCourse]);

  useEffect(() => {
    setLessonDraft(selectedLesson ? toLessonDraft(selectedLesson) : null);
  }, [selectedLesson]);

  useEffect(() => {
    setTariffDraft(selectedTariff ? toTariffDraft(selectedTariff) : null);
  }, [selectedTariff]);

  function jumpToCourseEditor(courseId: number) {
    setSelectedCourseId(courseId);
    requestAnimationFrame(() => {
      courseEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function handleCreateCourse() {
    setPendingKey('create-course');
    setCourseFeedback(null);

    try {
      const payload = await requestJson<{ course: { id: number } }>(
        '/api/admin/courses',
        {
          method: 'POST',
          body: JSON.stringify({
            title: createCourseDraft.title,
            slug: createCourseDraft.slug,
            description: createCourseDraft.description,
            isPublished: createCourseDraft.isPublished,
          }),
        },
        'Не удалось создать курс.'
      );

      setSelectedCourseId(payload.course.id);
      setCreateCourseDraft(emptyCreateCourseDraft);
      setCourseFeedback({
        tone: 'success',
        message: 'Курс создан. Теперь можно добавить уроки и тарифы.',
      });
      router.refresh();
    } catch (error) {
      setCourseFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Не удалось создать курс.',
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function handleSaveCourse() {
    if (!selectedCourse || !courseDraft) {
      return;
    }

    setPendingKey('save-course');
    setCourseFeedback(null);

    try {
      await requestJson(
        `/api/admin/courses/${selectedCourse.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(courseDraft),
        },
        'Не удалось сохранить курс.'
      );

      setCourseFeedback({
        tone: 'success',
        message: 'Изменения курса сохранены.',
      });
      router.refresh();
    } catch (error) {
      setCourseFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Не удалось сохранить курс.',
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function handleCreateLesson() {
    if (!selectedCourse) {
      return;
    }

    setPendingKey('create-lesson');
    setLessonFeedback(null);

    try {
      const payload = await requestJson<{ lessonId: number }>(
        `/api/admin/courses/${selectedCourse.id}/lessons`,
        {
          method: 'POST',
          body: JSON.stringify(createLessonDraft),
        },
        'Не удалось добавить урок.'
      );

      setSelectedLessonId(payload.lessonId);
      setCreateLessonDraft(emptyCreateLessonDraft);
      setLessonFeedback({
        tone: 'success',
        message: 'Урок добавлен.',
      });
      router.refresh();
    } catch (error) {
      setLessonFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Не удалось добавить урок.',
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function handleSaveLesson() {
    if (!selectedLesson || !lessonDraft) {
      return;
    }

    setPendingKey('save-lesson');
    setLessonFeedback(null);

    try {
      await requestJson(
        `/api/admin/lessons/${selectedLesson.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(lessonDraft),
        },
        'Не удалось сохранить урок.'
      );

      setLessonFeedback({
        tone: 'success',
        message: 'Урок обновлен.',
      });
      router.refresh();
    } catch (error) {
      setLessonFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Не удалось сохранить урок.',
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function handleDeleteLesson(lesson: AdminLessonRow) {
    if (!selectedCourse) {
      return;
    }

    const confirmed = window.confirm(
      `Удалить урок «${lesson.title}»? Это удалит и связанный прогресс по нему.`
    );

    if (!confirmed) {
      return;
    }

    setPendingKey(`delete-lesson-${lesson.id}`);
    setLessonFeedback(null);

    try {
      await requestJson(
        `/api/admin/lessons/${lesson.id}`,
        {
          method: 'DELETE',
        },
        'Не удалось удалить урок.'
      );

      setSelectedLessonId((current) =>
        current === lesson.id
          ? selectedCourse.lessons.find((item) => item.id !== lesson.id)?.id ?? null
          : current
      );
      setLessonFeedback({
        tone: 'success',
        message: 'Урок удален.',
      });
      router.refresh();
    } catch (error) {
      setLessonFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Не удалось удалить урок.',
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function handleSaveLessonOrder() {
    if (!selectedCourse) {
      return;
    }

    setPendingKey('save-lesson-order');
    setLessonFeedback(null);

    try {
      await requestJson(
        `/api/admin/courses/${selectedCourse.id}/lessons/order`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            lessonIds: lessonOrder,
          }),
        },
        'Не удалось сохранить порядок уроков.'
      );

      setLessonFeedback({
        tone: 'success',
        message: 'Порядок уроков сохранен.',
      });
      router.refresh();
    } catch (error) {
      setLessonFeedback({
        tone: 'error',
        message:
          error instanceof Error ? error.message : 'Не удалось сохранить порядок уроков.',
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function handleCreateTariff() {
    if (!selectedCourse) {
      return;
    }

    setPendingKey('create-tariff');
    setTariffFeedback(null);

    try {
      const payload = await requestJson<{ tariffId: number }>(
        '/api/admin/tariffs',
        {
          method: 'POST',
          body: JSON.stringify({
            courseId: selectedCourse.id,
            title: createTariffDraft.title,
            slug: createTariffDraft.slug,
            price: Number(createTariffDraft.price),
            interval: createTariffDraft.interval,
            isActive: createTariffDraft.isActive,
          }),
        },
        'Не удалось создать тариф.'
      );

      setSelectedTariffId(payload.tariffId);
      setCreateTariffDraft(emptyCreateTariffDraft);
      setTariffFeedback({
        tone: 'success',
        message: 'Тариф создан.',
      });
      router.refresh();
    } catch (error) {
      setTariffFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Не удалось создать тариф.',
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function handleSaveTariff() {
    if (!selectedTariff || !tariffDraft) {
      return;
    }

    setPendingKey('save-tariff');
    setTariffFeedback(null);

    try {
      await requestJson(
        `/api/admin/tariffs/${selectedTariff.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            title: tariffDraft.title,
            price: Number(tariffDraft.price),
            interval: tariffDraft.interval,
            isActive: tariffDraft.isActive,
          }),
        },
        'Не удалось сохранить тариф.'
      );

      setTariffFeedback({
        tone: 'success',
        message: 'Тариф обновлен.',
      });
      router.refresh();
    } catch (error) {
      setTariffFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Не удалось сохранить тариф.',
      });
    } finally {
      setPendingKey(null);
    }
  }

  function moveLesson(lessonId: number, direction: 'up' | 'down') {
    setLessonOrder((currentOrder) => {
      const index = currentOrder.indexOf(lessonId);

      if (index === -1) {
        return currentOrder;
      }

      const nextIndex = direction === 'up' ? index - 1 : index + 1;

      if (nextIndex < 0 || nextIndex >= currentOrder.length) {
        return currentOrder;
      }

      const nextOrder = [...currentOrder];
      const [lesson] = nextOrder.splice(index, 1);
      nextOrder.splice(nextIndex, 0, lesson);

      return nextOrder;
    });
  }

  return (
    <section className="dnk-section admin-shell">
      <article className="panel admin-hero">
        <div className="admin-hero__copy">
          <span className="eyebrow">Админ-панель</span>
          <h1>Управление курсами, уроками, тарифами и ручной оплатой</h1>
          <p className="panel-copy">
            Здесь собраны все ежедневные действия администратора: ручная проверка оплаты,
            управление курсами, уроками, ознакомительным доступом и тарифами для новых покупок.
          </p>
          <div className="row-actions">
            <Link href="/admin/help" className="secondary-button">
              Открыть инструкцию администратора
            </Link>
          </div>
        </div>

        <div className="admin-overview">
          <div className="admin-stat">
            <span>Пользователи</span>
            <strong>{initialData.totals.users}</strong>
          </div>
          <div className="admin-stat">
            <span>Заказы</span>
            <strong>{initialData.totals.orders}</strong>
          </div>
          <div className="admin-stat">
            <span>Доступы</span>
            <strong>{initialData.totals.enrollments}</strong>
          </div>
          <div className="admin-stat">
            <span>Доступные курсы</span>
            <strong>{initialData.totals.liveCourses}</strong>
          </div>
          <div className="admin-stat">
            <span>Витрина</span>
            <strong>{initialData.totals.showcaseCourses}</strong>
          </div>
        </div>
      </article>

      <article className="panel admin-section">
        <div className="admin-section__head">
          <span className="eyebrow">Памятка</span>
          <h2>Что важно перед подтверждением оплаты и изменением контента</h2>
          <p className="panel-copy">
            Короткая версия основных правил. Полная пошаговая инструкция доступна на странице
            `/admin/help`.
          </p>
        </div>

        <div className="grid-two">
          <article className="status-card">
            <strong>Ручная проверка оплаты</strong>
            <ul className="utility-list utility-list--bullets">
              {adminManualQueueHints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </article>

          <article className="status-card">
            <strong>Предупреждения</strong>
            <ul className="utility-list utility-list--bullets">
              {adminSafetyHints.slice(0, 4).map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </article>
        </div>
      </article>

      <article className="panel admin-section" id="manual-review">
        <div className="admin-section__head">
          <span className="eyebrow">Ручная проверка</span>
          <h2>Заказы в статусе PROCESSING</h2>
          <p className="panel-copy">
            PROCESSING означает, что пользователь уже оплатил по QR СБП и нажал «Я оплатил», но
            поступление денег еще не подтверждено. Подтверждайте заказ только после проверки
            оплаты.
          </p>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Email</th>
                <th>Курс / тариф</th>
                <th>Сумма</th>
                <th>Создан</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {manualReviewOrders.length > 0 ? (
                manualReviewOrders.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <a href={`#admin-user-${item.userId}`}>{item.userName || 'Без имени'}</a>
                      <div className="muted-text admin-cell__sub mono">Заказ #{item.id}</div>
                    </td>
                    <td className="mono">{item.userEmail}</td>
                    <td>
                      <button
                        className="admin-inline-link"
                        onClick={() => jumpToCourseEditor(item.courseId)}
                        type="button"
                      >
                        {item.courseTitle}
                      </button>
                      <div className="muted-text admin-cell__sub">
                        {item.tariffTitle} / <span className="mono">{item.courseSlug}</span>
                      </div>
                    </td>
                    <td>{formatMoney(item.amount)}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>
                      <span className={getBadgeClass(item.status)}>{item.status}</span>
                    </td>
                    <td>
                      <AdminManualReviewActions orderId={item.id} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <p className="muted-text" style={{ margin: 0 }}>
                      Заказов в ручной проверке сейчас нет.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel admin-section">
        <div className="admin-section__head">
          <span className="eyebrow">Контент и доступ</span>
          <h2>Курсы, уроки, ознакомительные уроки и тарифы</h2>
          <p className="panel-copy">
            Неопубликованный курс скрыт. Опубликованный курс без активного тарифа считается
            бесплатным. Если у опубликованного курса есть активный тариф, он продается как платный.
            Ознакомительные уроки управляются переключателем у самих уроков.
          </p>
        </div>

        <div className="admin-editor-grid">
          <aside className="panel admin-editor-sidebar">
            <div className="admin-editor-sidebar__head">
              <h3>Курсы</h3>
              <span className="muted-text">{initialData.courses.length} в базе</span>
            </div>

            <div className="admin-course-list">
              {initialData.courses.map((course) => (
                <button
                  key={course.id}
                  className={`admin-course-list__item ${
                    selectedCourseId === course.id ? 'admin-course-list__item--active' : ''
                  }`}
                  onClick={() => setSelectedCourseId(course.id)}
                  type="button"
                >
                  <div className="admin-course-list__top">
                    <strong>{course.title}</strong>
                    <span className={getBadgeClass(course.state)}>
                      {getCourseStateLabel(course.state)}
                    </span>
                  </div>
                  <div className="admin-course-list__meta mono">{course.slug}</div>
                  <div className="admin-course-list__meta">
                    {course.lessonsCount} уроков, {course.previewLessonsCount} ознакомительных
                  </div>
                </button>
              ))}
            </div>

            <div className="admin-editor-sidebar__create">
              <h3>Новый курс</h3>
              <div className="field">
                <label htmlFor="admin-new-course-title">Название</label>
                <input
                  id="admin-new-course-title"
                  onChange={(event) =>
                    setCreateCourseDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Новый курс"
                  value={createCourseDraft.title}
                />
              </div>
              <div className="field">
                <label htmlFor="admin-new-course-slug">Slug адреса</label>
                <input
                  id="admin-new-course-slug"
                  onChange={(event) =>
                    setCreateCourseDraft((current) => ({
                      ...current,
                      slug: event.target.value,
                    }))
                  }
                  placeholder="new-course-slug"
                  value={createCourseDraft.slug}
                />
              </div>
              <div className="field">
                <label htmlFor="admin-new-course-description">Короткое описание</label>
                <textarea
                  id="admin-new-course-description"
                  onChange={(event) =>
                    setCreateCourseDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Короткое описание курса для витрины"
                  value={createCourseDraft.description}
                />
              </div>
              <label className="checkbox-row">
                <input
                  checked={createCourseDraft.isPublished}
                  onChange={(event) =>
                    setCreateCourseDraft((current) => ({
                      ...current,
                      isPublished: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>Сразу опубликовать</span>
              </label>
              <button
                className="primary-button"
                disabled={pendingKey === 'create-course'}
                onClick={handleCreateCourse}
                type="button"
              >
                {pendingKey === 'create-course' ? 'Создаем...' : 'Создать курс'}
              </button>
            </div>

            {courseFeedback ? (
              <p
                className={`feedback ${
                  courseFeedback.tone === 'success' ? 'feedback-success' : 'feedback-error'
                }`}
              >
                {courseFeedback.message}
              </p>
            ) : null}
          </aside>

          <div className="admin-editor-main">
            {selectedCourse ? (
              <>
                <article
                  className="panel admin-editor-card"
                  id={`admin-course-${selectedCourse.id}`}
                  ref={courseEditorRef}
                >
                  <div className="admin-editor-card__head">
                    <div>
                      <span className="eyebrow">Курс</span>
                      <h3>{selectedCourse.title}</h3>
                    </div>
                    <span className={getBadgeClass(selectedCourse.state)}>
                      {getCourseStateLabel(selectedCourse.state)}
                    </span>
                  </div>

                  <div className="admin-editor-card__stats">
                    <div className="admin-inline-stat">
                      <span>Направление</span>
                      <strong>{selectedCourse.groupTitle}</strong>
                    </div>
                    <div className="admin-inline-stat">
                      <span>Покупка</span>
                      <strong>
                        {selectedCourse.hasActiveTariff ? 'Доступна через тариф' : 'Нет активного тарифа'}
                      </strong>
                    </div>
                    <div className="admin-inline-stat">
                      <span>Ознакомительные уроки</span>
                      <strong>{selectedCourse.previewLessonsCount} уроков</strong>
                    </div>
                    <div className="admin-inline-stat">
                      <span>Опубликовано уроков</span>
                      <strong>{selectedCourse.publishedLessonsCount}</strong>
                    </div>
                  </div>

                  <p className="panel-copy">{selectedCourse.statusNote}</p>

                  <div className="field">
                    <label htmlFor="admin-course-title">Название курса</label>
                    <input
                      id="admin-course-title"
                      onChange={(event) =>
                        setCourseDraft((current) =>
                          current
                            ? {
                                ...current,
                                title: event.target.value,
                              }
                            : current
                        )
                      }
                      value={courseDraft?.title ?? ''}
                    />
                  </div>

                  <div className="admin-readonly-grid">
                    <div className="field">
                      <label htmlFor="admin-course-slug">Slug адреса</label>
                      <input disabled id="admin-course-slug" value={selectedCourse.slug} />
                    </div>
                    <div className="field">
                      <label htmlFor="admin-course-group">Направление</label>
                      <input disabled id="admin-course-group" value={selectedCourse.groupTitle} />
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="admin-course-description">Короткое описание</label>
                    <textarea
                      id="admin-course-description"
                      onChange={(event) =>
                        setCourseDraft((current) =>
                          current
                            ? {
                                ...current,
                                description: event.target.value,
                              }
                            : current
                        )
                      }
                      value={courseDraft?.description ?? ''}
                    />
                  </div>

                  <label className="checkbox-row">
                    <input
                      checked={courseDraft?.isPublished ?? false}
                      onChange={(event) =>
                        setCourseDraft((current) =>
                          current
                            ? {
                                ...current,
                                isPublished: event.target.checked,
                              }
                            : current
                        )
                      }
                      type="checkbox"
                    />
                    <span>Курс опубликован</span>
                  </label>

                  <div className="admin-note">
                    <p>{selectedCourse.courseSlugPolicy}</p>
                    <p>
                      Направление пока не хранится в БД отдельно: для старых курсов оно берется из
                      кодового каталога, для новых используется дефолтная группа.
                    </p>
                  </div>

                  <div className="row-actions">
                    <button
                      className="primary-button"
                      disabled={pendingKey === 'save-course'}
                      onClick={handleSaveCourse}
                      type="button"
                    >
                      {pendingKey === 'save-course' ? 'Сохраняем...' : 'Сохранить курс'}
                    </button>
                    <Link className="ghost-button" href={`/catalog/${selectedCourse.slug}`} target="_blank">
                      Открыть страницу курса
                    </Link>
                  </div>
                </article>

                <article className="panel admin-editor-card">
                  <div className="admin-editor-card__head">
                    <div>
                      <span className="eyebrow">Уроки</span>
                      <h3>Порядок, ознакомительные уроки и публикация</h3>
                    </div>
                    <span className="muted-text">{selectedCourse.lessonsCount} всего</span>
                  </div>

                  <div className="admin-lesson-order">
                    {orderedLessons.map((lesson, index) => (
                      <div key={lesson.id} className="admin-lesson-order__item">
                        <div className="admin-lesson-order__summary">
                          <strong>
                            {index + 1}. {lesson.title}
                          </strong>
                          <div className="admin-lesson-order__meta">
                            <span className={getBadgeClass(lesson.isPublished ? 'free' : 'hidden')}>
                              {lesson.isPublished ? 'Опубликован' : 'Скрыт'}
                            </span>
                            {lesson.isPreview ? (
                              <span className="badge badge-pending">Ознакомительный</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="admin-lesson-order__actions">
                          <button
                            className="ghost-button"
                            disabled={index === 0}
                            onClick={() => moveLesson(lesson.id, 'up')}
                            type="button"
                          >
                            Вверх
                          </button>
                          <button
                            className="ghost-button"
                            disabled={index === orderedLessons.length - 1}
                            onClick={() => moveLesson(lesson.id, 'down')}
                            type="button"
                          >
                            Вниз
                          </button>
                          <button
                            className="secondary-button"
                            onClick={() => setSelectedLessonId(lesson.id)}
                            type="button"
                          >
                            Редактировать
                          </button>
                          <button
                            className="ghost-button"
                            disabled={pendingKey === `delete-lesson-${lesson.id}`}
                            onClick={() => handleDeleteLesson(lesson)}
                            type="button"
                          >
                            {pendingKey === `delete-lesson-${lesson.id}` ? 'Удаляем...' : 'Удалить'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="row-actions">
                    <button
                      className="primary-button"
                      disabled={!isLessonOrderDirty || pendingKey === 'save-lesson-order'}
                      onClick={handleSaveLessonOrder}
                      type="button"
                    >
                      {pendingKey === 'save-lesson-order'
                        ? 'Сохраняем порядок...'
                        : 'Сохранить порядок уроков'}
                    </button>
                  </div>

                  {selectedLesson && lessonDraft ? (
                    <div className="admin-subeditor">
                      <div className="admin-subeditor__head">
                        <h4>Редактирование урока</h4>
                        <span className="mono">{selectedLesson.slug}</span>
                      </div>
                      <div className="field">
                        <label htmlFor="admin-lesson-title">Название урока</label>
                        <input
                          id="admin-lesson-title"
                          onChange={(event) =>
                            setLessonDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    title: event.target.value,
                                  }
                                : current
                            )
                          }
                          value={lessonDraft.title}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="admin-lesson-description">Короткое описание</label>
                        <textarea
                          id="admin-lesson-description"
                          onChange={(event) =>
                            setLessonDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    description: event.target.value,
                                  }
                                : current
                            )
                          }
                          value={lessonDraft.description}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="admin-lesson-content">Контент</label>
                        <textarea
                          id="admin-lesson-content"
                          onChange={(event) =>
                            setLessonDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    content: event.target.value,
                                  }
                                : current
                            )
                          }
                          value={lessonDraft.content}
                        />
                      </div>
                      <div className="admin-toggle-grid">
                        <label className="checkbox-row">
                          <input
                            checked={lessonDraft.isPublished}
                            onChange={(event) =>
                              setLessonDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      isPublished: event.target.checked,
                                    }
                                  : current
                              )
                            }
                            type="checkbox"
                          />
                          <span>Урок опубликован</span>
                        </label>
                        <label className="checkbox-row">
                          <input
                            checked={lessonDraft.isPreview}
                            onChange={(event) =>
                              setLessonDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      isPreview: event.target.checked,
                                    }
                                  : current
                              )
                            }
                            type="checkbox"
                          />
                          <span>Открыт как ознакомительный урок</span>
                        </label>
                      </div>
                      <div className="row-actions">
                        <button
                          className="primary-button"
                          disabled={pendingKey === 'save-lesson'}
                          onClick={handleSaveLesson}
                          type="button"
                        >
                          {pendingKey === 'save-lesson' ? 'Сохраняем...' : 'Сохранить урок'}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="admin-subeditor">
                    <div className="admin-subeditor__head">
                      <h4>Новый урок</h4>
                      <span className="muted-text">Slug создается автоматически</span>
                    </div>
                    <div className="field">
                      <label htmlFor="admin-new-lesson-title">Название</label>
                      <input
                        id="admin-new-lesson-title"
                        onChange={(event) =>
                          setCreateLessonDraft((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        value={createLessonDraft.title}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="admin-new-lesson-description">Короткое описание</label>
                      <textarea
                        id="admin-new-lesson-description"
                        onChange={(event) =>
                          setCreateLessonDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        value={createLessonDraft.description}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="admin-new-lesson-content">Контент</label>
                      <textarea
                        id="admin-new-lesson-content"
                        onChange={(event) =>
                          setCreateLessonDraft((current) => ({
                            ...current,
                            content: event.target.value,
                          }))
                        }
                        value={createLessonDraft.content}
                      />
                    </div>
                    <div className="admin-toggle-grid">
                      <label className="checkbox-row">
                        <input
                          checked={createLessonDraft.isPublished}
                          onChange={(event) =>
                            setCreateLessonDraft((current) => ({
                              ...current,
                              isPublished: event.target.checked,
                            }))
                          }
                          type="checkbox"
                        />
                        <span>Сразу опубликовать</span>
                      </label>
                      <label className="checkbox-row">
                        <input
                          checked={createLessonDraft.isPreview}
                          onChange={(event) =>
                            setCreateLessonDraft((current) => ({
                              ...current,
                              isPreview: event.target.checked,
                            }))
                          }
                          type="checkbox"
                          />
                        <span>Сделать ознакомительным уроком</span>
                      </label>
                    </div>
                    <button
                      className="primary-button"
                      disabled={pendingKey === 'create-lesson'}
                      onClick={handleCreateLesson}
                      type="button"
                    >
                      {pendingKey === 'create-lesson' ? 'Добавляем...' : 'Добавить урок'}
                    </button>
                  </div>

                  {lessonFeedback ? (
                    <p
                      className={`feedback ${
                        lessonFeedback.tone === 'success' ? 'feedback-success' : 'feedback-error'
                      }`}
                    >
                      {lessonFeedback.message}
                    </p>
                  ) : null}
                </article>

                <article className="panel admin-editor-card">
                  <div className="admin-editor-card__head">
                    <div>
                      <span className="eyebrow">Тарифы</span>
                      <h3>Цена и доступ для новых покупок</h3>
                    </div>
                    <span className="muted-text">
                      {selectedCourse.hasActiveTariff
                        ? `Активный: ${selectedCourse.activeTariffTitle}`
                        : 'Активного тарифа нет'}
                    </span>
                  </div>

                  <p className="panel-copy">
                    {selectedCourse.tariffSlugPolicy}
                  </p>

                  <div className="admin-tariff-list">
                    {selectedCourse.tariffs.length > 0 ? (
                      selectedCourse.tariffs.map((tariff) => (
                        <button
                          key={tariff.id}
                          className={`admin-tariff-list__item ${
                            selectedTariffId === tariff.id ? 'admin-tariff-list__item--active' : ''
                          }`}
                          onClick={() => setSelectedTariffId(tariff.id)}
                          type="button"
                        >
                          <div className="admin-tariff-list__top">
                            <strong>{tariff.title}</strong>
                            <span className={getBadgeClass(tariff.isActive ? 'paid' : 'hidden')}>
                              {tariff.isActive ? 'Активен' : 'Выключен'}
                            </span>
                          </div>
                          <div className="admin-tariff-list__meta mono">{tariff.slug}</div>
                          <div className="admin-tariff-list__meta">
                            {formatMoney(tariff.price)} / заказов: {tariff.ordersCount}
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="muted-text" style={{ margin: 0 }}>
                        У курса пока нет тарифов. Если курс опубликован, без активного тарифа он
                        считается бесплатным.
                      </p>
                    )}
                  </div>

                  {selectedTariff && tariffDraft ? (
                    <div className="admin-subeditor">
                      <div className="admin-subeditor__head">
                        <h4>Редактирование тарифа</h4>
                        <span className="mono">{selectedTariff.slug}</span>
                      </div>
                      <div className="field">
                        <label htmlFor="admin-tariff-title">Название тарифа</label>
                        <input
                          id="admin-tariff-title"
                          onChange={(event) =>
                            setTariffDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    title: event.target.value,
                                  }
                                : current
                            )
                          }
                          value={tariffDraft.title}
                        />
                      </div>
                      <div className="admin-readonly-grid">
                        <div className="field">
                          <label htmlFor="admin-tariff-price">Цена</label>
                          <input
                            id="admin-tariff-price"
                            inputMode="numeric"
                            onChange={(event) =>
                              setTariffDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      price: event.target.value,
                                    }
                                  : current
                              )
                            }
                            value={tariffDraft.price}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="admin-tariff-interval">Тип доступа (служебное поле)</label>
                          <input
                            id="admin-tariff-interval"
                            onChange={(event) =>
                              setTariffDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      interval: event.target.value,
                                    }
                                  : current
                              )
                            }
                            value={tariffDraft.interval}
                          />
                        </div>
                      </div>
                      <label className="checkbox-row">
                        <input
                          checked={tariffDraft.isActive}
                          onChange={(event) =>
                            setTariffDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    isActive: event.target.checked,
                                  }
                                : current
                            )
                          }
                          type="checkbox"
                        />
                        <span>Тариф активен для покупки</span>
                      </label>
                      <button
                        className="primary-button"
                        disabled={pendingKey === 'save-tariff'}
                        onClick={handleSaveTariff}
                        type="button"
                      >
                        {pendingKey === 'save-tariff' ? 'Сохраняем...' : 'Сохранить тариф'}
                      </button>
                    </div>
                  ) : null}

                  <div className="admin-subeditor">
                    <div className="admin-subeditor__head">
                      <h4>Новый тариф</h4>
                      <span className="muted-text">Создайте тариф, чтобы курс стал платным</span>
                    </div>
                    <div className="field">
                      <label htmlFor="admin-new-tariff-title">Название тарифа</label>
                      <input
                        id="admin-new-tariff-title"
                        onChange={(event) =>
                          setCreateTariffDraft((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        value={createTariffDraft.title}
                      />
                    </div>
                    <div className="admin-readonly-grid">
                      <div className="field">
                        <label htmlFor="admin-new-tariff-slug">Slug адреса</label>
                        <input
                          id="admin-new-tariff-slug"
                          onChange={(event) =>
                            setCreateTariffDraft((current) => ({
                              ...current,
                              slug: event.target.value,
                            }))
                          }
                          value={createTariffDraft.slug}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="admin-new-tariff-price">Цена</label>
                        <input
                          id="admin-new-tariff-price"
                          inputMode="numeric"
                          onChange={(event) =>
                            setCreateTariffDraft((current) => ({
                              ...current,
                              price: event.target.value,
                            }))
                          }
                          value={createTariffDraft.price}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="admin-new-tariff-interval">Тип доступа (служебное поле)</label>
                      <input
                        id="admin-new-tariff-interval"
                        onChange={(event) =>
                          setCreateTariffDraft((current) => ({
                            ...current,
                            interval: event.target.value,
                          }))
                        }
                        value={createTariffDraft.interval}
                      />
                    </div>
                    <label className="checkbox-row">
                      <input
                        checked={createTariffDraft.isActive}
                        onChange={(event) =>
                          setCreateTariffDraft((current) => ({
                            ...current,
                            isActive: event.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      <span>Сразу сделать активным</span>
                    </label>
                    <button
                      className="primary-button"
                      disabled={pendingKey === 'create-tariff'}
                      onClick={handleCreateTariff}
                      type="button"
                    >
                      {pendingKey === 'create-tariff' ? 'Создаем...' : 'Создать тариф'}
                    </button>
                  </div>

                  {tariffFeedback ? (
                    <p
                      className={`feedback ${
                        tariffFeedback.tone === 'success' ? 'feedback-success' : 'feedback-error'
                      }`}
                    >
                      {tariffFeedback.message}
                    </p>
                  ) : null}
                </article>
              </>
            ) : (
              <article className="panel admin-editor-card">
                <h3>Курсов пока нет</h3>
                <p className="panel-copy">
                  Создайте первый курс слева, затем добавьте уроки и тарифы.
                </p>
              </article>
            )}
          </div>
        </div>
      </article>

      <article className="panel admin-section">
        <div className="admin-section__head">
          <span className="eyebrow">Заказы</span>
          <h2>Все заказы и статусы оплаты</h2>
          <p className="panel-copy">
            Быстрый фильтр по статусам и переход к пользователю или редактору курса.
          </p>
        </div>

        <div className="admin-filter-row">
          {(['ALL', 'PROCESSING', 'PAID', 'FAILED', 'PENDING', 'CANCELED', 'EXPIRED'] as const).map(
            (status) => (
              <button
                key={status}
                aria-pressed={orderFilter === status}
                className={`catalog-directory__filter-pill ${
                  orderFilter === status ? 'catalog-directory__filter-pill--active' : ''
                }`}
                onClick={() => setOrderFilter(status)}
                type="button"
              >
                {status}
              </button>
            )
          )}
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Курс / тариф</th>
                <th>Пользователь</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>Способ</th>
                <th>Создан</th>
                <th>Обновлен</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button
                        className="admin-inline-link"
                        onClick={() => jumpToCourseEditor(item.courseId)}
                        type="button"
                      >
                        {item.courseTitle}
                      </button>
                      <div className="muted-text admin-cell__sub">
                        {item.tariffTitle} / <span className="mono">{item.courseSlug}</span>
                      </div>
                    </td>
                    <td>
                      <a className="mono" href={`#admin-user-${item.userId}`}>
                        {item.userEmail}
                      </a>
                    </td>
                    <td>{formatMoney(item.amount)}</td>
                    <td>
                      <span className={getBadgeClass(item.status)}>{item.status}</span>
                    </td>
                    <td>{item.paymentMethod}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>{formatDate(item.updatedAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <p className="muted-text" style={{ margin: 0 }}>
                      По выбранному фильтру заказов нет.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel admin-section">
        <div className="admin-section__head">
          <span className="eyebrow">Пользователи</span>
          <h2>Кто уже в системе</h2>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Роль</th>
                <th>Создан</th>
                <th>Доступно курсов</th>
                <th>Куплено</th>
                <th>Активный заказ</th>
              </tr>
            </thead>
            <tbody>
              {initialData.users.length > 0 ? (
                initialData.users.map((item) => (
                  <tr id={`admin-user-${item.id}`} key={item.id}>
                    <td className="mono">{item.email}</td>
                    <td>
                      <span className={getBadgeClass(item.role)}>{getRoleLabel(item.role)}</span>
                    </td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>{item.accessibleCoursesCount}</td>
                    <td>{item.ownedCoursesCount}</td>
                    <td>{item.hasPendingOrder ? 'Да' : 'Нет'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <p className="muted-text" style={{ margin: 0 }}>
                      Пользователей пока нет.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel admin-section">
        <div className="admin-section__head">
          <span className="eyebrow">Доступы</span>
          <h2>Кому уже открыт курс</h2>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Курс</th>
                <th>Источник</th>
                <th>Создан</th>
              </tr>
            </thead>
            <tbody>
              {initialData.enrollments.length > 0 ? (
                initialData.enrollments.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <a className="mono" href={`#admin-user-${item.userId}`}>
                        {item.userEmail}
                      </a>
                    </td>
                    <td>
                      <button
                        className="admin-inline-link"
                        onClick={() => jumpToCourseEditor(item.courseId)}
                        type="button"
                      >
                        {item.courseTitle}
                      </button>
                      <div className="muted-text admin-cell__sub mono">{item.courseSlug}</div>
                    </td>
                    <td>
                      <span className={getBadgeClass(item.source)}>
                        {getEnrollmentSourceLabel(item.source)}
                      </span>
                    </td>
                    <td>{formatDate(item.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>
                    <p className="muted-text" style={{ margin: 0 }}>
                      Выданных доступов пока нет.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
