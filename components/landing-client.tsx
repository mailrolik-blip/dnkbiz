'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  dnkFunnelHeroPoints,
  dnkFunnelProofPoints,
  dnkFunnelScenarios,
} from '@/lib/dnk-content';
import {
  groupCatalogCourses,
  type CatalogCourseCard,
  type CatalogCourseStatus,
} from '@/lib/lms-catalog';
import type { LandingPageData } from '@/lib/landing';

type LandingClientProps = LandingPageData;

function formatMoney(value: number | null) {
  if (value === null) {
    return 'Бесплатно';
  }

  return `${value.toLocaleString('ru-RU')} ₽`;
}

function getStatusLabel(status: CatalogCourseStatus) {
  if (status === 'free') {
    return 'Бесплатный';
  }

  if (status === 'paid') {
    return 'Платный';
  }

  return 'Скоро';
}

function getStatusClass(status: CatalogCourseStatus) {
  if (status === 'free') {
    return 'badge badge-complete';
  }

  if (status === 'paid') {
    return 'badge badge-paid';
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

function getCatalogAnchorId(groupId: string) {
  if (groupId === 'office-accounting') {
    return 'catalog-office';
  }

  if (groupId === 'safety') {
    return 'catalog-safety';
  }

  return 'catalog-management';
}

type CatalogActionProps = {
  course: CatalogCourseCard;
  userEmail: string | null;
  buyingTariffId: number | null;
  onCreateOrder: (course: CatalogCourseCard) => void;
};

function CatalogCourseAction({
  course,
  userEmail,
  buyingTariffId,
  onCreateOrder,
}: CatalogActionProps) {
  if (course.status === 'free') {
    return (
      <Link href={userEmail ? `/courses/${course.slug}` : '/register'} className="primary-button">
        {userEmail
          ? course.isStarted
            ? 'Продолжить бесплатно'
            : 'Начать бесплатно'
          : 'Регистрация'}
      </Link>
    );
  }

  if (course.status === 'showcase') {
    return <span className="ghost-button landing-card-disabled">Скоро в платформе</span>;
  }

  if (course.isOwned) {
    return (
      <Link href={`/courses/${course.slug}`} className="primary-button">
        Открыть курс
      </Link>
    );
  }

  if (course.pendingOrder) {
    return (
      <Link href={course.pendingOrder.checkoutUrl} className="primary-button">
        Продолжить оплату
      </Link>
    );
  }

  if (!userEmail) {
    return (
      <Link href="/register" className="primary-button">
        Регистрация и preview
      </Link>
    );
  }

  return (
    <button
      className="primary-button"
      disabled={buyingTariffId === course.tariffId}
      onClick={() => onCreateOrder(course)}
      type="button"
    >
      {buyingTariffId === course.tariffId ? 'Создаем заказ...' : 'Купить курс'}
    </button>
  );
}

export default function LandingClient({
  user,
  catalogCourses,
  ...rest
}: LandingClientProps) {
  const { featuredCourse } = rest;
  const router = useRouter();
  const [buyingTariffId, setBuyingTariffId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: 'error' | 'success';
    message: string;
  } | null>(null);

  const featuredPaidCourse =
    catalogCourses.find((course) => course.slug === 'practical-course') ??
    catalogCourses.find((course) => course.status === 'paid') ??
    null;
  const freeStarterCourse =
    catalogCourses.find((course) => course.status === 'free') ?? null;
  const directionShelves = groupCatalogCourses(
    catalogCourses.filter((course) => course.slug !== featuredPaidCourse?.slug)
  );

  async function handleCreateOrder(course: CatalogCourseCard) {
    if (!course.tariffId) {
      return;
    }

    setFeedback(null);
    setBuyingTariffId(course.tariffId);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tariffId: course.tariffId,
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
        message: `Заказ #${payload?.order?.id ?? ''} создан. Продолжите оплату в checkout.`,
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

  function renderHeroPrimaryAction() {
    if (!user) {
      return (
        <Link href="/register" className="primary-button" data-access-state="guest-register">
          Бесплатная регистрация
        </Link>
      );
    }

    if (featuredPaidCourse?.pendingOrder) {
      return (
        <Link
          href={featuredPaidCourse.pendingOrder.checkoutUrl}
          className="primary-button"
          data-access-state="pending"
        >
          Продолжить оплату
        </Link>
      );
    }

    if (featuredPaidCourse?.isOwned) {
      return (
        <Link
          href={`/courses/${featuredPaidCourse.slug}`}
          className="primary-button"
          data-access-state="owned"
        >
          Открыть курс
        </Link>
      );
    }

    if (featuredPaidCourse?.isStarted) {
      return (
        <Link
          href={`/courses/${featuredPaidCourse.slug}`}
          className="primary-button"
          data-access-state="preview"
        >
          Продолжить preview
        </Link>
      );
    }

    if (freeStarterCourse) {
      return (
        <Link
          href={`/courses/${freeStarterCourse.slug}`}
          className="primary-button"
          data-access-state="free-course"
        >
          Начать бесплатно
        </Link>
      );
    }

    return (
      <Link href="/lk" className="primary-button" data-access-state="cabinet">
        Перейти в кабинет
      </Link>
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

    return (
      <a href="#catalog" className="secondary-button" data-hero-secondary="catalog">
        Смотреть каталог
      </a>
    );
  }

  return (
    <main className="page-shell">
      <header className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>Бизнес школа ДНК</span>
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
            электробезопасность и другие программы с быстрым доступом после оплаты.
          </p>

          <div className="row-actions">
            {renderHeroPrimaryAction()}
            {renderHeroSecondaryAction()}
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
          <span className="eyebrow">Старт без тупика</span>
          <div className="funnel-mini-stat">
            <span>Бесплатный курс</span>
            <strong>{freeStarterCourse?.title ?? 'Откроется после seed'}</strong>
          </div>
          <div className="funnel-mini-stat">
            <span>Платный курс с preview</span>
            <strong>{featuredPaidCourse?.previewLessonsCount ?? 0} урока до покупки</strong>
          </div>
          <div className="funnel-mini-stat">
            <span>После оплаты</span>
            <strong>полный доступ в LMS</strong>
          </div>
          <div className="badge-row">
            <span className="badge badge-complete">free / paid / showcase</span>
            <span className="badge badge-paid">self-serve LMS</span>
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
                Реальный LMS-поток уже собран: регистрация, preview, покупка, уроки,
                домашка и возврат в кабинет без ручной выдачи доступа.
              </p>

              <div className="feature-metrics">
                <div>
                  <dt>Уроков внутри</dt>
                  <dd>{featuredCourse?.lessonsCount ?? 0}</dd>
                </div>
                <div>
                  <dt>Preview до оплаты</dt>
                  <dd>{featuredPaidCourse?.previewLessonsCount ?? 0} урока</dd>
                </div>
                <div>
                  <dt>Формат</dt>
                  <dd>Живой LMS-курс</dd>
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
                {featuredPaidCourse ? (
                  <CatalogCourseAction
                    buyingTariffId={buyingTariffId}
                    course={featuredPaidCourse}
                    onCreateOrder={handleCreateOrder}
                    userEmail={user?.email ?? null}
                  />
                ) : (
                  <Link href={user ? '/lk' : '/register'} className="primary-button">
                    {user ? 'Открыть кабинет' : 'Бесплатная регистрация'}
                  </Link>
                )}
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
                      {index < (featuredPaidCourse?.previewLessonsCount ?? 0)
                        ? 'Открывается как preview'
                        : index === 0
                        ? 'Текущий модуль'
                        : 'Полный доступ после покупки'}
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
          <span className="section-heading__sub">Статусы курсов внутри LMS</span>
        </div>

        {featuredPaidCourse ? (
          <article className="panel funnel-live-card">
            <div className="funnel-live-card__content">
              <div className="funnel-live-card__meta">
                <span className="eyebrow">Основной платный курс</span>
                <span className="funnel-card-pill">Preview + покупка + LMS</span>
              </div>
              <div className="funnel-live-card__body">
                <h2>{featuredPaidCourse.title}</h2>
                <p className="panel-copy">
                  Полный курс открывается после оплаты, а до покупки доступны preview-уроки
                  внутри того же маршрута `/courses/slug`.
                </p>
              </div>
            </div>
            <div className="funnel-live-card__stats">
              <span className="badge badge-paid">Платный курс</span>
              <span className="badge badge-pending">
                {featuredPaidCourse.previewLessonsCount} preview-урока
              </span>
              <span className="badge badge-complete">{formatMoney(featuredPaidCourse.price)}</span>
            </div>
            <div className="row-actions funnel-live-card__actions">
              <CatalogCourseAction
                buyingTariffId={buyingTariffId}
                course={featuredPaidCourse}
                onCreateOrder={handleCreateOrder}
                userEmail={user?.email ?? null}
              />
              <Link className="secondary-button" href={`/courses/${featuredPaidCourse.slug}`}>
                Открыть preview
              </Link>
            </div>
          </article>
        ) : null}

        <div className="funnel-catalog">
          {directionShelves.map((shelf) => (
            <article key={shelf.id} id={getCatalogAnchorId(shelf.id)} className="panel funnel-shelf">
              <div className="funnel-shelf__head">
                <span className="eyebrow">{shelf.title}</span>
                <h2>{shelf.title}</h2>
                <p className="panel-copy">{shelf.description}</p>
              </div>

              <div className="funnel-shelf__grid">
                {shelf.courses.map((course) => (
                  <article
                    key={course.slug}
                    className={`program-highlight-card showcase-course-card showcase-course-card--${course.status}`}
                  >
                    <div className="showcase-course-card__meta">
                      <span className="showcase-course-card__category">
                        {course.category}
                      </span>
                      <span className={getStatusClass(course.status)}>
                        {getStatusLabel(course.status)}
                      </span>
                    </div>
                    <div className="showcase-course-card__body">
                      <h3>{course.title}</h3>
                      <p className="showcase-course-card__description">
                        {course.description}
                      </p>
                    </div>
                    <div className="showcase-course-card__footer">
                      <div className="showcase-course-card__pricing">
                        <span className="showcase-course-card__label">
                          {course.status === 'showcase' ? 'Статус' : 'Доступ'}
                        </span>
                        <span className="showcase-course-card__price">
                          {course.status === 'showcase'
                            ? 'Витрина / скоро'
                            : formatMoney(course.price)}
                        </span>
                      </div>
                      <div className="showcase-course-card__actions">
                        <CatalogCourseAction
                          buyingTariffId={buyingTariffId}
                          course={course}
                          onCreateOrder={handleCreateOrder}
                          userEmail={user?.email ?? null}
                        />
                        {course.status === 'paid' && course.previewLessonsCount > 0 ? (
                          <Link className="ghost-button" href={`/courses/${course.slug}`}>
                            Preview
                          </Link>
                        ) : null}
                      </div>
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
          <h2>Зарегистрируйтесь бесплатно и соберите свой маршрут внутри LMS.</h2>
          <p className="panel-copy">
            Бесплатный курс можно начать сразу, а платные программы открыть через preview и
            checkout без менеджерского сценария.
          </p>

          <div className="row-actions">
            {renderHeroPrimaryAction()}
            <a href="#catalog" className="secondary-button">
              Выбрать курс
            </a>
          </div>
        </article>
      </section>
    </main>
  );
}
