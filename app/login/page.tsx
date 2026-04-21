import Link from 'next/link';
import { redirect } from 'next/navigation';

import AuthForm from '@/components/auth-form';
import { getOptionalCurrentUser } from '@/lib/auth';

export default async function LoginPage() {
  const user = await getOptionalCurrentUser();

  if (user) {
    redirect('/lk');
  }

  return (
    <main className="page-shell">
      <div className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>БИЗНЕС ШКОЛА ДНК</span>
        </Link>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link className="ghost-button" href="/register">
            Регистрация
          </Link>
        </div>
      </div>

      <section className="stack-grid">
        <article className="panel">
          <span className="eyebrow">Вход</span>
          <h1 style={{ marginTop: '0.9rem' }}>Возврат в личный кабинет ученика.</h1>
          <p className="panel-copy" style={{ marginTop: '0.85rem' }}>
            Вход по email и паролю ведёт в кабинет, где доступны реальные заказы, тарифы и
            открытые курсы пользователя.
          </p>
        </article>

        <div className="auth-grid">
          <AuthForm mode="login" />

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
      </section>
    </main>
  );
}
