import Link from 'next/link';
import { redirect } from 'next/navigation';

import AuthForm from '@/components/auth-form';
import { PublicPageShell } from '@/components/public-shell';
import { getOptionalCurrentUser } from '@/lib/auth';
import {
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
    <PublicPageShell>
      <section className="stack-grid">
        <article className="panel">
          <span className="eyebrow">Вход</span>
          <h1 style={{ marginTop: '0.9rem' }}>Вернитесь в личный кабинет ученика.</h1>
          <p className="panel-copy" style={{ marginTop: '0.85rem' }}>
            Вход по email и паролю ведет в кабинет, где собраны ваши курсы, заказы,
            история прогресса и следующие шаги по обучению.
          </p>
        </article>

        <div className="auth-grid">
          <AuthForm mode="login" nextPath={nextPath} />

          <article className="feature-card">
            <span className="eyebrow">После входа</span>
            <h2 style={{ marginTop: '0.8rem' }}>Что откроется в кабинете</h2>
            <div className="stat-list">
              <div>
                <dt>Курсы</dt>
                <dd>Все доступные курсы, прогресс и следующие шаги по каждому маршруту.</dd>
              </div>
              <div>
                <dt>Покупки</dt>
                <dd>Незавершенные заказы и быстрый возврат на экран оплаты без поиска вручную.</dd>
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
