import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getOptionalCurrentUser } from '@/lib/auth';
import { buildAuthHref } from '@/lib/auth-intent';
import { getAdminDashboardData, type AdminCourseRow } from '@/lib/admin-dashboard';

export const metadata: Metadata = {
  title: 'DNK Biz Admin',
  robots: {
    index: false,
    follow: false,
  },
};

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const moneyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

function formatDate(date: Date) {
  return dateTimeFormatter.format(date);
}

function formatMoney(amount: number) {
  return moneyFormatter.format(amount);
}

function getBadgeClass(status: string) {
  if (status === 'PAID' || status === 'free' || status === 'order' || status === 'ADMIN') {
    return 'badge badge-paid';
  }

  if (
    status === 'PENDING' ||
    status === 'PROCESSING' ||
    status === 'paid' ||
    status === 'preview'
  ) {
    return 'badge badge-pending';
  }

  if (status === 'showcase' || status === 'FAILED' || status === 'CANCELED' || status === 'EXPIRED') {
    return 'badge badge-canceled';
  }

  return 'badge badge-complete';
}

function getCourseStatusLabel(course: AdminCourseRow) {
  if (course.status === 'free') {
    return 'Бесплатный';
  }

  if (course.status === 'paid') {
    return 'Платный';
  }

  return 'Скоро';
}

function EmptyTableRow({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <p className="muted-text" style={{ margin: 0 }}>
          {message}
        </p>
      </td>
    </tr>
  );
}

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

      <section className="dnk-section admin-shell">
        <article className="panel admin-hero">
          <div className="admin-hero__copy">
            <span className="eyebrow">Internal admin</span>
            <h1>Операционная сводка DNK Biz</h1>
            <p className="panel-copy">
              Внутренний read-only экран для владельца платформы: пользователи, заказы, доступы и
              текущий статус каталога без CRM и без редактирования продукта.
            </p>
          </div>

          <div className="admin-overview">
            <div className="admin-stat">
              <span>Пользователи</span>
              <strong>{data.totals.users}</strong>
            </div>
            <div className="admin-stat">
              <span>Заказы</span>
              <strong>{data.totals.orders}</strong>
            </div>
            <div className="admin-stat">
              <span>Доступы</span>
              <strong>{data.totals.enrollments}</strong>
            </div>
            <div className="admin-stat">
              <span>Live-курсы</span>
              <strong>{data.totals.liveCourses}</strong>
            </div>
            <div className="admin-stat">
              <span>Showcase</span>
              <strong>{data.totals.showcaseCourses}</strong>
            </div>
          </div>
        </article>

        <article className="panel admin-section">
          <div className="admin-section__head">
            <span className="eyebrow">Пользователи</span>
            <h2>Кто уже в системе</h2>
            <p className="panel-copy">
              Email, роль, дата регистрации, сколько курсов реально доступно пользователю и есть ли
              активный pending order.
            </p>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Создан</th>
                  <th>Доступно курсов</th>
                  <th>Owned</th>
                  <th>Pending order</th>
                </tr>
              </thead>
              <tbody>
                {data.users.length > 0 ? (
                  data.users.map((item) => (
                    <tr key={item.id}>
                      <td className="mono">{item.email}</td>
                      <td>
                        <span className={getBadgeClass(item.role)}>{item.role}</span>
                      </td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>{item.accessibleCoursesCount}</td>
                      <td>{item.ownedCoursesCount}</td>
                      <td>{item.hasPendingOrder ? 'Да' : 'Нет'}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow colSpan={6} message="Пользователей пока нет." />
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel admin-section">
          <div className="admin-section__head">
            <span className="eyebrow">Заказы</span>
            <h2>Что происходит с оплатой</h2>
            <p className="panel-copy">
              Курс, тариф, пользователь, сумма, текущий статус и используемый payment method.
            </p>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Курс / тариф</th>
                  <th>Пользователь</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                  <th>Способ</th>
                  <th>Создан</th>
                  <th>Обновлен</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.length > 0 ? (
                  data.orders.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.courseTitle}</strong>
                        <div className="muted-text admin-cell__sub">
                          {item.tariffTitle} / <span className="mono">{item.courseSlug}</span>
                        </div>
                      </td>
                      <td className="mono">{item.userEmail}</td>
                      <td>{formatMoney(item.amount)}</td>
                      <td>
                        <span className={getBadgeClass(item.status)}>{item.status}</span>
                      </td>
                      <td>{item.paymentMethod}</td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>{formatDate(item.updatedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow colSpan={7} message="Заказов пока нет." />
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel admin-section">
          <div className="admin-section__head">
            <span className="eyebrow">Enrollments</span>
            <h2>Кому уже открыт доступ</h2>
            <p className="panel-copy">
              Источник доступа показывает, пришел ли enrollment из оплаченного заказа или без
              оплаты.
            </p>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Курс</th>
                  <th>Источник доступа</th>
                  <th>Создан</th>
                </tr>
              </thead>
              <tbody>
                {data.enrollments.length > 0 ? (
                  data.enrollments.map((item) => (
                    <tr key={item.id}>
                      <td className="mono">{item.userEmail}</td>
                      <td>
                        <strong>{item.courseTitle}</strong>
                        <div className="muted-text admin-cell__sub mono">{item.courseSlug}</div>
                      </td>
                      <td>
                        <span className={getBadgeClass(item.source)}>
                          {item.source === 'order' ? 'order' : 'free'}
                        </span>
                      </td>
                      <td>{formatDate(item.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow colSpan={4} message="Выданных доступов пока нет." />
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel admin-section">
          <div className="admin-section__head">
            <span className="eyebrow">Курсы</span>
            <h2>Статус каталога</h2>
            <p className="panel-copy">
              Видно, какие курсы live, какие остаются showcase, где включен preview и есть ли
              активный тариф.
            </p>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Slug</th>
                  <th>Название</th>
                  <th>Статус</th>
                  <th>Preview</th>
                  <th>Уроки</th>
                  <th>Активный тариф</th>
                </tr>
              </thead>
              <tbody>
                {data.courses.length > 0 ? (
                  data.courses.map((item) => (
                    <tr key={item.slug}>
                      <td className="mono">{item.slug}</td>
                      <td>{item.title}</td>
                      <td>
                        <span className={getBadgeClass(item.status)}>
                          {getCourseStatusLabel(item)}
                        </span>
                      </td>
                      <td>{item.previewEnabled ? 'Да' : 'Нет'}</td>
                      <td>{item.lessonsCount}</td>
                      <td>{item.hasActiveTariff ? item.activeTariffTitle : 'Нет'}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow colSpan={6} message="Курсы каталога пока не найдены." />
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}
