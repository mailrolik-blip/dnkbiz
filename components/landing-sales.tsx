'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  dnkSalesAudienceSegments,
  dnkSalesCourseShelves,
  dnkSalesFaq,
  dnkSalesHeroPoints,
  dnkSalesHowItWorks,
  dnkSalesProblemCards,
  dnkSalesSectionLinks,
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

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m8 5 11 7-11 7V5Z" />
    </svg>
  );
}

export default function LandingSales({
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

  const courseShelves = dnkSalesCourseShelves.map((shelf) => ({
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

  function renderCourseAccessAction(
    className: string,
    labels?: Partial<AccessActionLabels>,
    tariff: LandingTariff | null = primaryTariff
  ) {
    const resolvedLabels: AccessActionLabels = {
      create: 'Купить курс',
      guest: 'Зарегистрироваться',
      loading: 'Открываем оплату...',
      owned: 'Открыть курс',
      pending: 'Продолжить оплату',
      ...labels,
    };

    if (!tariff) {
      return (
        <Link href="/register" className={className}>
          {resolvedLabels.guest}
        </Link>
      );
    }

    if (!user) {
      return (
        <Link href="/register" className={className}>
          {resolvedLabels.guest}
        </Link>
      );
    }

    if (tariff.isOwned) {
      return (
        <Link href={`/courses/${tariff.courseSlug}`} className={className}>
          {resolvedLabels.owned}
        </Link>
      );
    }

    if (tariff.pendingOrder) {
      return (
        <Link href={tariff.pendingOrder.checkoutUrl} className={className}>
          {resolvedLabels.pending}
        </Link>
      );
    }

    return (
      <button
        className={className}
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

      <nav className="sales-nav" aria-label="Навигация по странице">
        {dnkSalesSectionLinks.map((section) => (
          <a key={section.id} href={`#${section.id}`} className="sales-nav__item">
            {section.label}
          </a>
        ))}
      </nav>

      <section id="hero" className="dnk-section sales-hero">
        <article className="panel sales-hero__main">
          <span className="eyebrow">DNK Biz</span>
          <h1 className="sales-hero__title">
            Обучение для специалистов и компаний: обязательные программы,
            офисные навыки и рост роли в одном кабинете.
          </h1>
          <p className="sales-hero__copy">
            DNK Biz объединяет курсы по 1С, Excel, Word, управлению и
            безопасности в одну понятную воронку. После оплаты программа
            открывается в личном кабинете, а обучение продолжается там же, где
            сохраняется прогресс.
          </p>

          <div className="row-actions">
            {renderCourseAccessAction('primary-button', {
              create: 'Начать обучение',
              owned: 'Продолжить обучение',
            })}
            <a href="#catalog" className="secondary-button">
              Выбрать направление
            </a>
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

          <div className="feature-metrics sales-hero__metrics">
            {dnkSalesHeroPoints.map((point) => (
              <div key={point.label}>
                <dt>{point.label}</dt>
                <dd>{point.value}</dd>
              </div>
            ))}
          </div>
        </article>

        <div className="sales-hero__side">
          <article className="panel sales-spotlight">
            <span className="eyebrow">Три направления</span>
            <div className="sales-spotlight__list">
              {dnkSalesAudienceSegments.map((segment) => (
                <div key={segment.title} className="sales-spotlight__item">
                  <span className="sales-spotlight__label">
                    {segment.title}
                  </span>
                  <span className="sales-spotlight__value">
                    {segment.examples.join(' · ')}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel sales-spotlight">
            <span className="eyebrow">Живой курс платформы</span>
            <h2>{featuredCourse?.title ?? 'Платформа ДНК: стартовый курс'}</h2>
            <p className="panel-copy">
              Рабочий курс уже подключен к checkout, личному кабинету, доступу
              после оплаты и lesson-view с прогрессом.
            </p>
            <div className="badge-row">
              <span className="badge badge-paid">
                {featuredCourse?.lessonsCount ?? 0} уроков
              </span>
              <span className="badge badge-complete">доступ после оплаты</span>
              <span className="badge badge-complete">обучение в кабинете</span>
            </div>
            <div className="row-actions" style={{ marginTop: '1rem' }}>
              {renderCourseAccessAction('secondary-button', {
                create: 'Открыть доступ',
                owned: 'Перейти в курс',
              })}
            </div>
          </article>
        </div>
      </section>

      <section id="audience" className="dnk-section">
        <div className="section-heading">
          <span className="section-heading__main">Кому подходит</span>
          <span className="section-heading__divider">/</span>
          <span className="section-heading__sub">Сегменты</span>
        </div>

        <div className="sales-grid-3">
          {dnkSalesAudienceSegments.map((segment) => (
            <article key={segment.title} className="panel sales-segment-card">
              <span className="eyebrow">Сегмент</span>
              <h2>{segment.title}</h2>
              <p className="panel-copy">{segment.description}</p>
              <div className="chip-cloud">
                {segment.examples.map((example) => (
                  <span key={example} className="chip">
                    {example}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="solutions" className="dnk-section">
        <div className="section-heading">
          <span className="section-heading__main">Какие задачи</span>
          <span className="section-heading__divider">/</span>
          <span className="section-heading__sub">Закрываем</span>
        </div>

        <div className="sales-grid-4">
          {dnkSalesProblemCards.map((item) => (
            <article key={item.title} className="panel sales-problem-card">
              <span className="eyebrow">Задача</span>
              <h2>{item.title}</h2>
              <p className="panel-copy">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="catalog" className="dnk-section">
        <div className="section-heading">
          <span className="section-heading__main">Каталог</span>
          <span className="section-heading__divider">/</span>
          <span className="section-heading__sub">Направления</span>
        </div>

        <article className="panel sales-catalog-live">
          <div className="sales-catalog-live__copy">
            <span className="eyebrow">Рабочий продукт внутри платформы</span>
            <h2>{featuredCourse?.title ?? 'Платформа ДНК: стартовый курс'}</h2>
            <p className="panel-copy">
              Стартовый practical-course остается живым доказательством всей
              платформы: выбор тарифа, экран покупки, доступ в курс и продолжение обучения
              в личном кабинете уже работают end-to-end.
            </p>
          </div>

          <div className="sales-catalog-live__stats">
            <div>
              <dt>Статус</dt>
              <dd>active</dd>
            </div>
            <div>
              <dt>Уроков</dt>
              <dd>{featuredCourse?.lessonsCount ?? 0}</dd>
            </div>
            <div>
              <dt>Формат</dt>
              <dd>живой LMS</dd>
            </div>
          </div>

          <div className="row-actions" style={{ marginTop: '1rem' }}>
            {renderCourseAccessAction('primary-button', {
              create: 'Купить курс',
              owned: 'Продолжить обучение',
            })}
          </div>
        </article>

        <div className="sales-shelf-grid">
          {courseShelves.map((shelf) => (
            <article key={shelf.id} className="panel sales-shelf">
              <div className="sales-shelf__head">
                <span className="eyebrow">{shelf.title}</span>
                <h2>{shelf.title}</h2>
                <p className="panel-copy">{shelf.description}</p>
              </div>

              {shelf.supportPrograms.length > 0 ? (
                <div className="sales-support-list">
                  {shelf.supportPrograms.map((program) => (
                    <span key={program}>В каталоге: {program}</span>
                  ))}
                </div>
              ) : null}

              <div className="sales-shelf__grid">
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
                    <p>{course.description}</p>
                    <div className="showcase-course-card__footer">
                      <span className="showcase-course-card__price">
                        {formatMoney(course.price)}
                      </span>
                      <Link
                        className="secondary-button"
                        href="/#catalog"
                      >
                        В каталог LMS
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="dnk-section">
        <div className="section-heading">
          <span className="section-heading__main">Как это работает</span>
          <span className="section-heading__divider">/</span>
          <span className="section-heading__sub">4 шага</span>
        </div>

        <div className="sales-grid-4">
          {dnkSalesHowItWorks.map((step) => (
            <article key={step.step} className="panel sales-step-card">
              <span className="sales-step-card__number">{step.step}</span>
              <h2>{step.title}</h2>
              <p className="panel-copy">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="proof" className="dnk-section">
        <div className="section-heading">
          <span className="section-heading__main">Доказательство</span>
          <span className="section-heading__divider">/</span>
          <span className="section-heading__sub">Живой курс</span>
        </div>

        <div className="course-stage__head">
          <div>
            <p className="course-stage__eyebrow">Proof section</p>
            <p className="course-stage__copy sales-proof-copy">
              Это уже не просто витрина. После оплаты пользователь попадает в
              реальный курс с уроками, домашкой и progress-состоянием, а потом
              возвращается в кабинет и продолжает с того же места.
            </p>
          </div>

          <div className="row-actions">
            {renderCourseAccessAction('primary-button', {
              create: 'Купить курс',
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

        <div className="lms-wrapper">
          <article className="lms-main glass-panel">
            <div className="lms-scroll-area">
              <span className="lms-tag">Живой LMS</span>
              <h2 className="lms-title">
                {featuredCourse?.title ?? 'Платформа ДНК: стартовый курс'}
              </h2>
              <p className="lms-desc">
                {featuredCourse?.description ??
                  'Курс уже подключен к доступу по оплате, lesson-view и прогрессу пользователя.'}
              </p>

              <div className="feature-metrics">
                <div>
                  <dt>Уроков</dt>
                  <dd>{featuredCourse?.lessonsCount ?? 0}</dd>
                </div>
                <div>
                  <dt>Выдача доступа</dt>
                  <dd>сразу после оплаты</dd>
                </div>
                <div>
                  <dt>Домашка</dt>
                  <dd>внутри уроков</dd>
                </div>
              </div>

              <div className="lesson-rich-content">
                <h3 className="lesson-rich-content__heading">
                  Что именно доказывает этот блок
                </h3>
                <p className="lesson-rich-content__paragraph">
                  Платформа уже умеет не только продавать, но и доводить
                  пользователя до реального учебного опыта. Это важно для
                  главной страницы: офер подтверждается живым курсом, а не
                  отдельным макетом без входа и доступа.
                </p>
                <ul className="lesson-rich-content__list">
                  <li>Доступ к курсу открывается по рабочему flow.</li>
                  <li>Пользователь продолжает уроки из личного кабинета.</li>
                  <li>Домашка и прогресс сохраняются внутри платформы.</li>
                </ul>
              </div>

              <div className="video-placeholder">
                <span className="video-placeholder__icon" aria-hidden="true">
                  <PlayIcon />
                </span>
                <div>
                  <strong>Внутри курса уже есть lesson body, видео и домашка</strong>
                  <p className="panel-copy" style={{ margin: '0.45rem 0 0' }}>
                    То есть продающая воронка связана с реальным продуктом, а не
                    с отдельной демонстрационной страницей.
                  </p>
                </div>
              </div>
            </div>
          </article>

          <aside className="lms-sidebar glass-panel">
            <div className="progress-box">
              <div className="progress-info">
                <span>Готовность платформы</span>
                <span>100%</span>
              </div>
              <div className="progress-line">
                <div className="progress-fill" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="lessons-list">
              {(featuredCourse?.lessons ?? []).slice(0, 6).map((lesson, index) => (
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
                        : 'Доступен после открытия курса'}
                    </span>
                  </div>
                  <span className="check-icon">
                    <CheckIcon />
                  </span>
                </div>
              ))}
            </div>

            <p className="sales-proof-note">
              Практический курс подтверждает, что DNK Biz уже умеет доводить
              пользователя от оплаты до уроков и обратно в личный кабинет.
            </p>
          </aside>
        </div>
      </section>

      <section id="faq" className="dnk-section">
        <div className="section-heading">
          <span className="section-heading__main">FAQ</span>
          <span className="section-heading__divider">/</span>
          <span className="section-heading__sub">Коротко</span>
        </div>

        <div className="faq-grid">
          {dnkSalesFaq.map((item) => (
            <details key={item.question} className="panel faq-item">
              <summary>
                <span className="faq-item__question">{item.question}</span>
                <span className="faq-item__toggle">
                  <ArrowRightIcon />
                </span>
              </summary>
              <p className="faq-item__answer">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="final-cta" className="dnk-section">
        <article className="panel sales-final-cta">
          <span className="eyebrow">Финальный CTA</span>
          <h2>
            Выберите направление и начните обучение в том же кабинете, где оно
            действительно продолжается.
          </h2>
          <p className="panel-copy">
            DNK Biz продает не просто список курсов, а понятный путь: программа,
            доступ, обучение и возврат к следующему шагу без ручной путаницы.
          </p>

          <div className="row-actions">
            {renderCourseAccessAction('primary-button', {
              create: 'Начать обучение',
              owned: 'Продолжить обучение',
            })}
            <a href="#catalog" className="secondary-button">
              Перейти в каталог
            </a>
          </div>

          <div className="sales-final-cta__chips">
            <span>Офис и учет</span>
            <span>Управление и развитие</span>
            <span>Безопасность и обязательное обучение</span>
          </div>
        </article>
      </section>
    </main>
  );
}
