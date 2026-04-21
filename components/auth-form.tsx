'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

type AuthFormProps = {
  mode: 'login' | 'register';
};

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isRegister = mode === 'register';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch(
        isRegister ? '/api/auth/register' : '/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: isRegister ? name : undefined,
            email,
            password,
          }),
        }
      );

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || 'Запрос не выполнен.');
      }

      router.push('/lk');
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Запрос не выполнен.'
      );
      setPending(false);
      return;
    }

    setPending(false);
  }

  return (
    <div className="auth-card">
      <span className="eyebrow">{isRegister ? 'Регистрация' : 'Вход'}</span>
      <h2 style={{ marginTop: '0.85rem' }}>
        {isRegister ? 'Создайте аккаунт ученика' : 'Войдите в личный кабинет'}
      </h2>
      <p className="panel-copy" style={{ marginTop: '0.85rem' }}>
        {isRegister
          ? 'После регистрации пользователь автоматически получает сессию и попадает в кабинет.'
          : 'Используйте тестовый аккаунт из сид-данных или войдите под уже созданной учётной записью.'}
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: '1.2rem', display: 'grid', gap: '1rem' }}>
        {isRegister ? (
          <div className="field">
            <label htmlFor="name">Имя</label>
            <input
              id="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Как к вам обращаться"
            />
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            autoComplete="email"
            inputMode="email"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Пароль</label>
          <input
            id="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Минимум 8 символов"
          />
        </div>

        <button className="primary-button" disabled={pending} type="submit">
          {pending
            ? isRegister
              ? 'Создаём аккаунт...'
              : 'Входим...'
            : isRegister
              ? 'Зарегистрироваться'
              : 'Войти'}
        </button>
      </form>

      {error ? <p className="feedback feedback-error">{error}</p> : null}

      <p className="muted-text" style={{ marginTop: '1rem' }}>
        {isRegister ? 'Уже есть аккаунт?' : 'Ещё не зарегистрированы?'}{' '}
        <Link
          href={isRegister ? '/login' : '/register'}
          style={{ color: 'var(--accent-strong)', fontWeight: 700 }}
        >
          {isRegister ? 'Войти' : 'Создать аккаунт'}
        </Link>
      </p>
    </div>
  );
}
