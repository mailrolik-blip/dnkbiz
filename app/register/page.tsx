import Link from 'next/link';
import { redirect } from 'next/navigation';

import AuthForm from '@/components/auth-form';
import { getOptionalCurrentUser } from '@/lib/auth';
import {
  buildAuthHref,
  resolvePostAuthRedirect,
  sanitizeNextPath,
} from '@/lib/auth-intent';

type RegisterPageProps = {
  searchParams: Promise<{ next?: string | string[] | undefined }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
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
          <Link className="ghost-button" href={buildAuthHref('login', nextPath)}>
            Войти
          </Link>
        </div>
      </div>

      <section className="stack-grid">
        <article className="panel">
          <span className="eyebrow">Регистрация</span>
          <h1 style={{ marginTop: '0.9rem' }}>
            Новый ученик получает доступ ко всей LMS через кабинет.
          </h1>
          <p className="panel-copy" style={{ marginTop: '0.85rem' }}>
            После регистрации пользователь сразу попадает в личный кабинет, где может
            начать бесплатный курс, открыть preview платного курса или перейти к покупке.
          </p>
        </article>

        <div className="auth-grid">
          <AuthForm mode="register" nextPath={nextPath} />

          <article className="feature-card">
            <span className="eyebrow">Как это работает</span>
            <h2 style={{ marginTop: '0.8rem' }}>Регистрация → курс → покупка → обучение</h2>
            <div className="stat-list">
              <div>
                <dt>Шаг 1</dt>
                <dd>Создайте аккаунт по email и паролю</dd>
              </div>
              <div>
                <dt>Шаг 2</dt>
                <dd>Начните бесплатный курс или откройте preview у платного</dd>
              </div>
              <div>
                <dt>Шаг 3</dt>
                <dd>После оплаты полный доступ откроется автоматически внутри кабинета</dd>
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
