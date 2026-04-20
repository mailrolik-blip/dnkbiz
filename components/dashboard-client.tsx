'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type DashboardUser = {
  email: string;
  name: string | null;
  role: 'ADMIN' | 'USER';
};

type EnrolledCourse = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  lessonsCount: number;
  enrolledAt: string;
};

type TariffCard = {
  id: number;
  title: string;
  price: number;
  interval: string | null;
  courseTitle: string;
  courseSlug: string;
  courseDescription: string | null;
  isOwned: boolean;
  hasPendingOrder: boolean;
};

type OrderCard = {
  id: number;
  status: 'PENDING' | 'PAID' | 'CANCELED';
  amount: number;
  createdAt: string;
  paidAt: string | null;
  tariffTitle: string;
  courseTitle: string;
};

type DashboardClientProps = {
  user: DashboardUser;
  courses: EnrolledCourse[];
  tariffs: TariffCard[];
  orders: OrderCard[];
};

function formatMoney(value: number) {
  return `${value.toLocaleString('en-US')} RUB`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not paid yet';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getStatusClass(status: OrderCard['status']) {
  if (status === 'PAID') {
    return 'badge badge-paid';
  }

  if (status === 'CANCELED') {
    return 'badge badge-canceled';
  }

  return 'badge badge-pending';
}

