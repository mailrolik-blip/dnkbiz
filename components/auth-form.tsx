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
        throw new Error(payload?.error || 'Request failed.');
      }

      router.push('/lk');
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Request failed.'
      );
      setPending(false);
      return;
    }

    setPending(false);
  }

  return (
    <div className="auth-card">
      <span className="eyebrow">{isRegister ? 'Register' : 'Login'}</span>
      <h2 style={{ marginTop: '0.85rem' }}>
        {isRegister ? 'Create your account' : 'Sign in to your dashboard'}
      </h2>
      <p className="panel-copy" style={{ marginTop: '0.85rem' }}>
        {isRegister
          ? 'Use email and password. A session cookie is created automatically after signup.'
          : 'Sign in with the seeded account or with an account created through the register page.'}
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: '1.2rem', display: 'grid', gap: '1rem' }}>
        {isRegister ? (
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
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
            placeholder="you@example.com"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        <button className="primary-button" disabled={pending} type="submit">
          {pending
            ? isRegister
              ? 'Creating account...'
              : 'Signing in...'
            : isRegister
              ? 'Register'
              : 'Login'}
        </button>
      </form>

      {error ? <p className="feedback feedback-error">{error}</p> : null}

      <p className="muted-text" style={{ marginTop: '1rem' }}>
        {isRegister ? 'Already have an account?' : 'Need an account?'}{' '}
        <Link
          href={isRegister ? '/login' : '/register'}
          style={{ color: 'var(--accent-strong)', fontWeight: 600 }}
        >
          {isRegister ? 'Login' : 'Register'}
        </Link>
      </p>
    </div>
  );
}
