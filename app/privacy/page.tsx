import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности | Бизнес школа ДНК',
  description: 'Короткая политика конфиденциальности для MVP DNK Biz.',
};

const privacySections = [
  {
    title: 'Какие данные мы храним',
    items: [
      'Email, имя и технические данные аккаунта.',
      'Хэш пароля, а не пароль в открытом виде.',
      'Историю заказов, доступов к курсам и прогресс по урокам.',
    ],
  },
  {
    title: 'Зачем это нужно',
    items: [
      'Чтобы авторизовать пользователя и открывать его личный кабинет.',
      'Чтобы выдавать доступ к купленным и бесплатным курсам.',
      'Чтобы сохранять прогресс, домашние задания и статус оплаты.',
    ],
  },
  {
    title: 'Что важно для MVP',
    items: [
      'Боевая платежная интеграция пока не подключена.',
      'Тестовый платежный режим используется только для локальной и dev-проверки.',
      'Внутренний admin-экран предназначен только для владельца платформы.',
    ],
  },
];

export default function PrivacyPage() {
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
          <Link href="/help" className="ghost-button">
            Помощь
          </Link>
          <Link href="/terms" className="ghost-button">
            Условия
          </Link>
        </div>
      </div>

      <section className="stack-grid utility-page">
        <article className="panel utility-page__hero">
          <span className="eyebrow">Privacy</span>
          <h1>Политика конфиденциальности MVP</h1>
          <p className="panel-copy">
            Эта версия политики описывает только текущий MVP DNK Biz и его базовую
            self-serve LMS-модель.
          </p>
        </article>

        <div className="grid-two utility-grid">
          {privacySections.map((section) => (
            <article key={section.title} className="panel utility-card">
              <span className="eyebrow">Раздел</span>
              <h2>{section.title}</h2>
              <ul className="utility-list utility-list--bullets">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
