import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getOptionalCurrentUser } from '@/lib/auth';
import { buildAuthHref } from '@/lib/auth-intent';
import VisualAdminClient from './visual-admin-client';

export const metadata: Metadata = {
  title: 'Visual Engine | Админка ДНК',
  robots: { index: false, follow: false },
};

export default async function AdminVisualPage() {
  const user = await getOptionalCurrentUser();
  if (!user) redirect(buildAuthHref('login', '/admin/visual'));
  if (user.role !== 'ADMIN') redirect('/lk');

  return (
    <main className="page-shell admin-page-shell">
      <VisualAdminClient />
    </main>
  );
}
