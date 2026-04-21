import Link from 'next/link';
import { redirect } from 'next/navigation';

import AuthForm from '@/components/auth-form';
import { getOptionalCurrentUser } from '@/lib/auth';

export default async function RegisterPage() {
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
          <Link className="ghost-button" href="/login">
            Войти
          </Link>
        </div>
      </div>

      <section className="stack-grid">
        <article className="panel">
          <span className="eyebrow">Регистрация</span>
          <h1 style={{ marginTop: '0.9rem' }}>Новый ученик получает доступ через кабинет.</h1>
          <p className="panel-copy" style={{ marginTop: '0.85rem' }}>
            После регистрации пользователь сразу попадает в личный кабинет, где может
            оформить заказ на тариф и открыть курс после оплаты.
          </p>
        </article>

        <div className="auth-grid">
          <AuthForm mode="register" />

          <article className="feature-card">
            <span className="eyebrow">Как это работает</span>
            <h2 style={{ marginTop: '0.8rem' }}>Регистрация → заказ → доступ к курсу</h2>
            <div className="stat-list">
              <div>
                <dt>Шаг 1</dt>
                <dd>Создайте аккаунт по email и паролю</dd>
              </div>
              <div>
                <dt>Шаг 2</dt>
                <dd>Оформите заказ на активный тариф</dd>
              </div>
              <div>
                <dt>Шаг 3</dt>
                <dd>После статуса PAID курс автоматически откроется в кабинете</dd>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
