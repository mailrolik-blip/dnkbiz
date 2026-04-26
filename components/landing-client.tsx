'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  dnkFunnelHeroPoints,
  dnkFunnelProofPoints,
  dnkFunnelScenarios,
} from '@/lib/dnk-content';
import {
  getCourseCatalogHref,
  groupCatalogCourses,
  type CatalogCourseCard,
} from '@/lib/lms-catalog';
import type { LandingPageData } from '@/lib/landing';
import { getActiveOrderActionLabel } from '@/lib/payments/constants';
import {
  getCatalogCourseActionHint,
  formatCoursePrice,
  formatLessonCount,
  formatPreviewLessons,
  getCatalogCourseNextStep,
  getCatalogCourseStatusClass,
  getCatalogCourseStatusLabel,
  getCatalogCourseToneClass,
  isStartedPreviewCourse,
} from '@/lib/purchase-ux';

type LandingClientProps = LandingPageData;

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {direction === 'left' ? <path d="m15 6-6 6 6 6" /> : <path d="m9 6 6 6-6 6" />}
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

function getCatalogShelfCountLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} курс`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} курса`;
  }

  return `${count} курсов`;
}

function getCatalogCardValueLabel(course: CatalogCourseCard) {
  if (course.status === 'showcase') {
    return 'Статус';
  }

  if (course.pendingOrder) {
    return 'Заказ';
  }

  if (course.isOwned || course.status === 'free') {
    return 'Доступ';
  }

  return 'Стоимость';
}