export default function DashboardClient({
  user,
  courses,
  tariffs,
  orders,
}: DashboardClientProps) {
  const router = useRouter();
  const [buyingTariffId, setBuyingTariffId] = useState<number | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: 'error' | 'success';
    message: string;
  } | null>(null);

  async function handleLogout() {
    setFeedback(null);
    setLogoutPending(true);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || 'Logout failed.');
      }

      router.push('/login');
      router.refresh();
    } catch (logoutError) {
      setFeedback({
        tone: 'error',
        message:
          logoutError instanceof Error ? logoutError.message : 'Logout failed.',
      });
      setLogoutPending(false);
      return;
    }

    setLogoutPending(false);
  }

  async function handleCreateOrder(tariffId: number) {
    setFeedback(null);
    setBuyingTariffId(tariffId);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tariffId,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; order?: { id: number } }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || 'Order creation failed.');
      }

      setFeedback({
        tone: 'success',
        message: `Order #${payload?.order?.id ?? 'new'} created with PENDING status.`,
      });
      router.refresh();
    } catch (orderError) {
      setFeedback({
        tone: 'error',
        message:
          orderError instanceof Error
            ? orderError.message
            : 'Order creation failed.',
      });
    } finally {
      setBuyingTariffId(null);
    }
  }

  return (
    <main className="page-shell">
      <div className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>Course MVP</span>
        </Link>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <button
            className="ghost-button"
            disabled={logoutPending}
            onClick={handleLogout}
            type="button"
          >
            {logoutPending ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>

      <section className="stack-grid">
        <article className="panel">
          <span className="eyebrow">Personal cabinet</span>
          <div className="panel-head" style={{ marginTop: '0.9rem' }}>
            <div>
              <h1>{user.name || user.email}</h1>
              <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
                Signed in as <span className="mono">{user.email}</span> with role{' '}
                <span className="mono">{user.role}</span>.
              </p>
            </div>
            <div className="badge-row" style={{ marginTop: 0 }}>
              <span className="badge badge-paid">{courses.length} active courses</span>
              <span className="badge badge-pending">{orders.length} orders</span>
            </div>
          </div>

          {feedback ? (
            <p
              className={`feedback ${
                feedback.tone === 'success' ? 'feedback-success' : 'feedback-error'
              }`}
            >
              {feedback.message}
            </p>
          ) : null}

          {user.role === 'ADMIN' ? (
            <div className="course-card" style={{ marginTop: '1rem' }}>
              <h2 style={{ marginBottom: '0.5rem' }}>Manual payment flow</h2>
              <p className="muted-text">
                As admin, use <span className="mono">PATCH /api/orders/{'{id}'}/status</span>{' '}
                with body <span className="mono">{'{"status":"PAID"}'}</span> to grant course
                access for an order.
              </p>
            </div>
          ) : null}
        </article>

        <div className="grid-two">
          <section className="panel">
            <span className="eyebrow">My courses</span>
            <h2 style={{ marginTop: '0.9rem' }}>Accessible courses</h2>
            <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
              Only courses with an enrollment are shown here.
            </p>

            <div className="course-grid" style={{ marginTop: '1rem' }}>
              {courses.length === 0 ? (
                <div className="empty-card">
                  <p className="muted-text">
                    No courses available yet. Create an order and switch it to PAID as admin.
                  </p>
                </div>
              ) : (
                courses.map((course) => (
                  <article key={course.id} className="course-card">
                    <span className="eyebrow">Course</span>
                    <h2 style={{ marginTop: '0.8rem' }}>{course.title}</h2>
                    <p className="muted-text" style={{ marginTop: '0.65rem' }}>
                      {course.description || 'Protected course page with lesson progress.'}
                    </p>
                    <div className="badge-row">
                      <span className="badge badge-paid">{course.lessonsCount} lessons</span>
                      <span className="badge badge-complete">
                        enrolled {formatDateTime(course.enrolledAt)}
                      </span>
                    </div>
                    <div className="row-actions">
                      <Link
                        className="primary-button"
                        href={`/courses/${course.slug}`}
                      >
                        Open course
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="panel">
            <span className="eyebrow">Orders</span>
            <h2 style={{ marginTop: '0.9rem' }}>Your order history</h2>
            <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
              Pending orders become enrollments after an admin marks them as PAID.
            </p>

            <div className="course-grid" style={{ marginTop: '1rem' }}>
              {orders.length === 0 ? (
                <div className="empty-card">
                  <p className="muted-text">No orders yet.</p>
                </div>
              ) : (
                orders.map((order) => (
                  <article key={order.id} className="order-card">
                    <div className="panel-head">
                      <div>
                        <h2>Order #{order.id}</h2>
                        <p className="muted-text" style={{ marginTop: '0.55rem' }}>
                          {order.tariffTitle} for {order.courseTitle}
                        </p>
                      </div>
                      <span className={getStatusClass(order.status)}>{order.status}</span>
                    </div>
                    <div className="badge-row">
                      <span className="badge badge-pending">{formatMoney(order.amount)}</span>
                      <span className="badge badge-complete">
                        created {formatDateTime(order.createdAt)}
                      </span>
                      {order.status === 'PAID' ? (
                        <span className="badge badge-paid">
                          paid {formatDateTime(order.paidAt)}
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="panel">
          <span className="eyebrow">Tariffs</span>
          <h2 style={{ marginTop: '0.9rem' }}>Buy access</h2>
          <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
            The MVP uses manual payment confirmation. Orders are created as PENDING.
          </p>

          <div className="tariff-grid" style={{ marginTop: '1rem' }}>
            {tariffs.length === 0 ? (
              <div className="empty-card">
                <p className="muted-text">No active tariffs found.</p>
              </div>
            ) : (
              tariffs.map((tariff) => (
                <article key={tariff.id} className="tariff-card">
                  <span className="eyebrow">Tariff</span>
                  <h2 style={{ marginTop: '0.8rem' }}>{tariff.title}</h2>
                  <p className="muted-text" style={{ marginTop: '0.65rem' }}>
                    {tariff.courseTitle}
                  </p>
                  <div className="badge-row">
                    <span className="badge badge-pending">
                      {formatMoney(tariff.price)}
                    </span>
                    {tariff.interval ? (
                      <span className="badge badge-complete">{tariff.interval}</span>
                    ) : null}
                    {tariff.isOwned ? (
                      <span className="badge badge-paid">already unlocked</span>
                    ) : null}
                    {tariff.hasPendingOrder ? (
                      <span className="badge badge-pending">pending order exists</span>
                    ) : null}
                  </div>
                  <p className="muted-text" style={{ marginTop: '0.9rem' }}>
                    {tariff.courseDescription ||
                      'Access to the protected course page after payment confirmation.'}
                  </p>
                  <div className="row-actions">
                    {tariff.isOwned ? (
                      <Link className="secondary-button" href={`/courses/${tariff.courseSlug}`}>
                        Open course
                      </Link>
                    ) : (
                      <button
                        className="primary-button"
                        disabled={buyingTariffId === tariff.id || tariff.hasPendingOrder}
                        onClick={() => handleCreateOrder(tariff.id)}
                        type="button"
                      >
                        {buyingTariffId === tariff.id
                          ? 'Creating order...'
                          : tariff.hasPendingOrder
                            ? 'Pending order exists'
                            : 'Create order'}
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
