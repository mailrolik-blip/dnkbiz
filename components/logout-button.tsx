'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type LogoutButtonProps = {
  className?: string;
  label?: string;
  pendingLabel?: string;
  redirectTo?: string;
};

export default function LogoutButton({
  className = 'primary-button',
  label = 'Выйти',
  pendingLabel = 'Выходим...',
  redirectTo = '/login',
}: LogoutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setError(null);
    setPending(true);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || 'Не удалось завершить сессию.');
      }

      router.push(redirectTo);
      router.refresh();
    } catch (logoutError) {
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : 'Не удалось завершить сессию.'
      );
      setPending(false);
      return;
    }

    setPending(false);
  }

  return (
    <div className="logout-button-wrap">
      <button
        className={className}
        disabled={pending}
        onClick={handleLogout}
        type="button"
      >
        {pending ? pendingLabel : label}
      </button>

      {error ? <p className="feedback feedback-error">{error}</p> : null}
    </div>
  );
}
