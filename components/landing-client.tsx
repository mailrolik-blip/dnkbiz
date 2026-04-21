'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type MouseEvent, useState } from 'react';

import {
  dnkFeaturedPrograms,
  dnkProgramCatalog,
  dnkSectionLinks,
  dnkTeamMembers,
  dnkTeamStats,
  dnkTestimonials,
} from '@/lib/dnk-content';

type LandingUser = {
  email: string;
  name: string | null;
} | null;

type FeaturedCourse = {
  title: string;
  slug: string;
  description: string | null;
  lessonsCount: number;
  lessons: Array<{
    id: number;
    title: string;
    position: number;
  }>;
} | null;

type LandingTariff = {
  id: number;
  title: string;
  price: number;
  interval: string | null;
  courseTitle: string;
  courseSlug: string;
  courseDescription: string | null;
  lessonsCount: number;
  isOwned: boolean;
  pendingOrder: {
    id: number;
    checkoutUrl: string;
  } | null;
};

type LandingClientProps = {
  user: LandingUser;
  featuredCourse: FeaturedCourse;
  tariffs: LandingTariff[];
};

function formatMoney(value: number) {
  return `${value.toLocaleString('ru-RU')} ₽`;
}

function formatInterval(value: string | null) {
  if (!value || value === 'one-time') {
    return 'разовый доступ';
  }

  return value;
}

function CpuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3 2 8l10 5 10-5-10-5Z" />
      <path d="m2 12 10 5 10-5" />
      <path d="m2 16 10 5 10-5" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="4" />
      <path d="M20 8v6" />
      <path d="M23 11h-6" />
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

  function handleHeroCardMove(event: MouseEvent<HTMLElement>) {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();

    target.style.setProperty('--x', `${event.clientX - rect.left}px`);
    target.style.setProperty('--y', `${event.clientY - rect.top}px`);
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
        message: `Заказ #${payload?.order?.id ?? ''} создан. После подтверждения оплаты курс появится в личном кабинете.`,
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
    if (!primaryTariff) {
      return (
        <Link href="/register" className="primary-button">
          Зарегистрироваться
        </Link>
      );
    }

    if (!user) {
      return (
        <Link href="/register" className="primary-button">
          Зарегистрироваться
        </Link>
      );
    }

    if (primaryTariff.isOwned) {
      return (
        <Link href={`/courses/${primaryTariff.courseSlug}`} className="primary-button">
          Открыть курс
        </Link>
      );
    }

    if (primaryTariff.pendingOrder) {
      return (
        <Link href={primaryTariff.pendingOrder.checkoutUrl} className="primary-button">
          Продолжить оплату
        </Link>
      );
    }

    return (
      <button
        className="primary-button"
        disabled={buyingTariffId === primaryTariff.id}
        onClick={() => handleCreateOrder(primaryTariff.id)}
        type="button"
      >
        {buyingTariffId === primaryTariff.id ? 'Создаём заказ...' : 'Купить доступ'}
      </button>
    );
  }

  return (
    <main className="page-shell">
      <nav className="floating-nav" aria-label="Навигация по странице">
        {dnkSectionLinks.map((section) => (
          <a key={section.id} href={`#${section.id}`} className="floating-nav__item">
            <span className="floating-nav__dot" />
            <span>{section.label}</span>
          </a>
        ))}
        <Link href={user ? '/lk' : '/login'} className="floating-nav__item floating-nav__item--cta">
          <span className="floating-nav__dot" />
          <span>{user ? 'Кабинет' : 'Вход'}</span>
        </Link>
      </nav>

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

      <section id="hero" className="hero-container">
        <div className="hero-scroll-track">
          <div className="hero-sticky-viewport">
            <div className="hero-grid">
              <article className="bento-card card-main" onMouseMove={handleHeroCardMove}>
                <span className="eyebrow">Бизнес-эволюция</span>
                <h1>Бизнес-Эволюция</h1>
                <p className="hero-lead">
                  Системный подход к росту бизнеса, обучению команды и запуску рабочего
                  цифрового контура.
                </p>
                <p className="hero-text">
                  Главная страница теперь держит композицию Tilda-блока и одновременно
                  работает на живом MVP: регистрация, checkout, кабинет и закрытый курс
                  уже соединены в один пользовательский flow.
                </p>

                <div className="hero-actions">
                  {renderHeroPrimaryAction()}
                  <Link href={user ? '/lk' : '/login'} className="secondary-button">
                    {user ? 'Открыть кабинет' : 'Войти'}
                  </Link>
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
              </article>

              <a
                href="#automation"
                className="bento-card horizontal-card card-auto"
                onMouseMove={handleHeroCardMove}
              >
                <span className="bento-icon">
                  <CpuIcon />
                </span>
                <div className="text-wrap card-text-mobile">
                  <div className="bento-title">Автоматизация</div>
                  <div className="bento-desc">
                    CRM, аналитика и AI-связки под реальные процессы бизнеса.
                  </div>
                </div>
                <span className="arrow-icon" aria-hidden="true">
                  <ArrowRightIcon />
                </span>
              </a>

              <a
                href="#education"
                className="bento-card card-check"
                onMouseMove={handleHeroCardMove}
              >
                <span className="bento-icon">
                  <LayersIcon />
                </span>
                <div className="card-text-mobile">
                  <div className="bento-title">База знаний</div>
                  <div className="bento-desc">
                    Закрытый курс, progress API и вход в обучение сразу после checkout.
                  </div>
                </div>
              </a>

              <a
                href="#about"
                className="bento-card card-mentor"
                onMouseMove={handleHeroCardMove}
              >
                <span className="bento-icon">
                  <UsersIcon />
                </span>
                <div className="card-text-mobile">
                  <div className="bento-title">Менторство</div>
                  <div className="bento-desc">
                    Методология DNK, сопровождение и единый путь пользователя в курс.
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="education" className="dnk-section">
        <div className="section-heading">
          <span className="section-heading__main">Обучение</span>
          <span className="section-heading__divider">/</span>
          <span className="section-heading__sub">Платформа</span>
        </div>

        <div className="feature-split">
          <article className="panel panel--feature">
            <span className="eyebrow">Готовый фронтенд курса</span>
            <h2>{featuredCourse?.title ?? 'Закрытый курс DNK'}</h2>
            <p className="panel-copy">
              {featuredCourse?.description ??
                'Курс подключён к реальным урокам, доступу по Enrollment и сохранению прогресса.'}
            </p>

            <div className="feature-metrics">
              <div>
                <dt>Уроков</dt>
                <dd>{featuredCourse?.lessonsCount ?? 0}</dd>
              </div>
              <div>
                <dt>Доступ</dt>
                <dd>по оплате</dd>
              </div>
              <div>
                <dt>Прогресс</dt>
                <dd>по пользователю</dd>
              </div>
            </div>

            <div className="feature-list">
              {(featuredCourse?.lessons ?? []).slice(0, 5).map((lesson) => (
                <div key={lesson.id} className="feature-list__item">
                  <span>{lesson.position}.</span>
                  <span>{lesson.title}</span>
                </div>
              ))}
            </div>

            <div className="row-actions">
              {primaryTariff?.isOwned ? (
                <Link href={`/courses/${primaryTariff.courseSlug}`} className="primary-button">
                  Перейти к курсу
                </Link>
              ) : (
                <a href="#pricing" className="primary-button">
                  Выбрать тариф
                </a>
              )}
            </div>
          </article>

          <article className="panel panel--aside">
            <span className="eyebrow">Что уже работает</span>
            <div className="status-stack">
              <div className="status-card">
                <strong>Авторизация</strong>
                <p>Вход по email и паролю, сессия и защищённые маршруты.</p>
              </div>
              <div className="status-card">
                <strong>Checkout flow</strong>
                <p>После выбора тарифа пользователь сразу попадает в test checkout и оттуда в курс.</p>
              </div>
              <div className="status-card">
                <strong>Прогресс уроков</strong>
                <p>Каждый ответ и завершение урока сохраняются в прогрессе пользователя.</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="checklists" className="dnk-section">
        <div className="section-heading">
          <span className="section-heading__main">Чек-лист</span>
          <span className="section-heading__divider">/</span>
          <span className="section-heading__sub">Стартовый аудит</span>
        </div>

        <div className="audit-grid">
          <article className="panel panel--feature">
            <span className="eyebrow">Реальный DNK-блок</span>
            <h2>Точка входа в цифровой контур бизнеса.</h2>
            <p className="panel-copy">
              Блок перенесён с DNK-лендинга как статический onboarding-экран. Он не
              подключён к отдельному backend-модулю, но встроен в композицию без слома
              текущего MVP.
            </p>
            <div className="audit-metrics">
              <div>
                <span>Финансы</span>
                <strong>LIVE</strong>
              </div>
              <div>
                <span>Команда</span>
                <strong>структура</strong>
              </div>
              <div>
                <span>Процессы</span>
                <strong>диагностика</strong>
              </div>
              <div>
                <span>Базовый контур</span>
                <strong>0 → 100%</strong>
              </div>
            </div>
            <div className="row-actions">
              <Link href={user ? '/lk' : '/register'} className="secondary-button">
                {user ? 'Открыть кабинет' : 'Создать кабинет'}
              </Link>
            </div>
          </article>

          <article className="panel panel--aside">
            <span className="eyebrow">Ключевые шаги</span>
            <div className="timeline-list">
              <div className="timeline-item">
                <strong>1. Диагностика</strong>
                <p>Собираем базовые показатели и определяем точку роста.</p>
              </div>
              <div className="timeline-item">
                <strong>2. Приоритеты</strong>
                <p>Фиксируем, какие процессы переводим в систему в первую очередь.</p>
              </div>
              <div className="timeline-item">
                <strong>3. Доступ к материалам</strong>
                <p>После оплаты пользователь получает курс и рабочий контур в кабинете.</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="automation" className="dnk-section">
        <div className="section-heading">
          <span className="section-heading__main">Автоматизация</span>
          <span className="section-heading__divider">/</span>
          <span className="section-heading__sub">Конструктор системы</span>
        </div>

        <div className="automation-shell">
          <article className="panel panel--feature">
            <span className="eyebrow">Конструктор DNK</span>
            <h2>Собираем рабочую систему из готовых модулей.</h2>
            <p className="panel-copy">
              Этот блок сохранён как продуктовый showcase. Он пока статический, но повторяет
              реальную DNK-композицию и ведёт в рабочие точки входа на курс и в кабинет.
            </p>
            <div className="chip-cloud">
              {[
                'CRM',
                'Чат-бот',
                'Аналитика',
                'Автопродажи',
                'Документы',
                'Телефония',
                'HR-бот',
                'Финансы',
              ].map((item) => (
                <span key={item} className="chip">
                  {item}
                </span>
              ))}
            </div>
            <div className="row-actions">
              <a href="#pricing" className="primary-button">
                Выбрать доступ
              </a>
            </div>
          </article>

          <article className="panel panel--aside">
            <span className="eyebrow">Результат</span>
            <div className="status-stack">
              <div className="status-card">
                <strong>Единая точка данных</strong>
                <p>Продажи, команда, процессы и обучение не распадаются на отдельные сервисы.</p>
              </div>
              <div className="status-card">
                <strong>Шаблоны и сценарии</strong>
                <p>Используем подходы DNK как основу для внедрения и запуска обучения.</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="programs" className="dnk-section">
        <div className="section-heading">
          <span className="section-heading__main">Программы</span>
          <span className="section-heading__divider">/</span>
          <span className="section-heading__sub">Перечень DNK</span>
        </div>

        <div className="program-grid">
          {dnkProgramCatalog.map((group) => (
            <article key={group.category} className="panel">
              <span className="eyebrow">{group.category}</span>
              <h2>{group.category}</h2>
              <p className="panel-copy">{group.description}</p>
              <div className="program-list">
                {group.items.map((program) => (
                  <div key={program.title} className="program-list__item">
                    <div>
                      <strong>{program.title}</strong>
                    </div>
                    <span>{formatMoney(program.price)}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="dnk-section">
        <div className="section-heading">
          <span className="section-heading__main">Доступ</span>
          <span className="section-heading__divider">/</span>
          <span className="section-heading__sub">Тарифы</span>
        </div>

        <div className="pricing-grid">
          <article className="tariff-card tariff-card--static">
            <span className="tariff-card__pill">Статический блок DNK</span>
            <h2>База</h2>
            <div className="tariff-card__price">от 2 990 ₽</div>
            <p className="muted-text">Самостоятельное изучение материалов и база знаний.</p>
            <ul className="tariff-features">
              <li>Доступ к базе знаний</li>
              <li>Базовый AI-помощник</li>
              <li>Шаблоны и инструкции</li>
            </ul>
            <Link href={user ? '/lk' : '/register'} className="secondary-button">
              {user ? 'В кабинет' : 'Регистрация'}
            </Link>
          </article>

          {tariffs.map((tariff) => (
            <article key={tariff.id} className="tariff-card tariff-card--primary">
              <span className="tariff-card__pill">Реальный backend-тариф</span>
              <h2>{tariff.title}</h2>
              <div className="tariff-card__price">{formatMoney(tariff.price)}</div>
              <p className="muted-text">
                {tariff.courseTitle}. {tariff.lessonsCount} уроков, доступ к защищённой странице
                курса и сохранение прогресса.
              </p>
              <ul className="tariff-features">
                <li>Авторизация и личный кабинет</li>
                <li>Test checkout и переход прямо в курс</li>
                <li>Прогресс уроков по пользователю</li>
                <li>{formatInterval(tariff.interval)}</li>
              </ul>

              <div className="badge-row">
                {tariff.isOwned ? (
                  <span className="badge badge-paid">доступ уже открыт</span>
                ) : null}
                {tariff.pendingOrder ? (
                  <span className="badge badge-pending">
                    заказ #{tariff.pendingOrder.id} ожидает оплаты
                  </span>
                ) : null}
              </div>

              {tariff.isOwned ? (
                <Link href={`/courses/${tariff.courseSlug}`} className="primary-button">
                  Открыть курс
                </Link>
              ) : tariff.pendingOrder ? (
                <Link href={tariff.pendingOrder.checkoutUrl} className="secondary-button">
                  Продолжить оплату
                </Link>
              ) : user ? (
                <button
                  className="primary-button"
                  disabled={buyingTariffId === tariff.id}
                  onClick={() => handleCreateOrder(tariff.id)}
                  type="button"
                >
                  {buyingTariffId === tariff.id ? 'Создаём заказ...' : 'Купить доступ'}
                </button>
              ) : (
                <Link href="/register" className="primary-button">
                  Зарегистрироваться
                </Link>
              )}
            </article>
          ))}

          <article className="tariff-card tariff-card--static">
            <span className="tariff-card__pill">Статический блок DNK</span>
            <h2>Наставничество</h2>
            <div className="tariff-card__price">по запросу</div>
            <p className="muted-text">
              Личный трекер, ручной аудит бизнеса и сопровождение внедрения.
            </p>
            <ul className="tariff-features">
              <li>Разбор с экспертом</li>
              <li>Помощь во внедрении</li>
              <li>Поддержка 24/7</li>
            </ul>
            <Link href={user ? '/lk' : '/register'} className="secondary-button">
              {user ? 'Открыть кабинет' : 'Подать заявку'}
            </Link>
          </article>
        </div>
      </section>

      <section id="about" className="dnk-section">
        <div className="section-heading">
          <span className="section-heading__main">О нас</span>
          <span className="section-heading__divider">/</span>
          <span className="section-heading__sub">Команда</span>
        </div>

        <div className="team-grid">
          <article className="panel panel--feature">
            <span className="eyebrow">Философия</span>
            <h2>Объединяем бизнес-экспертизу и цифровые технологии.</h2>
            <p className="panel-copy">
              Каждый участник команды — часть единой системы. Мы не просто показываем
              материалы, а проводим пользователя через рабочий контур: от входа и покупки до
              прохождения курса и закрепления результата.
            </p>
            <div className="stats-strip">
              {dnkTeamStats.map((stat) => (
                <span key={stat}>{stat}</span>
              ))}
            </div>
          </article>

          <div className="team-card-grid">
            {dnkTeamMembers.map((member) => (
              <article key={member.name} className="team-card">
                <span className="eyebrow">{member.role}</span>
                <h3>{member.name}</h3>
                <p>{member.direction}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contacts" className="dnk-section">
        <div className="section-heading">
          <span className="section-heading__main">Опыт внедрения</span>
          <span className="section-heading__divider">/</span>
          <span className="section-heading__sub">Отзывы</span>
        </div>

        <div className="testimonial-grid">
          {dnkTestimonials.map((item) => (
            <article key={item.initials + item.name} className="testimonial-card">
              <div className="testimonial-card__head">
                <span className="testimonial-card__avatar">{item.initials}</span>
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.company}</p>
                </div>
              </div>
              <p>{item.text}</p>
            </article>
          ))}
        </div>

        <footer className="site-footer">
          <div>
            <div className="brand">
              <span className="brand-mark" />
              <span>БИЗНЕС ШКОЛА ДНК</span>
            </div>
            <p className="site-footer__lead">
              Платформа для систематизации и автоматизации бизнеса. Подключён рабочий MVP:
              вход, регистрация, покупка тарифа, личный кабинет и закрытый курс.
            </p>
          </div>

          <div className="site-footer__cols">
            <div>
              <strong>Адрес</strong>
              <p>Красноярский край, г. Норильск</p>
              <p>ул. Московская, 19, оф. 401</p>
            </div>
            <div>
              <strong>Навигация</strong>
              <p>
                <a href="#education">Обучение</a>
              </p>
              <p>
                <a href="#programs">Программы</a>
              </p>
              <p>
                <a href="#pricing">Тарифы</a>
              </p>
            </div>
            <div>
              <strong>Личный кабинет</strong>
              <p>
                <Link href="/login">Войти</Link>
              </p>
              <p>
                <Link href="/register">Регистрация</Link>
              </p>
              <p>
                <Link href="/lk">Мои курсы</Link>
              </p>
            </div>
          </div>
        </footer>

        <div className="footer-note">
          <span>© 2026 Бизнес Школа ДНК. Все права защищены.</span>
          <div className="footer-note__links">
            <span>Договор оферты</span>
            <span>Политика конфиденциальности</span>
            <span>Реквизиты</span>
          </div>
        </div>
      </section>

      <section className="dnk-section dnk-section--compact">
        <div className="feature-strip">
          {dnkFeaturedPrograms.map((program) => (
            <article key={program.title} className="program-highlight-card">
              <span className="eyebrow">DNK программа</span>
              <h3>{program.title}</h3>
              <p>{formatMoney(program.price)}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
