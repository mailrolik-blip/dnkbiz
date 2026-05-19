import type { Metadata } from 'next';
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
    <main className="page-shell admin-page-shell">
      <AdminDashboardClient initialData={data} adminEmail={user.email} />
    </main>
  );
}
