import 'server-only';

import type { CurrentUser } from '@/lib/auth';
import { getOptionalCurrentUser } from '@/lib/auth';

type AdminGuardResult =
  | {
      ok: true;
      user: CurrentUser;
    }
  | {
      ok: false;
      response: Response;
    };

export async function requireAdminRouteUser(): Promise<AdminGuardResult> {
  const user = await getOptionalCurrentUser();

  if (!user) {
    return {
      ok: false,
      response: Response.json({ error: 'Требуется авторизация.' }, { status: 401 }),
    };
  }

  if (user.role !== 'ADMIN') {
    return {
      ok: false,
      response: Response.json(
        { error: 'Маршрут доступен только администратору.' },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    user,
  };
}
