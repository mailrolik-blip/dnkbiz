import Link from 'next/link';
import { redirect } from 'next/navigation';

import AuthForm from '@/components/auth-form';
import { getOptionalCurrentUser } from '@/lib/auth';
import {
  buildAuthHref,
  resolvePostAuthRedirect,
  sanitizeNextPath,
} from '@/lib/auth-intent';

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] | undefined }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [user, query] = await Promise.all([getOptionalCurrentUser(), searchParams]);
  const nextPath = sanitizeNextPath(query.next);

  if (user) {
    redirect(resolvePostAuthRedirect(nextPath));
  }

  return (
    <main className="page-shell">
      <div className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>Бизнес школа ДНК</span>
        </Link>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link className="ghost-button" href="/help">
            Помощь
          </Link>
          <Link className="ghost-button" href={buildAuthHref('register', nextPath)}>
            Регистрация
          </Link>
        </div>
      </div>

      <section className="stack-grid">
        <article className="panel">
          <span className="eyebrow">Вход</span>
          <h1 style={{ marginTop: '0.9rem' }}>Вернитесь в личный кабинет ученика.</h1>
          <p className="panel-copy" style={{ marginTop: '0.85rem' }}>
            Вход по email и паролю ведет в кабинет, где собраны ваши курсы, заказы,
            история прогресса и следующие шаги по LMS-маршруту.
          </p>
        </article>

        <div className="auth-grid">
          <AuthForm mode="login" nextPath={nextPath} />

          <article className="feature-card">
            <span className="eyebrow">Тестовый доступ</span>
            <h2 style={{ marginTop: '0.8rem' }}>Seed-аккаунты</h2>
            <div className="stat-list">
              <div>
                <dt>Администратор</dt>
                <dd className="mono">admin@example.com / Admin123!</dd>
              </div>
              <div>
                <dt>Пользователь</dt>
                <dd className="mono">user@example.com / User12345!</dd>
              </div>
            </div>
          </article>
        </div>

        <div className="row-actions auth-page__links">
          <Link className="ghost-button" href="/catalog">
            В каталог
          </Link>
          <Link className="ghost-button" href="/privacy">
            Политика конфиденциальности
          </Link>
          <Link className="ghost-button" href="/terms">
            Условия использования
          </Link>
        </div>
      </section>
    </main>
  );
}
