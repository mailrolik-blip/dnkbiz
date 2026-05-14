import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getOptionalCurrentUser } from '@/lib/auth';
import { buildAuthHref } from '@/lib/auth-intent';
import { adminHelpSections, adminSafetyHints } from '@/lib/admin-help';

export const metadata: Metadata = {
  title: 'Инструкция администратора | Бизнес школа ДНК',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminHelpPage() {
  const user = await getOptionalCurrentUser();

  if (!user) {
    redirect(buildAuthHref('login', '/admin/help'));
  }

  if (user.role !== 'ADMIN') {
    redirect('/lk');
  }

  return (
    <main className="page-shell">
      <header className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>Бизнес школа ДНК</span>
        </Link>

        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link href="/admin" className="secondary-button">
            Назад в /admin
          </Link>
          <Link href="/lk" className="ghost-button">
            Личный кабинет
          </Link>
        </div>
      </header>

      <section className="stack-grid utility-page">
        <article className="panel utility-page__hero">
          <span className="eyebrow">Инструкция администратора</span>
          <h1>Как работать с ручной оплатой, курсами, уроками и тарифами.</h1>
          <p className="panel-copy">
            Это рабочая памятка для первого закрытого запуска. Основное правило одно:
            сначала проверка факта оплаты, потом подтверждение доступа.
          </p>
        </article>

        <article className="panel utility-card">
          <span className="eyebrow">Коротко</span>
          <h2>Главные правила безопасности</h2>
          <ul className="utility-list utility-list--bullets">
            {adminSafetyHints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </article>

        <div className="grid-two utility-grid">
          {adminHelpSections.map((section) => (
            <article key={section.title} className="panel utility-card">
              <span className="eyebrow">{section.eyebrow}</span>
              <h2>{section.title}</h2>
              <p className="panel-copy">{section.intro}</p>
              <ul className="utility-list utility-list--bullets">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <article className="panel utility-card">
          <span className="eyebrow">Проверка</span>
          <h2>Что сверять после ручного подтверждения</h2>
          <div className="utility-list">
            <div className="status-card">
              <strong>Очередь оплаты</strong>
              <p>Заказ исчез из блока PROCESSING и больше не висит как ожидающий проверки.</p>
            </div>
            <div className="status-card">
              <strong>Доступы</strong>
              <p>В блоке «Доступы» появился нужный курс у нужного пользователя.</p>
            </div>
            <div className="status-card">
              <strong>Публичная часть</strong>
              <p>
                При необходимости откройте страницу курса и убедитесь, что описание, уроки и
                тариф соответствуют текущему запуску.
              </p>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
