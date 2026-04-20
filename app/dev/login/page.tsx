'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  getRoleCapabilities,
  getPrimaryAppPath,
  resolveAuthorizedAppPath,
  sanitizeRequestedAppPath,
} from '@/lib/app-access';

type CurrentUserSummary = {
  id: number;
  email: string | null;
  phone: string | null;
  telegramId: string | null;
  staffRole: string | null;
  roles: string[];
  preferredCity: {
    id: number;
    name: string;
  } | null;
  profile: {
    id: number;
    profileType: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

const roleLabels: Record<string, string> = {
  USER: 'Пользователь',
  COACH: 'Тренер',
  MANAGER: 'Менеджер',
  ADMIN: 'Администратор',
};

const profileTypeLabels: Record<string, string> = {
  PLAYER: 'Игрок',
  CHILD: 'Ребенок',
  PARENT: 'Родитель',
  ADULT: 'Взрослый',
};

function translateErrorMessage(message: string) {
  const errorMessages: Record<string, string> = {
    'Failed to load current user': 'Не удалось загрузить текущего пользователя.',
    'Failed to log in as user': 'Не удалось выполнить вход.',
    'Failed to log out': 'Не удалось завершить сессию.',
    'Current user is not authenticated': 'Пользователь не авторизован.',
    'User not found': 'Пользователь не найден.',
    'Not found': 'Функция недоступна в этой среде.',
  };

  return errorMessages[message] ?? message;
}

function formatRoleList(roles: string[]) {
  if (roles.length === 0) {
    return 'Не указаны';
  }

  return roles.map((role) => roleLabels[role] ?? role).join(', ');
}

function formatProfileType(profileType: string | null) {
  if (!profileType) {
    return 'Профиль';
  }

  return profileTypeLabels[profileType] ?? profileType;
}

function formatProfileLabel(profile: CurrentUserSummary['profile']) {
  if (!profile) {
    return 'Профиль не заполнен';
  }

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  return fullName || formatProfileType(profile.profileType);
}

export default function DevLoginPage() {
  const router = useRouter();
  const isDevMode = process.env.NODE_ENV !== 'production';
  const [userId, setUserId] = useState('');
  const [currentUser, setCurrentUser] = useState<CurrentUserSummary | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'submitting'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(sanitizeRequestedAppPath(params.get('next')));
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadCurrentUser() {
      setStatus('loading');
      setError(null);

      try {
        const response = await fetch('/api/me', {
          credentials: 'include',
        });

        if (response.status === 401) {
          if (!isCancelled) {
            setCurrentUser(null);
            setStatus('idle');
          }
          return;
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(
            translateErrorMessage(payload?.error || 'Failed to load current user')
          );
        }

        const payload = (await response.json()) as CurrentUserSummary;

        if (!isCancelled) {
          setCurrentUser(payload);
          setStatus('idle');
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Не удалось загрузить текущего пользователя.'
          );
          setStatus('idle');
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setError(null);

    try {
      const response = await fetch('/api/dev/login-as', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: Number(userId),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          translateErrorMessage(payload?.error || 'Failed to log in as user')
        );
      }

      const nextCurrentUser = payload.currentUser as CurrentUserSummary;

      setCurrentUser(nextCurrentUser);
      setStatus('idle');
      router.replace(resolveAuthorizedAppPath(nextCurrentUser, nextPath));
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Не удалось выполнить вход.'
      );
      setStatus('idle');
    }
  }

  async function handleLogout() {
    setStatus('submitting');
    setError(null);

    try {
      const response = await fetch('/api/dev/logout', {
        method: 'POST',
        credentials: 'include',
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          translateErrorMessage(payload?.error || 'Failed to log out')
        );
      }

      setCurrentUser(null);
      setStatus('idle');
      router.refresh();
    } catch (logoutError) {
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : 'Не удалось завершить сессию.'
      );
      setStatus('idle');
    }
  }

  const currentUserCapabilities = currentUser
    ? getRoleCapabilities(currentUser)
    : null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f6f3ed_0%,#ece6db_100%)] px-4 py-10 text-stone-900">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="rounded-[28px] border border-stone-300/70 bg-white/80 p-6 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.35)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
            Режим разработки
          </p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
                Вход в режиме разработки
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                Установите dev-cookie текущего пользователя, чтобы открыть
                кабинет в браузере без ручной передачи{' '}
                <code>x-user-id</code> в каждом запросе.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/cabinet"
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
              >
                Открыть кабинет
              </Link>
            </div>
          </div>
        </header>

        {!isDevMode ? (
          <section className="rounded-[28px] border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
            Эта страница доступна только в локальной среде разработки.
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[28px] border border-stone-300/70 bg-white p-6 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.35)]">
              <h2 className="text-lg font-semibold text-stone-950">
                Войти как пользователь
              </h2>
              <p className="mt-2 text-sm text-stone-600">
                Укажите числовой <code>userId</code>. После успешного входа
                браузер сохранит dev-cookie и откроет основной маршрут роли.
              </p>
              <p className="mt-2 text-sm text-stone-600">
                USER открывается в <code>/cabinet</code>, а TRAINER, MANAGER и
                ADMIN по умолчанию переходят в <code>/admin</code>. Параметр{' '}
                <code>next</code> используется только для маршрута, который
                разрешён capability-матрицей этой роли.
              </p>

              <form className="mt-6 flex flex-col gap-4" onSubmit={handleLogin}>
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                  ID пользователя
                  <input
                    value={userId}
                    onChange={(event) => setUserId(event.target.value)}
                    inputMode="numeric"
                    placeholder="1"
                    className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base text-stone-950 outline-none transition focus:border-stone-500 focus:bg-white"
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={status === 'submitting' || userId.trim().length === 0}
                    className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                  >
                    {status === 'submitting' ? 'Входим...' : 'Войти'}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={status === 'submitting'}
                    className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-500 hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Выйти
                  </button>
                </div>
              </form>

              {error ? (
                <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}
            </section>

            <aside className="rounded-[28px] border border-stone-300/70 bg-[#1f1d1a] p-6 text-stone-100 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.45)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-400">
                Текущая сессия
              </p>
              {status === 'loading' ? (
                <p className="mt-4 text-sm text-stone-300">
                  Проверяем текущего пользователя...
                </p>
              ) : currentUser ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-2xl font-semibold">Пользователь #{currentUser.id}</p>
                    <p className="mt-1 text-sm text-stone-300">
                      {formatProfileLabel(currentUser.profile)}
                    </p>
                  </div>
                  <dl className="grid gap-3 text-sm text-stone-300">
                    <div>
                      <dt className="text-stone-400">Роли</dt>
                      <dd>{formatRoleList(currentUser.roles)}</dd>
                    </div>
                    <div>
                      <dt className="text-stone-400">Платформенная роль</dt>
                      <dd>{currentUserCapabilities?.roleLabel || 'Не определена'}</dd>
                    </div>
                    <div>
                      <dt className="text-stone-400">Основной маршрут</dt>
                      <dd>{getPrimaryAppPath(currentUser)}</dd>
                    </div>
                    <div>
                      <dt className="text-stone-400">Предпочитаемый город</dt>
                      <dd>{currentUser.preferredCity?.name || 'Не указан'}</dd>
                    </div>
                    <div>
                      <dt className="text-stone-400">Телеграм</dt>
                      <dd>{currentUser.telegramId || 'Не указан'}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <p className="mt-4 text-sm text-stone-300">
                  Dev-cookie текущего пользователя не установлена.
                </p>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