function getCatalogCardValue(course: CatalogCourseCard) {
  if (course.status === 'showcase') {
    return 'Скоро в каталоге';
  }

  if (course.pendingOrder) {
    return course.pendingOrder.status === 'PROCESSING'
      ? 'Оплата в обработке'
      : 'Продолжить оплату';
  }

  if (course.isOwned) {
    return 'Полный доступ открыт';
  }

  if (course.status === 'free') {
    return 'Открывается сразу';
  }

  return formatCoursePrice(course.price);
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
  if (course.status === 'showcase') {
    return <span className="ghost-button landing-card-disabled">Скоро</span>;
  }

  if (course.status === 'free') {
    return (
      <Link href={userEmail ? `/courses/${course.slug}` : '/register'} className="primary-button">
        {userEmail
          ? course.isStarted
            ? 'Открыть курс'
            : 'Начать бесплатно'
          : 'Зарегистрироваться'}
      </Link>
    );
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
        {getActiveOrderActionLabel(course.pendingOrder.status)}
      </Link>
    );
  }

  if (!userEmail) {
    return (
      <Link href="/register" className="primary-button">
        Зарегистрироваться
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
      {buyingTariffId === course.tariffId ? 'Открываем оплату...' : 'Купить курс'}
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
  const hasUser = Boolean(user?.email);

  const featuredPaidCourse =
    catalogCourses.find((course) => course.slug === 'practical-course') ??
    catalogCourses.find((course) => course.status === 'paid') ??
    null;
  const freeStarterCourse =
    catalogCourses.find((course) => course.status === 'free') ?? null;
  const directionShelves = groupCatalogCourses(
    catalogCourses.filter((course) => course.slug !== featuredPaidCourse?.slug)
  );
  const [activeShelfId, setActiveShelfId] = useState(directionShelves[0]?.id ?? '');
  const activeShelfTrackRef = useRef<HTMLDivElement | null>(null);
  const activeShelf =
    directionShelves.find((shelf) => shelf.id === activeShelfId) ?? directionShelves[0] ?? null;
  const activeShelfCardsStyle: CSSProperties | undefined = activeShelf
    ? ({
        ['--catalog-cards-mobile' as string]: 1,
        ['--catalog-cards-tablet' as string]: Math.min(activeShelf.courses.length, 2),
        ['--catalog-cards-desktop' as string]: Math.min(activeShelf.courses.length, 3),
      } as CSSProperties)
    : undefined;

  useEffect(() => {
    if (activeShelf || !directionShelves[0]) {
      return;
    }

    setActiveShelfId(directionShelves[0].id);
  }, [activeShelf, directionShelves]);

  useEffect(() => {
    activeShelfTrackRef.current?.scrollTo({ left: 0, behavior: 'auto' });
  }, [activeShelfId]);

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
            checkoutUrl?: string;
          }
        | null;

      if (payload?.checkoutUrl) {
        router.push(payload.checkoutUrl);
        router.refresh();
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.error || 'Не удалось открыть оплату.');
      }
    } catch (orderError) {
      setFeedback({
        tone: 'error',
        message:
          orderError instanceof Error
            ? orderError.message
            : 'Не удалось открыть оплату.',
      });
    } finally {
      setBuyingTariffId(null);
    }
  }

  function handleShelfScroll(direction: 'left' | 'right') {
    const track = activeShelfTrackRef.current;

    if (!track) {
      return;
    }

    const shift = Math.max(track.clientWidth * 0.9, 280);

    track.scrollBy({
      left: direction === 'right' ? shift : -shift,
      behavior: 'smooth',
    });
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
          {getActiveOrderActionLabel(featuredPaidCourse.pendingOrder.status)}
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
          Продолжить обучение
        </Link>
      );
    }

    if (featuredPaidCourse) {
      return (
        <button
          className="primary-button"
          disabled={buyingTariffId === featuredPaidCourse.tariffId}
          onClick={() => handleCreateOrder(featuredPaidCourse)}
          type="button"
        >
          {buyingTariffId === featuredPaidCourse.tariffId ? 'Открываем оплату...' : 'Купить курс'}
        </button>
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

    if (freeStarterCourse && !freeStarterCourse.isStarted) {
      return (
        <Link
          href={`/courses/${freeStarterCourse.slug}`}
          className="secondary-button"
          data-hero-secondary="free-course"
        >
          Начать бесплатно
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
            1С, Excel, Word, охрана труда, пожарная безопасность, электробезопасность и
            другие программы с понятным доступом: регистрация, покупка, обучение и возврат к
            прогрессу в одном LMS-маршруте.
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
          <span className="eyebrow">Как устроен вход</span>
          <div className="funnel-mini-stat">
            <span>Бесплатный курс</span>
            <strong>{freeStarterCourse?.title ?? 'Откроется после seed'}</strong>
          </div>
          <div className="funnel-mini-stat">
            <span>Первые уроки до покупки</span>
            <strong>{featuredPaidCourse?.previewLessonsCount ?? 0} урока</strong>
          </div>
          <div className="funnel-mini-stat">
            <span>После оплаты</span>
            <strong>полный доступ к курсу</strong>
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
          <span className="section-heading__sub">Выберите свой сценарий</span>
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
                Реальный поток уже собран: регистрация, первые уроки до покупки, покупка курса,
                уроки, домашка и возврат в кабинет без ручной выдачи доступа.
              </p>

              <div className="feature-metrics">
                <div>
                  <dt>Уроков внутри</dt>
                  <dd>{featuredCourse?.lessonsCount ?? 0}</dd>
                </div>
                <div>
                  <dt>До покупки</dt>
                  <dd>{featuredPaidCourse?.previewLessonsCount ?? 0} урока</dd>
                </div>
                <div>
                  <dt>Формат</dt>
                  <dd>живой LMS-курс</dd>
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
                  href={
                    user && freeStarterCourse && !freeStarterCourse.isStarted
                      ? `/courses/${freeStarterCourse.slug}`
                      : user
                      ? '/lk'
                      : '/register'
                  }
                  className="secondary-button"
                >
                  {user && freeStarterCourse && !freeStarterCourse.isStarted
                    ? 'Начать бесплатно'
                    : user
                    ? 'Перейти в кабинет'
                    : 'Создать кабинет'}
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
                        ? 'Открыто до покупки'
                        : index === 0
                        ? 'Текущий модуль'
                        : 'Открывается после покупки'}
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
          <span className="section-heading__sub">Выберите тему и откройте следующий курс</span>
        </div>

        {featuredPaidCourse ? (
          <article className="panel funnel-live-card funnel-live-card--featured">
            <div className="funnel-live-card__content">
              <div className="funnel-live-card__meta">
                <span className="eyebrow">Главный курс платформы</span>
                <span className="funnel-card-pill">Флагман self-serve LMS</span>
              </div>
              <div className="funnel-live-card__body">
                <h2>
                  <Link href={getCourseCatalogHref(featuredPaidCourse.slug)}>
                    {featuredPaidCourse.title}
                  </Link>
                </h2>
                <p className="panel-copy">{featuredPaidCourse.description}</p>
                <div className="badge-row funnel-live-card__feature-list">
                  {featuredPaidCourse.lessonsCount ? (
                    <span className="badge badge-pending">
                      {formatLessonCount(featuredPaidCourse.lessonsCount)}
                    </span>
                  ) : null}
                  <span className="badge badge-pending">
                    {formatPreviewLessons(featuredPaidCourse.previewLessonsCount)}
                  </span>
                  <span className="badge badge-complete">
                    {featuredPaidCourse.isOwned
                      ? 'Полный доступ уже открыт'
                      : formatCoursePrice(featuredPaidCourse.price)}
                  </span>
                </div>
                <p className="funnel-live-card__hint">
                  {getCatalogCourseNextStep(featuredPaidCourse, hasUser)}
                </p>
              </div>
            </div>
            <div className="funnel-live-card__aside">
              <span className={getCatalogCourseStatusClass(featuredPaidCourse)}>
                {getCatalogCourseStatusLabel(featuredPaidCourse)}
              </span>
              <div className="funnel-live-card__pricing">
                <span>{getCatalogCardValueLabel(featuredPaidCourse)}</span>
                <strong>{getCatalogCardValue(featuredPaidCourse)}</strong>
              </div>
              <p className="funnel-live-card__support">
                {getCatalogCourseActionHint(featuredPaidCourse, hasUser)}
              </p>
              <div className="funnel-live-card__actions">
                <CatalogCourseAction
                  buyingTariffId={buyingTariffId}
                  course={featuredPaidCourse}
                  onCreateOrder={handleCreateOrder}
                  userEmail={user?.email ?? null}
                />
                <Link className="funnel-live-card__link" href={getCourseCatalogHref(featuredPaidCourse.slug)}>
                  {isStartedPreviewCourse(featuredPaidCourse)
                    ? 'Страница курса и preview'
                    : 'Посмотреть страницу курса'}
                </Link>
              </div>
            </div>
          </article>
        ) : null}

        {activeShelf ? (
          <article
            id={getCatalogAnchorId(activeShelf.id)}
            className="panel funnel-shelf funnel-shelf--carousel"
          >
            <div className="funnel-shelf__toolbar">
              <div className="funnel-shelf__tabs" aria-label="Темы каталога курсов">
                {directionShelves.map((shelf) => {
                  const isActive = shelf.id === activeShelf.id;

                  return (
                    <button
                      key={shelf.id}
                      aria-pressed={isActive}
                      className={`funnel-shelf__tab ${isActive ? 'funnel-shelf__tab--active' : ''}`}
                      onClick={() => setActiveShelfId(shelf.id)}
                      type="button"
                    >
                      {shelf.title}
                    </button>
                  );
                })}
              </div>

              {activeShelf.courses.length > 1 ? (
                <div className="funnel-shelf__nav">
                  <button
                    aria-label="Показать предыдущие курсы"
                    className="funnel-shelf__nav-button"
                    onClick={() => handleShelfScroll('left')}
                    type="button"
                  >
                    <ChevronIcon direction="left" />
                  </button>
                  <button
                    aria-label="Показать следующие курсы"
                    className="funnel-shelf__nav-button"
                    onClick={() => handleShelfScroll('right')}
                    type="button"
                  >
                    <ChevronIcon direction="right" />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="funnel-shelf__head">
              <div>
                <span className="eyebrow">Тема каталога</span>
                <h2>{activeShelf.title}</h2>
              </div>
              <div className="funnel-shelf__summary">
                <p className="panel-copy">{activeShelf.description}</p>
                <span className="funnel-shelf__count">
                  {getCatalogShelfCountLabel(activeShelf.courses.length)}
                </span>
              </div>
            </div>

            <div className="catalog-carousel">
              <div
                ref={activeShelfTrackRef}
                className="catalog-carousel__track"
                style={activeShelfCardsStyle}
              >
                {activeShelf.courses.map((course) => (
                  <article
                    key={course.slug}
                    className={`program-highlight-card showcase-course-card catalog-carousel-card ${getCatalogCourseToneClass(
                      course
                    )}`}
                  >
                    <div className="catalog-carousel-card__head">
                      <span className={getCatalogCourseStatusClass(course)}>
                        {getCatalogCourseStatusLabel(course)}
                      </span>
                      {course.lessonsCount ? (
                        <span className="catalog-carousel-card__meta">
                          {formatLessonCount(course.lessonsCount)}
                        </span>
                      ) : null}
                    </div>

                    <div className="catalog-carousel-card__body">
                      <h3>
                        <Link href={getCourseCatalogHref(course.slug)}>{course.title}</Link>
                      </h3>
                      <p className="catalog-carousel-card__description">{course.description}</p>
                    </div>

                    <div className="catalog-carousel-card__footer">
                      <div className="catalog-carousel-card__details">
                        <div className="catalog-carousel-card__pricing">
                          <span className="catalog-carousel-card__label">
                            {getCatalogCardValueLabel(course)}
                          </span>
                          <span className="catalog-carousel-card__price">
                            {getCatalogCardValue(course)}
                          </span>
                        </div>

                        <div className="catalog-carousel-card__badges">
                          {course.previewEnabled && course.previewLessonsCount > 0 ? (
                            <span className="badge badge-pending">
                              {formatPreviewLessons(course.previewLessonsCount)}
                            </span>
                          ) : null}
                          {course.status === 'free' ? (
                            <span className="badge badge-complete">Доступ сразу</span>
                          ) : null}
                        </div>

                        <p className="catalog-carousel-card__support">
                          {getCatalogCourseActionHint(course, hasUser)}
                        </p>
                      </div>

                      <div className="catalog-carousel-card__cta">
                        <CatalogCourseAction
                          buyingTariffId={buyingTariffId}
                          course={course}
                          onCreateOrder={handleCreateOrder}
                          userEmail={user?.email ?? null}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </article>
        ) : null}
      </section>

      <section id="final-cta" className="dnk-section">
        <article className="panel funnel-final-cta">
          <span className="eyebrow">Старт в LMS</span>
          <h2>Зарегистрируйтесь бесплатно и соберите свой маршрут внутри LMS.</h2>
          <p className="panel-copy">
            Бесплатные курсы можно начать сразу, а платные программы покупать и проходить в том
            же кабинете без заявок, менеджерского шага и ручной выдачи доступа.
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
