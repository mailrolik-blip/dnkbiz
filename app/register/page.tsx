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
          <span>Р‘РР—РќР•РЎ РЁРљРћР›Рђ Р”РќРљ</span>
        </Link>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link className="ghost-button" href={buildAuthHref('login', nextPath)}>
            Р’РѕР№С‚Рё
          </Link>
        </div>
      </div>

      <section className="stack-grid">
        <article className="panel">
          <span className="eyebrow">Р РµРіРёСЃС‚СЂР°С†РёСЏ</span>
          <h1 style={{ marginTop: '0.9rem' }}>РќРѕРІС‹Р№ СѓС‡РµРЅРёРє РїРѕР»СѓС‡Р°РµС‚ РґРѕСЃС‚СѓРї С‡РµСЂРµР· РєР°Р±РёРЅРµС‚.</h1>
          <p className="panel-copy" style={{ marginTop: '0.85rem' }}>
            РџРѕСЃР»Рµ СЂРµРіРёСЃС‚СЂР°С†РёРё РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ СЃСЂР°Р·Сѓ РїРѕРїР°РґР°РµС‚ РІ Р»РёС‡РЅС‹Р№ РєР°Р±РёРЅРµС‚, РіРґРµ РјРѕР¶РµС‚
            РѕС„РѕСЂРјРёС‚СЊ Р·Р°РєР°Р· РЅР° С‚Р°СЂРёС„ Рё РѕС‚РєСЂС‹С‚СЊ РєСѓСЂСЃ РїРѕСЃР»Рµ РѕРїР»Р°С‚С‹.
          </p>
        </article>

        <div className="auth-grid">
          <AuthForm mode="register" nextPath={nextPath} />

          <article className="feature-card">
            <span className="eyebrow">РљР°Рє СЌС‚Рѕ СЂР°Р±РѕС‚Р°РµС‚</span>
            <h2 style={{ marginTop: '0.8rem' }}>Р РµРіРёСЃС‚СЂР°С†РёСЏ в†’ Р·Р°РєР°Р· в†’ РґРѕСЃС‚СѓРї Рє РєСѓСЂСЃСѓ</h2>
            <div className="stat-list">
              <div>
                <dt>РЁР°Рі 1</dt>
                <dd>РЎРѕР·РґР°Р№С‚Рµ Р°РєРєР°СѓРЅС‚ РїРѕ email Рё РїР°СЂРѕР»СЋ</dd>
              </div>
              <div>
                <dt>РЁР°Рі 2</dt>
                <dd>РћС„РѕСЂРјРёС‚Рµ Р·Р°РєР°Р· РЅР° Р°РєС‚РёРІРЅС‹Р№ С‚Р°СЂРёС„</dd>
              </div>
              <div>
                <dt>РЁР°Рі 3</dt>
                <dd>РџРѕСЃР»Рµ СЃС‚Р°С‚СѓСЃР° PAID РєСѓСЂСЃ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё РѕС‚РєСЂРѕРµС‚СЃСЏ РІ РєР°Р±РёРЅРµС‚Рµ</dd>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
