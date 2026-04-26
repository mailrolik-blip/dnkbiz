import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Помощь | Бизнес школа ДНК',
  description: 'Короткая памятка по маршруту пользователя внутри LMS DNK Biz.',
};

const helpSections = [
  {
    title: 'Как начать бесплатный курс',
    body: 'Откройте каталог, выберите курс со статусом «Бесплатный» и нажмите «Начать бесплатно». После входа курс сразу откроется внутри LMS.',
  },
  {
    title: 'Как посмотреть ознакомительные уроки',
    body: 'У платных курсов доступны первые preview-уроки. Откройте страницу курса или сам курс, чтобы пройти ознакомительный блок до покупки.',
  },
  {
    title: 'Как купить курс',
    body: 'На product page или внутри курса нажмите «Купить курс». Система переведет вас в checkout, где можно продолжить оплату и открыть полный доступ.',
  },
  {
    title: 'Где продолжить обучение',
    body: 'Все активные и уже доступные курсы собираются в кабинете `/lk`. Там же отображаются незавершенные оплаты и следующий шаг по каждому сценарию.',
  },
];

export default function HelpPage() {
  return (
    <main className="page-shell">
      <div className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>Бизнес школа ДНК</span>
        </Link>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link href="/catalog" className="ghost-button">
            Каталог
          </Link>
          <Link href="/login" className="ghost-button">
            Войти
          </Link>
          <Link href="/register" className="secondary-button">
            Регистрация
          </Link>
        </div>
      </div>

      <section className="stack-grid utility-page">
        <article className="panel utility-page__hero">
          <span className="eyebrow">Помощь</span>
          <h1>Как устроен путь ученика в DNK Biz</h1>
          <p className="panel-copy">
            Это короткая памятка по основному self-serve маршруту: регистрация, каталог,
            preview, покупка и обучение внутри LMS.
          </p>
        </article>

        <div className="grid-two utility-grid">
          {helpSections.map((section) => (
            <article key={section.title} className="panel utility-card">
              <span className="eyebrow">Сценарий</span>
              <h2>{section.title}</h2>
              <p className="panel-copy">{section.body}</p>
            </article>
          ))}
        </div>

        <article className="panel utility-card">
          <span className="eyebrow">Быстрые ссылки</span>
          <h2>Начать с правильной точки</h2>
          <div className="row-actions utility-card__actions">
            <Link href="/catalog" className="primary-button">
              Открыть каталог
            </Link>
            <Link href="/register" className="secondary-button">
              Зарегистрироваться
            </Link>
            <Link href="/privacy" className="ghost-button">
              Privacy
            </Link>
            <Link href="/terms" className="ghost-button">
              Terms
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
