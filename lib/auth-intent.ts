const DEFAULT_POST_AUTH_REDIRECT = '/lk';

type NextValue = string | string[] | null | undefined;
type AuthRoute = 'login' | 'register';

export function sanitizeNextPath(value: NextValue) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (typeof candidate !== 'string') {
    return null;
  }

  const normalized = candidate.trim();

  if (!normalized.startsWith('/') || normalized.startsWith('//') || normalized.startsWith('/\\')) {
    return null;
  }

  try {
    const url = new URL(normalized, 'http://dnkbiz.local');

    if (url.origin !== 'http://dnkbiz.local' || !url.pathname.startsWith('/')) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function resolvePostAuthRedirect(value: NextValue) {
  return sanitizeNextPath(value) ?? DEFAULT_POST_AUTH_REDIRECT;
}

export function buildAuthHref(route: AuthRoute, next?: NextValue) {
  const pathname = sanitizeNextPath(next);

  if (!pathname) {
    return `/${route}`;
  }

  const params = new URLSearchParams({
    next: pathname,
  });

  return `/${route}?${params.toString()}`;
}

export function getCourseIntentPath(slug: string) {
  return `/courses/${slug}`;
}

export function getCheckoutIntentPath(tariffId: number) {
  return `/checkout?tariffId=${tariffId}`;
}

export function getAuthIntentMessage(route: AuthRoute, next?: NextValue) {
  const pathname = sanitizeNextPath(next);

  if (!pathname) {
    return null;
  }

  if (pathname.startsWith('/checkout')) {
    return route === 'register'
      ? 'Зарегистрируйтесь, чтобы перейти к оплате.'
      : 'Войдите, чтобы продолжить оплату.';
  }

  if (pathname.startsWith('/courses/')) {
    return route === 'register'
      ? 'Зарегистрируйтесь, чтобы открыть курс.'
      : 'Войдите, чтобы открыть курс.';
  }

  if (pathname.startsWith('/catalog/')) {
    return route === 'register'
      ? 'Зарегистрируйтесь, чтобы продолжить просмотр курса.'
      : 'Войдите, чтобы продолжить.';
  }

  if (pathname === '/catalog') {
    return route === 'register'
      ? 'Зарегистрируйтесь, чтобы продолжить выбор курсов.'
      : 'Войдите, чтобы продолжить.';
  }

  if (pathname === '/lk') {
    return route === 'register'
      ? 'Зарегистрируйтесь, чтобы открыть личный кабинет.'
      : 'Войдите, чтобы открыть личный кабинет.';
  }

  return route === 'register'
    ? 'Зарегистрируйтесь, чтобы продолжить.'
    : 'Войдите, чтобы продолжить.';
}
