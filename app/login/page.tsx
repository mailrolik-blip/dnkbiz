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
          <span>Course MVP</span>
        </Link>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link className="ghost-button" href="/register">
            Register
          </Link>
        </div>
      </div>

      <section className="stack-grid">
        <article className="panel">
          <span className="eyebrow">Login</span>
          <h1 style={{ marginTop: '0.9rem' }}>Return to your personal cabinet.</h1>
          <p className="panel-copy" style={{ marginTop: '0.85rem' }}>
            Email + password auth with an HTTP-only session cookie. Use the seeded admin or test
            user account, or sign in with a newly registered one.
          </p>
        </article>

        <div className="auth-grid">
          <AuthForm mode="login" />

          <article className="feature-card">
            <span className="eyebrow">Seed access</span>
            <h2 style={{ marginTop: '0.8rem' }}>Ready-to-use accounts</h2>
            <div className="stat-list">
              <div>
                <dt>Admin</dt>
                <dd className="mono">admin@example.com / Admin123!</dd>
              </div>
              <div>
                <dt>User</dt>
                <dd className="mono">user@example.com / User12345!</dd>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
