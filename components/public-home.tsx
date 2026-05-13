import Image from 'next/image';
import Link from 'next/link';

import { PublicPageShell } from '@/components/public-shell';
import {
  buildAuthHref,
  getCheckoutIntentPath,
  getCourseIntentPath,
} from '@/lib/auth-intent';
import { getCourseCatalogHref } from '@/lib/lms-catalog';
import type { LandingPageData } from '@/lib/landing';
import { getActiveOrderActionLabel } from '@/lib/payments/constants';
import {
  publicCareerOrientations,
  publicContact,
  publicHomeReviewPlaceholder,
  publicLearningFlow,
  publicOutcomeAreas,
  publicTeamLead,
  publicTeamMembers,
  publicTrustReasons,
} from '@/lib/public-site';
import {
  canOpenCourseRoute,
  formatCoursePrice,
  formatLessonCount,
  formatPreviewLessons,
  getCatalogCourseStatusClass,
  getCatalogCourseStatusLabel,
  isStartedPreviewCourse,
} from '@/lib/purchase-ux';

type PublicHomeProps = LandingPageData;
type HomeCourse = LandingPageData['catalogCourses'][number];

function getHomeCourseAction(course: HomeCourse, hasUser: boolean) {
  if (course.status === 'showcase') {
    return {
      href: getCourseCatalogHref(course.slug),
      label: 'Скоро',
    };
  }

  if (course.pendingOrder) {
    return {
      href: course.pendingOrder.checkoutUrl,
      label: getActiveOrderActionLabel(course.pendingOrder.status),
    };
  }

  if (course.isOwned) {
    return {
      href: `/courses/${course.slug}`,
      label: 'Перейти к курсу',
    };
  }

  if (course.status === 'free') {
    return {
      href: hasUser
        ? `/courses/${course.slug}`
        : buildAuthHref('register', getCourseIntentPath(course.slug)),
      label: 'Начать бесплатно',
    };
  }

  if (isStartedPreviewCourse(course)) {
    return {
      href: `/courses/${course.slug}`,
      label: 'Продолжить обучение',
    };
  }

  if (course.previewEnabled && course.previewLessonsCount > 0) {
    return {
      href: hasUser
        ? canOpenCourseRoute(course)
          ? `/courses/${course.slug}`
          : getCheckoutIntentPath(course.tariffId!)
        : buildAuthHref('register', getCourseIntentPath(course.slug)),
      label: 'Открыть первые уроки',
    };
  }

  if (!hasUser) {
    return {
      href: buildAuthHref('register', getCheckoutIntentPath(course.tariffId!)),
      label: 'Купить курс',
    };
  }

  return {
    href: course.tariffId
      ? getCheckoutIntentPath(course.tariffId)
      : getCourseCatalogHref(course.slug),
    label: 'Купить курс',
  };
}

function getHomeCourseSupport(course: HomeCourse, hasUser: boolean) {
  if (course.status === 'showcase') {
    return 'Курс готовится к публикации. Пока можно посмотреть описание и структуру программы.';
  }

  if (course.pendingOrder) {
    return 'Заказ уже создан. Можно вернуться к оплате и проверить, когда откроется доступ.';
  }

  if (course.isOwned) {
    return 'Курс уже доступен в личном кабинете и открыт для продолжения обучения.';
  }

  if (course.status === 'free') {
    return hasUser
      ? 'Доступ открывается сразу: переходите в курс и начинайте обучение.'
      : 'После бесплатной регистрации курс откроется сразу, без покупки.';
  }

  if (course.previewEnabled && course.previewLessonsCount > 0) {
    return `${formatPreviewLessons(course.previewLessonsCount)} доступны до покупки полного доступа.`;
  }

  return 'Полный доступ к урокам открывается после оплаты курса.';
}

