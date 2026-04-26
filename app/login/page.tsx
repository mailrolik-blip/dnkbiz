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
          <span>Р‘РР—РќР•РЎ РЁРљРћР›Рђ Р”РќРљ</span>
        </Link>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link className="ghost-button" href={buildAuthHref('register', nextPath)}>
            Р РµРіРёСЃС‚СЂР°С†РёСЏ
          </Link>
        </div>
      </div>

      <section className="stack-grid">
        <article className="panel">
          <span className="eyebrow">Р’С…РѕРґ</span>
          <h1 style={{ marginTop: '0.9rem' }}>Р’РѕР·РІСЂР°С‚ РІ Р»РёС‡РЅС‹Р№ РєР°Р±РёРЅРµС‚ СѓС‡РµРЅРёРєР°.</h1>
          <p className="panel-copy" style={{ marginTop: '0.85rem' }}>
            Р’С…РѕРґ РїРѕ email Рё РїР°СЂРѕР»СЋ РІРµРґС‘С‚ РІ РєР°Р±РёРЅРµС‚, РіРґРµ РґРѕСЃС‚СѓРїРЅС‹ СЂРµР°Р»СЊРЅС‹Рµ Р·Р°РєР°Р·С‹, С‚Р°СЂРёС„С‹ Рё
            РѕС‚РєСЂС‹С‚С‹Рµ РєСѓСЂСЃС‹ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ.
          </p>
        </article>

        <div className="auth-grid">
          <AuthForm mode="login" nextPath={nextPath} />

          <article className="feature-card">
            <span className="eyebrow">РўРµСЃС‚РѕРІС‹Р№ РґРѕСЃС‚СѓРї</span>
            <h2 style={{ marginTop: '0.8rem' }}>Seed-Р°РєРєР°СѓРЅС‚С‹</h2>
            <div className="stat-list">
              <div>
                <dt>РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ</dt>
                <dd className="mono">admin@example.com / Admin123!</dd>
              </div>
              <div>
                <dt>РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ</dt>
                <dd className="mono">user@example.com / User12345!</dd>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
