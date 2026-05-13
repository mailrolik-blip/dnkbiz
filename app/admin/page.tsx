import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import AdminDashboardClient from '@/components/admin-dashboard-client';
import { getOptionalCurrentUser } from '@/lib/auth';
import { buildAuthHref } from '@/lib/auth-intent';
import { getAdminDashboardData } from '@/lib/admin-dashboard';

export const metadata: Metadata = {
  title: 'Админка | Бизнес школа ДНК',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const user = await getOptionalCurrentUser();

  if (!user) {
    redirect(buildAuthHref('login', '/admin'));
  }

  if (user.role !== 'ADMIN') {
    redirect('/lk');
  }

  const data = await getAdminDashboardData();

  return (
    <main className="page-shell">
      <header className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>Бизнес школа ДНК</span>
        </Link>

        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link href="/lk" className="ghost-button">
            Личный кабинет
          </Link>
          <Link href="/catalog" className="secondary-button">
            Каталог
          </Link>
        </div>
      </header>

      <AdminDashboardClient initialData={data} />
    </main>
  );
}