function formatCourseCount(count: number) {
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

export default function PublicHome({ user, catalogCourses }: PublicHomeProps) {
  const hasUser = Boolean(user);
  const homepageCourses = catalogCourses.filter((course) => course.slug !== 'practical-course');
  const freeCourses = homepageCourses.filter((course) => course.status === 'free').slice(0, 2);
  const paidCourses = homepageCourses.filter((course) => course.status === 'paid').slice(0, 4);
  const showcaseCourses = homepageCourses
    .filter((course) => course.status === 'showcase')
    .slice(0, 2);

  const catalogShelves = [
    {
      id: 'free',
      title: 'Бесплатные курсы',
      description: 'Для первого входа в платформу и знакомства с форматом обучения.',
      courses: freeCourses,
    },
    {
      id: 'paid',
      title: 'Платные программы',
      description: 'Полный доступ после оплаты, а у части программ сначала открываются первые уроки.',
      courses: paidCourses,
    },
    {
      id: 'showcase',
      title: 'Скоро будут доступны',
      description: 'Программы, которые уже оформлены на витрине и готовятся к следующему запуску.',
      courses: showcaseCourses,
    },
  ].filter((shelf) => shelf.courses.length > 0);

  return (
    <PublicPageShell user={user}>
      <section className="dnk-section home-hero">
        <article className="home-hero__panel">
          <span className="eyebrow">Бесплатный вход в ДНК</span>

          <div className="home-hero__copy">
            <h1 className="home-hero__title">
              Курсы 1С, Excel, маркетинга и охраны труда для работы и повышения квалификации.
            </h1>
            <p className="panel-copy home-hero__lead">
              Бесплатная регистрация открывает стартовые курсы и ознакомительные уроки платных
              программ. Учитесь в личном кабинете в удобное время и возвращайтесь к обучению без
              потери прогресса.
            </p>
          </div>

          <div className="row-actions">
            <Link href={hasUser ? '/lk' : '/register'} className="primary-button">
              {hasUser ? 'Открыть личный кабинет' : 'Зарегистрироваться бесплатно'}
            </Link>
            <Link href="/catalog" className="secondary-button">
              Смотреть каталог курсов
            </Link>
          </div>

          <ul className="home-hero__proof">
            <li>
              <strong>Бесплатный старт.</strong> Первые курсы открываются сразу после регистрации.
            </li>
            <li>
              <strong>Первые уроки до покупки.</strong> У части программ можно заранее открыть
              первые уроки.
            </li>
            <li>
              <strong>Обучение в кабинете.</strong> Уроки, доступ и следующий шаг собраны в одном
              месте.
            </li>
            <li>
              <strong>Возврат к прогрессу.</strong> Можно продолжить с того места, где вы
              остановились.
            </li>
          </ul>
        </article>
      </section>

      <section className="dnk-section">
        <div className="public-section-head">
          <span className="eyebrow">Как проходит обучение</span>
          <h2>Путь от выбора курса до обучения в кабинете состоит из нескольких понятных шагов.</h2>
          <p className="panel-copy">
            Пользователь видит курс, регистрируется бесплатно, изучает стартовые уроки и продолжает
            обучение в своем кабинете без перегруженного маршрута.
          </p>
        </div>

        <ol className="home-steps-grid" aria-label="Механика обучения">
          {publicLearningFlow.map((step) => (
            <li key={step.step} className="home-step-card">
              <span className="home-step-card__index">{step.step}</span>
              <h3>{step.title}</h3>
              <p className="panel-copy">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="dnk-section">
        <div className="public-section-head">
          <span className="eyebrow">Результаты и применение</span>
          <h2>Что можно применять в работе после обучения.</h2>
          <p className="panel-copy">
            Курсы дают прикладную базу для повседневных задач и подготовки к новым обязанностям.
            Здесь нет обещаний гарантированного трудоустройства или вымышленных результатов.
          </p>
        </div>

        <div className="home-results-grid">
          {publicOutcomeAreas.map((item) => (
            <article key={item.title} className="home-outcome-card">
              <h3>{item.title}</h3>
              <p className="panel-copy">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dnk-section">
        <div className="public-section-head">
          <span className="eyebrow">Карьерные ориентиры</span>
          <h2>К каким ролям готовят программы.</h2>
          <p className="panel-copy">
            Это ориентиры по рабочим направлениям, а не обещание работы или гарантированной
            зарплаты. Они помогают понять, к каким задачам и ролям можно подготовиться через
            обучение.
          </p>
        </div>

        <div className="home-role-grid">
          {publicCareerOrientations.map((role) => (
            <article key={role.title} className="home-role-card">
              <h3>{role.title}</h3>
              <p className="panel-copy">{role.body}</p>
              <div className="home-role-card__tags">
                {role.related.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="catalog" className="dnk-section">
        <div className="public-section-head home-catalog-head">
          <div>
            <span className="eyebrow">Каталог курсов</span>
            <h2>Бесплатные, платные и готовящиеся программы без перегруженной витрины.</h2>
            <p className="panel-copy">
              На главной только краткий обзор каталога. Полный список программ, структура и
              детали каждой страницы доступны в полном каталоге.
            </p>
          </div>

          <Link href="/catalog" className="primary-button">
            Открыть весь каталог
          </Link>
        </div>

        <div className="home-catalog-shelves">
          {catalogShelves.length > 0 ? (
            catalogShelves.map((shelf) => (
              <section key={shelf.id} className="home-catalog-shelf">
                <div className="home-catalog-shelf__head">
                  <div>
                    <span className="eyebrow">{shelf.title}</span>
                    <p className="panel-copy">{shelf.description}</p>
                  </div>
                  <span className="home-catalog-shelf__meta">{formatCourseCount(shelf.courses.length)}</span>
                </div>

                <div className="home-catalog-grid">
                  {shelf.courses.map((course) => {
                    const action = getHomeCourseAction(course, hasUser);

                    return (
                      <article
                        key={course.slug}
                        className="panel public-card public-course-card home-course-card"
                      >
                        <Link
                          aria-label={`Открыть страницу курса ${course.title}`}
                          className="public-course-card__cover"
                          href={getCourseCatalogHref(course.slug)}
                        />

                        <div className="public-course-card__head">
                          <span className={getCatalogCourseStatusClass(course)}>
                            {getCatalogCourseStatusLabel(course)}
                          </span>
                          <span className="public-course-card__price">
                            {formatCoursePrice(course.price)}
                          </span>
                        </div>

                        <div className="public-course-card__body">
                          <h3>{course.title}</h3>
                          <p className="panel-copy">{course.description}</p>
                        </div>

                        <div className="public-course-card__meta">
                          {course.lessonsCount ? (
                            <span>{formatLessonCount(course.lessonsCount)}</span>
                          ) : null}
                          {course.previewEnabled && course.previewLessonsCount > 0 ? (
                            <span>{formatPreviewLessons(course.previewLessonsCount)}</span>
                          ) : null}
                        </div>

                        <p className="public-course-card__support">
                          {getHomeCourseSupport(course, hasUser)}
                        </p>

                        <div className="row-actions">
                          <Link
                            href={action.href}
                            className={
                              course.status === 'showcase' ? 'ghost-button' : 'primary-button'
                            }
                          >
                            {action.label}
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          ) : (
            <article className="home-review-card">
              <span className="eyebrow">Каталог</span>
              <h2>Карточки курсов появятся здесь, когда будут доступны опубликованные программы.</h2>
              <p className="panel-copy">
                Главная страница остается доступной для визуальной проверки, а каталог снова
                покажет бесплатные, платные и готовящиеся программы, как только они будут
                доступны для публикации.
              </p>
            </article>
          )}
        </div>
      </section>

      <section className="dnk-section">
        <article className="home-review-card home-review-card--accent">
          <span className="eyebrow">Отзывы</span>
          <h2>{publicHomeReviewPlaceholder.title}</h2>
          <p className="panel-copy">{publicHomeReviewPlaceholder.body}</p>
          <p className="panel-copy home-review-card__support">
            {publicHomeReviewPlaceholder.support}
          </p>
          <div className="row-actions">
            <Link href="/catalog" className="primary-button">
              Открыть каталог
            </Link>
            <Link href="/contacts" className="secondary-button">
              Связаться с нами
            </Link>
          </div>
        </article>
      </section>

      <section className="dnk-section">
        <div className="public-section-head">
          <span className="eyebrow">Команда</span>
          <h2>Команда, которая собирает платформу и учебный контур.</h2>
          <p className="panel-copy">
            На главной используются только подтвержденные данные из локальных материалов проекта:
            реальные имена, роли и фотографии без случайных заглушек.
          </p>
        </div>

        <div className="home-team-layout">
          <div className="home-team-sidebar">
            <article className="home-team-intro">
              <h3>{publicTeamLead.title}</h3>
              <p className="panel-copy">{publicTeamLead.body}</p>
            </article>

            <div className="home-team-proof">
              {publicTrustReasons.map((reason) => (
                <article key={reason.title} className="home-team-proof-item">
                  <h3>{reason.title}</h3>
                  <p className="panel-copy">{reason.body}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="home-team-grid">
            {publicTeamMembers.map((member) => (
              <article key={member.name} className="home-team-card">
                <div className="home-team-card__media">
                  <Image
                    src={member.imageSrc}
                    alt={`${member.name}, ${member.role}`}
                    fill
                    sizes="(max-width: 743px) 100vw, (max-width: 959px) 50vw, 33vw"
                    className="home-team-card__image"
                  />
                </div>

                <div className="home-team-card__body">
                  <span className="eyebrow">{member.role}</span>
                  <h3>{member.name}</h3>
                  <p className="panel-copy">{member.direction}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contacts" className="dnk-section">
        <div className="public-section-head">
          <span className="eyebrow">Контакты</span>
          <h2>Связаться по выбору курса, доступу и оплате.</h2>
          <p className="panel-copy">
            Используйте любой удобный канал связи. Если вопрос связан с оплатой, подготовьте
            название курса и номер заказа, чтобы быстрее сверить статус и доступ.
          </p>
        </div>

        <div className="home-contact-grid">
          <article className="home-contact-card">
            <span className="eyebrow">Телефон и мессенджеры</span>
            <h3>Быстрый канал для вопросов по выбору курса и доступу.</h3>
            <p className="panel-copy">
              Для короткого вопроса удобнее позвонить. Если нужно уточнить оплату или доступ,
              быстрее написать в Telegram.
            </p>

            <div className="public-contact-list home-contact-list">
              <a href={publicContact.phoneHref}>{publicContact.phoneLabel}</a>
              <a href={publicContact.telegramHref} rel="noreferrer" target="_blank">
                Telegram {publicContact.telegramLabel}
              </a>
              <a href={publicContact.instagramHref} rel="noreferrer" target="_blank">
                Instagram {publicContact.instagramLabel}
              </a>
            </div>

            <div className="row-actions">
              <Link href="/contacts" className="secondary-button">
                Все контакты
              </Link>
            </div>
          </article>

          <article className="home-contact-card home-contact-card--accent">
            <span className="eyebrow">Адрес</span>
            <h3>{publicContact.locationLabel}</h3>
            <p className="panel-copy">
              Если вы только присматриваетесь к программам, начните с каталога. Если вопрос уже по
              конкретному курсу или заказу, переходите к контактам и укажите нужное направление.
            </p>

            <ul className="utility-list utility-list--bullets">
              {publicContact.address.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>

            <div className="row-actions">
              <Link href="/catalog" className="primary-button">
                Открыть каталог
              </Link>
              <Link href="/contacts" className="secondary-button">
                Страница контактов
              </Link>
            </div>
          </article>
        </div>
      </section>
    </PublicPageShell>
  );
}
