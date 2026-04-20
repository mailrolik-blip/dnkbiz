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
          <span>Course MVP</span>
        </Link>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link className="ghost-button" href="/login">
            Login
          </Link>
        </div>
      </div>

      <section className="stack-grid">
        <article className="panel">
          <span className="eyebrow">Registration</span>
          <h1 style={{ marginTop: '0.9rem' }}>New user onboarding for the paid course flow.</h1>
          <p className="panel-copy" style={{ marginTop: '0.85rem' }}>
            After signup, the app logs the user in immediately and redirects to the personal
            cabinet.
          </p>
        </article>

        <div className="auth-grid">
          <AuthForm mode="register" />

          <article className="feature-card">
            <span className="eyebrow">What happens next</span>
            <h2 style={{ marginTop: '0.8rem' }}>Register, create order, unlock course.</h2>
            <div className="stat-list">
              <div>
                <dt>Step 1</dt>
                <dd>Create account with email and password</dd>
              </div>
              <div>
                <dt>Step 2</dt>
                <dd>Create a pending order for the active tariff</dd>
              </div>
              <div>
                <dt>Step 3</dt>
                <dd>Admin marks order as PAID and enrollment appears automatically</dd>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
