import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import LogoutButton from '@/components/logout-button';
import { getOptionalCurrentUser } from '@/lib/auth';
import { buildAuthHref } from '@/lib/auth-intent';

export const metadata: Metadata = {
  title: 'Профиль | Бизнес школа ДНК',
  robots: {
    index: false,
    follow: false,
  },
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function formatRole(role: 'ADMIN' | 'USER') {
  return role === 'ADMIN' ? 'Администратор' : 'Ученик';
}

export default async function ProfilePage() {
  const user = await getOptionalCurrentUser();

  if (!user) {
    redirect(buildAuthHref('login', '/profile'));
  }

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
          <Link href="/lk" className="ghost-button">
            Кабинет
          </Link>
          <Link href="/help" className="ghost-button">
            Помощь
          </Link>
        </div>
      </div>

      <section className="stack-grid utility-page">
        <article className="panel utility-page__hero">
          <span className="eyebrow">Профиль</span>
          <h1>Аккаунт ученика</h1>
          <p className="panel-copy">
            Здесь собрана базовая информация об аккаунте и быстрые действия, которые
            нужны для повседневной работы с LMS.
          </p>
        </article>

        <div className="grid-two utility-grid">
          <article className="panel utility-card">
            <span className="eyebrow">Данные аккаунта</span>
            <h2>Основная информация</h2>
            <div className="feature-metrics">
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Роль</dt>
                <dd>{formatRole(user.role)}</dd>
              </div>
              <div>
                <dt>Создан</dt>
                <dd>{formatDateTime(user.createdAt)}</dd>
              </div>
              <div>
                <dt>Обновлен</dt>
                <dd>{formatDateTime(user.updatedAt)}</dd>
              </div>
            </div>
          </article>

          <article className="panel utility-card">
            <span className="eyebrow">Быстрые действия</span>
            <h2>Куда идти дальше</h2>
            <div className="utility-list">
              <div className="status-card">
                <strong>Личный кабинет</strong>
                <p>Вернуться к своим курсам, прогрессу и оплатам в процессе.</p>
              </div>
              <div className="status-card">
                <strong>Каталог</strong>
                <p>Открыть все курсы платформы и перейти на нужную product page.</p>
              </div>
              <div className="status-card">
                <strong>Помощь</strong>
                <p>Быстро свериться с маршрутом: бесплатный курс, preview, покупка и обучение.</p>
              </div>
            </div>

            <div className="row-actions utility-card__actions">
              <Link href="/lk" className="secondary-button">
                В кабинет
              </Link>
              <Link href="/catalog" className="secondary-button">
                В каталог
              </Link>
              <Link href="/help" className="ghost-button">
                Помощь
              </Link>
            </div>

            <LogoutButton />
          </article>
        </div>
      </section>
    </main>
  );
}
