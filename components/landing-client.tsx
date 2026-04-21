'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  dnkFunnelCatalogShelves,
  dnkFunnelHeroPoints,
  dnkFunnelProofPoints,
  dnkFunnelScenarios,
  dnkShowcaseCourses,
} from '@/lib/dnk-content';
import type { ShowcaseCourse, ShowcaseCourseStatus } from '@/lib/dnk-content';
import type { LandingPageData, LandingTariff } from '@/lib/landing';

type LandingClientProps = LandingPageData;

type AccessActionLabels = {
  create: string;
  guest: string;
  loading: string;
  owned: string;
  pending: string;
};

function formatMoney(value: number) {
  return `${value.toLocaleString('ru-RU')} ₽`;
}

function getShowcaseStatusLabel(status: ShowcaseCourseStatus) {
  if (status === 'ACTIVE') {
    return 'Доступен';
  }

  if (status === 'SHOWCASE') {
    return 'В каталоге';
  }

  return 'Скоро';
}

function getShowcaseStatusClass(status: ShowcaseCourseStatus) {
  if (status === 'ACTIVE') {
    return 'badge badge-paid';
  }

  if (status === 'SHOWCASE') {
    return 'badge badge-complete';
  }

  return 'badge badge-pending';
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

type CourseCardActionProps = {
  course: ShowcaseCourse;
};

function ShowcaseCourseAction({ course }: CourseCardActionProps) {
  if (course.status === 'SOON') {
    return (
      <button className="ghost-button" disabled type="button">
        Скоро
      </button>
    );
  }

  return (
    <a href="#final-cta" className="secondary-button">
      Подробнее
    </a>
  );
}

export default function LandingClient({
  user,
  featuredCourse,
  tariffs,
}: LandingClientProps) {
  const router = useRouter();
  const [buyingTariffId, setBuyingTariffId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: 'error' | 'success';
    message: string;
  } | null>(null);

  const primaryTariff = tariffs[0] ?? null;

  const showcaseCourseMap = new Map(
    dnkShowcaseCourses.map((course) => [course.slug, course])
  );

  const directionShelves = dnkFunnelCatalogShelves.map((shelf) => ({
    ...shelf,
    courses: shelf.courseSlugs
      .map((slug) => showcaseCourseMap.get(slug))
      .filter((course): course is ShowcaseCourse => Boolean(course)),
  }));

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
        message: `Заказ #${payload?.order?.id ?? ''} создан. Доступ к курсу откроется сразу после подтверждения оплаты.`,
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

  function renderAccessAction(
    className: string,
    labels?: Partial<AccessActionLabels>,
    tariff: LandingTariff | null = primaryTariff
  ) {
    const resolvedLabels: AccessActionLabels = {
      create: 'Получить доступ',
      guest: 'Начать обучение',
      loading: 'Создаем заказ...',
      owned: 'Открыть курс',
      pending: 'Продолжить оплату',
      ...labels,
    };

    if (!tariff) {
      return (
        <Link href="/register" className={className} data-access-state="guest">
          {resolvedLabels.guest}
        </Link>
      );
    }

    if (!user) {
      return (
        <Link href="/register" className={className} data-access-state="guest">
          {resolvedLabels.guest}
        </Link>
      );
    }

    if (tariff.isOwned) {
      return (
        <Link
          href={`/courses/${tariff.courseSlug}`}
          className={className}
          data-access-state="owned"
        >
          {resolvedLabels.owned}
        </Link>
      );
    }

    if (tariff.pendingOrder) {
      return (
        <Link
          href={tariff.pendingOrder.checkoutUrl}
          className={className}
          data-access-state="pending"
        >
          {resolvedLabels.pending}
        </Link>
      );
    }

    return (
      <button
        className={className}
        data-access-state="create"
        disabled={buyingTariffId === tariff.id}
        onClick={() => handleCreateOrder(tariff.id)}
        type="button"
      >
        {buyingTariffId === tariff.id
          ? resolvedLabels.loading
          : resolvedLabels.create}
      </button>
    );
  }

  function renderHeroSecondaryAction() {
    if (!user) {
      return (
        <Link href="/login" className="secondary-button" data-hero-secondary="login">
          Войти
        </Link>
      );
    }

    if (primaryTariff?.isOwned) {
      return (
        <Link href="/lk" className="secondary-button" data-hero-secondary="cabinet">
          Личный кабинет
        </Link>
      );
    }

    return (
      <a href="#proof" className="secondary-button" data-hero-secondary="demo">
        Смотреть демо
      </a>
    );
  }

  return (
    <main className="page-shell">
      <header className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>БИЗНЕС ШКОЛА ДНК</span>
        </Link>

        <div className="row-actions" style={{ marginTop: 0 }}>
          {user ? (
            <Link href="/lk" className="ghost-button">
              Личный кабинет
            </Link>
          ) : (
            <>
              <Link href="/login" className="ghost-button">
                Войти
              </Link>
              <Link href="/register" className="secondary-button">
                Регистрация
              </Link>
            </>
          )}
        </div>
      </header>

      <section id="hero" className="dnk-section funnel-hero">
        <article className="panel funnel-hero__main">
          <span className="eyebrow">DNK Biz</span>
          <h1 className="funnel-hero__title">
            Курсы для работы и обязательного обучения в одном кабинете
          </h1>
          <p className="funnel-hero__subtitle">
            1С, Excel, Word, охрана труда, пожарная безопасность,
            электробезопасность и другие программы с быстрым доступом после
            оплаты.
          </p>

          <div className="row-actions">
            {renderAccessAction('primary-button', {
              create: 'Получить доступ',
              owned: 'Открыть курс',
            })}
            {renderHeroSecondaryAction()}
          </div>

          {feedback ? (
            <p
              className={`feedback ${
                feedback.tone === 'success'
                  ? 'feedback-success'
                  : 'feedback-error'
              }`}
            >
              {feedback.message}
            </p>
          ) : null}

          <div className="funnel-hero__points">
            {dnkFunnelHeroPoints.map((point) => (
              <div key={point} className="funnel-value">
                <span className="funnel-value__icon">
                  <CheckIcon />
                </span>
                <span>{point}</span>
              </div>
            ))}
          </div>
        </article>

        <aside className="panel funnel-hero__aside">
          <span className="eyebrow">Что уже работает</span>
          <div className="funnel-mini-stat">
            <span>Живой курс</span>
            <strong>{featuredCourse?.title ?? 'Платформа ДНК'}</strong>
          </div>
          <div className="funnel-mini-stat">
            <span>Уроков внутри LMS</span>
            <strong>{featuredCourse?.lessonsCount ?? 0}</strong>
          </div>
          <div className="funnel-mini-stat">
            <span>Доступ</span>
            <strong>сразу после оплаты</strong>
          </div>
          <div className="badge-row">
            <span className="badge badge-paid">обучение в кабинете</span>
            <span className="badge badge-complete">progress работает</span>
          </div>
        </aside>
      </section>

      <section id="scenarios" className="dnk-section">
        <div className="section-heading">
          <span className="section-heading__main">Сценарии</span>
          <span className="section-heading__divider">/</span>
          <span className="section-heading__sub">Выберите ваш сценарий</span>
        </div>

        <div className="funnel-scenarios">
          {dnkFunnelScenarios.map((scenario) => (
            <article
              key={scenario.id}
              className={`panel funnel-scenario-card ${
                'isPriority' in scenario && scenario.isPriority
                  ? 'funnel-scenario-card--priority'
                  : ''
              }`}
            >
              <span className="eyebrow">Сценарий</span>
              <h2>{scenario.title}</h2>
              <p className="panel-copy">{scenario.description}</p>
              <ul className="funnel-list">
                {scenario.examples.map((example) => (
                  <li key={example}>{example}</li>
                ))}
              </ul>
              <a href={scenario.href} className="secondary-button">
                {scenario.ctaLabel}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section id="proof" className="dnk-section">
        <div className="section-heading">
          <span className="section-heading__main">Платформа</span>
          <span className="section-heading__divider">/</span>
          <span className="section-heading__sub">Живой курс уже работает</span>
        </div>

        <div className="lms-wrapper funnel-proof">
          <article className="lms-main glass-panel">
            <div className="lms-scroll-area">
              <span className="lms-tag">Proof</span>
              <h2 className="lms-title">
                {featuredCourse?.title ?? 'Платформа ДНК: стартовый курс'}
              </h2>
              <p className="lms-desc">
                Реальный LMS-поток уже собран: доступ, уроки, домашка и возврат
                в кабинет без ручной выдачи.
              </p>

              <div className="feature-metrics">
                <div>
                  <dt>Уроков</dt>
                  <dd>{featuredCourse?.lessonsCount ?? 0}</dd>
                </div>
                <div>
                  <dt>Выдача доступа</dt>
                  <dd>автоматически</dd>
                </div>
                <div>
                  <dt>Формат</dt>
                  <dd>живой курс</dd>
                </div>
              </div>

              <div className="funnel-proof__points">
                {dnkFunnelProofPoints.map((point) => (
                  <div key={point} className="funnel-value">
                    <span className="funnel-value__icon">
                      <CheckIcon />
                    </span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>

              <div className="row-actions">
                {renderAccessAction('primary-button', {
                  create: 'Открыть доступ',
                  owned: 'Открыть курс',
                })}
                <Link
                  href={user ? '/lk' : '/register'}
                  className="secondary-button"
                >
                  {user ? 'Перейти в кабинет' : 'Создать кабинет'}
                </Link>
              </div>
            </div>
          </article>

          <aside className="lms-sidebar glass-panel">
            <div className="progress-box">
              <div className="progress-info">
                <span>Маршрут пользователя</span>
                <span>готов</span>
              </div>
              <div className="progress-line">
                <div className="progress-fill" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="lessons-list">
              {(featuredCourse?.lessons ?? []).slice(0, 5).map((lesson, index) => (
                <div
                  key={lesson.id}
                  className={`lesson-btn ${
                    index === 0 ? 'active' : index < 2 ? 'completed' : ''
                  }`}
                >
                  <div className="lesson-btn__body">
                    <span className="lesson-btn__title">
                      {lesson.position}. {lesson.title}
                    </span>
                    <span className="lesson-btn__meta">
                      {index === 0
                        ? 'Текущий модуль'
                        : index < 2
                        ? 'Урок завершен'
                        : 'Доступен после оплаты'}
                    </span>
                  </div>
                  <span className="check-icon">
                    <CheckIcon />
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section id="catalog" className="dnk-section">
        <div className="section-heading">
          <span className="section-heading__main">Каталог</span>
          <span className="section-heading__divider">/</span>
          <span className="section-heading__sub">Компактные направления</span>
        </div>

        <article className="panel funnel-live-card">
          <div>
            <span className="eyebrow">Живой курс платформы</span>
            <h2>{featuredCourse?.title ?? 'Платформа ДНК: стартовый курс'}</h2>
            <p className="panel-copy">
              Рабочий курс уже ведет пользователя от оплаты до уроков внутри
              платформы.
            </p>
          </div>
          <div className="badge-row">
            <span className="badge badge-paid">active</span>
            <span className="badge badge-complete">
              {featuredCourse?.lessonsCount ?? 0} уроков
            </span>
            <span className="badge badge-complete">LMS-preview</span>
          </div>
          <div className="row-actions">
            {renderAccessAction('primary-button', {
              create: 'Получить доступ',
              owned: 'Открыть курс',
            })}
          </div>
        </article>

        <div className="funnel-catalog">
          {directionShelves.map((shelf) => (
            <article key={shelf.id} id={shelf.id} className="panel funnel-shelf">
              <div className="funnel-shelf__head">
                <span className="eyebrow">{shelf.title}</span>
                <h2>{shelf.title}</h2>
                <p className="panel-copy">{shelf.description}</p>
              </div>

              <div className="funnel-shelf__grid">
                {shelf.courses.map((course) => (
                  <article
                    key={course.slug}
                    className="program-highlight-card showcase-course-card"
                  >
                    <div className="badge-row" style={{ marginTop: 0 }}>
                      <span className="badge badge-complete">
                        {course.category}
                      </span>
                      <span className={getShowcaseStatusClass(course.status)}>
                        {getShowcaseStatusLabel(course.status)}
                      </span>
                    </div>
                    <h3>{course.title}</h3>
                    <div className="showcase-course-card__footer">
                      <span className="showcase-course-card__price">
                        {formatMoney(course.price)}
                      </span>
                      <ShowcaseCourseAction course={course} />
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="final-cta" className="dnk-section">
        <article className="panel funnel-final-cta">
          <span className="eyebrow">Финальный CTA</span>
          <h2>Выберите программу или соберите обучение для команды.</h2>
          <p className="panel-copy">
            Короткий путь уже есть: программа, доступ, обучение, возврат в
            кабинет.
          </p>

          <div className="row-actions">
            {renderAccessAction('primary-button', {
              create: 'Выбрать программу',
              owned: 'Открыть курс',
            })}
            <a href="#scenarios" className="secondary-button">
              Подобрать обучение для компании
            </a>
          </div>
        </article>
      </section>
    </main>
  );
}
