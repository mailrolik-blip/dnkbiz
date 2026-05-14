import Link from 'next/link';
import { redirect } from 'next/navigation';

import AuthForm from '@/components/auth-form';
import { PublicPageShell } from '@/components/public-shell';
import { getOptionalCurrentUser } from '@/lib/auth';
import {
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
    <PublicPageShell>
      <section className="stack-grid">
        <article className="panel">
          <span className="eyebrow">Регистрация</span>
          <h1 style={{ marginTop: '0.9rem' }}>
            Новый ученик получает доступ к курсам через личный кабинет.
          </h1>
          <p className="panel-copy" style={{ marginTop: '0.85rem' }}>
            После регистрации пользователь сразу попадает в личный кабинет, где может
            начать бесплатный курс, открыть ознакомительные уроки платного курса или перейти к покупке.
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
                <dd>Начните бесплатный курс или откройте ознакомительные уроки у платного</dd>
              </div>
              <div>
                <dt>Шаг 3</dt>
                <dd>После оплаты по QR СБП и ручной проверки полный доступ откроется в личном кабинете</dd>
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
    </PublicPageShell>
  );
}
