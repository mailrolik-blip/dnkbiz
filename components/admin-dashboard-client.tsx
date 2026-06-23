'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  type ReactNode,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';

import type {
  AdminAiAssistantRequestRow,
  AdminCourseRow,
  AdminDashboardData,
  AdminEnrollmentRow,
  AdminLessonRow,
  AdminOrderRow,
  AdminTariffRow,
  AdminUserRow,
} from '@/lib/admin-dashboard';
import { adminManualQueueHints, adminSafetyHints } from '@/lib/admin-help';
import AdminManualReviewActions from '@/components/admin-manual-review-actions';
import InlineInfo from '@/components/inline-info';

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const moneyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const shortDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
});

const shortDateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

type FeedbackState = {
  tone: 'success' | 'error';
  message: string;
} | null;

type AdminMutationResult = {
  ok: boolean;
  message: string;
};

type OrderStatusFilter = 'ALL' | AdminOrderRow['status'];

type CourseDraft = {
  title: string;
  description: string;
  isPublished: boolean;
};

type LessonDraft = {
  title: string;
  description: string;
  content: string;
  isPreview: boolean;
  isPublished: boolean;
};

type TariffDraft = {
  title: string;
  price: string;
  interval: string;
  isActive: boolean;
};

type AdminDashboardTab = 'dashboard' | 'users' | 'orders' | 'courses' | 'lessons' | 'tariffs' | 'accesses';
type TrendPeriod = 'day' | 'week' | 'month' | 'year';
type UserListFilter = 'ALL' | 'ADMIN' | 'USER' | 'ACTIVE_ORDER' | 'HAS_ACCESS';
type AccessSourceFilter = 'ALL' | AdminEnrollmentRow['source'];
type AiRequestStatusFilter = 'ALL' | AdminAiAssistantRequestRow['status'];
type TrendPoint = {
  label: string;
  detailLabel?: string;
  value: number;
};

type ActivityItem = {
  id: string;
  timestamp: string;
  tone: 'warning' | 'accent' | 'success';
  kind: 'review' | 'access' | 'user';
  title: string;
  meta: string;
  action: () => void;
};

type AdminDashboardActions = {
  deleteUserAction: (input: { userId: number }) => Promise<AdminMutationResult>;
  grantCourseAccessAction: (input: { userId: number; courseId: number }) => Promise<AdminMutationResult>;
  revokeCourseAccessAction: (input: { enrollmentId: number }) => Promise<AdminMutationResult>;
  setUserRoleAction: (input: { userId: number; role: 'ADMIN' | 'USER' }) => Promise<AdminMutationResult>;
};

type AdminWorkbenchRow = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  badge: string;
  badgeClass: string;
  onClick?: () => void;
};

type AdminSectionChart = {
  title: string;
  value: string;
  note: string;
  points: TrendPoint[];
  hint: string;
  metricLabel?: string;
  tone?: 'accent' | 'warning' | 'success';
  formatValue?: (value: number) => string;
};

type AdminSectionPanel = {
  title: string;
  subtitle: string;
  actionLabel: string;
  action: () => void;
  metrics: Array<{ label: string; value: string }>;
  rowsTitle: string;
  rows: AdminWorkbenchRow[];
  emptyText: string;
  chart?: AdminSectionChart | null;
};

type AdminCompactSelectOption = {
  value: number | string;
  label: string;
  meta?: string;
  badge?: string;
  badgeClass?: string;
  searchText?: string;
};

function formatDate(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function formatMoney(amount: number) {
  return moneyFormatter.format(amount);
}

function formatShortDate(value: string) {
  return shortDateFormatter.format(new Date(value));
}

function formatShortDateTime(value: string) {
  return shortDateTimeFormatter.format(new Date(value));
}

function getAdminInitials(email: string) {
  const name = email.split('@')[0] || 'AD';
  return name.slice(0, 2).toUpperCase();
}

function buildTrendSeries<T>(
  items: T[],
  getDate: (item: T) => string,
  getValue: (item: T) => number = () => 1,
  period: TrendPeriod
) {
  const now = new Date();
  const buckets: Array<{
    key: string;
    label: string;
    detailLabel: string;
    value: number;
    start: number;
    end: number;
  }> = [];

  if (period === 'day') {
    const end = new Date(now);
    end.setMinutes(0, 0, 0);

    for (let index = 0; index < 8; index += 1) {
      const bucketEnd = new Date(end);
      bucketEnd.setHours(end.getHours() - (7 - index) * 3);
      const bucketStart = new Date(bucketEnd);
      bucketStart.setHours(bucketEnd.getHours() - 3);
      buckets.push({
        key: bucketStart.toISOString(),
        label: bucketEnd.toLocaleTimeString('ru-RU', { hour: '2-digit' }),
        detailLabel: `${shortDateFormatter.format(bucketStart)}, ${bucketStart.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })} – ${bucketEnd.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
        value: 0,
        start: bucketStart.getTime(),
        end: bucketEnd.getTime(),
      });
    }
  } else if (period === 'week') {
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);

    for (let index = 0; index < 7; index += 1) {
      const bucketStart = new Date(end);
      bucketStart.setDate(end.getDate() - (6 - index));
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setDate(bucketStart.getDate() + 1);
      buckets.push({
        key: bucketStart.toISOString().slice(0, 10),
        label: shortDateFormatter.format(bucketStart),
        detailLabel: bucketStart.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
        }),
        value: 0,
        start: bucketStart.getTime(),
        end: bucketEnd.getTime(),
      });
    }
  } else if (period === 'month') {
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);

    for (let index = 0; index < 8; index += 1) {
      const bucketStart = new Date(end);
      bucketStart.setDate(end.getDate() - (7 - index) * 4);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setDate(bucketStart.getDate() + 4);
      buckets.push({
        key: bucketStart.toISOString().slice(0, 10),
        label: shortDateFormatter.format(bucketStart),
        detailLabel: `${bucketStart.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short',
        })} – ${new Date(bucketEnd.getTime() - 1).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short',
        })}`,
        value: 0,
        start: bucketStart.getTime(),
        end: bucketEnd.getTime(),
      });
    }
  } else {
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    for (let index = 0; index < 12; index += 1) {
      const bucketStart = new Date(end.getFullYear(), end.getMonth() - (11 - index), 1);
      const bucketEnd = new Date(end.getFullYear(), end.getMonth() - (10 - index), 1);
      buckets.push({
        key: `${bucketStart.getFullYear()}-${bucketStart.getMonth() + 1}`,
        label: bucketStart.toLocaleDateString('ru-RU', { month: 'short' }),
        detailLabel: bucketStart.toLocaleDateString('ru-RU', {
          month: 'long',
          year: 'numeric',
        }),
        value: 0,
        start: bucketStart.getTime(),
        end: bucketEnd.getTime(),
      });
    }
  }

  for (const item of items) {
    const timestamp = new Date(getDate(item)).getTime();
    const bucket = buckets.find((candidate) => timestamp >= candidate.start && timestamp < candidate.end);

    if (bucket) {
      bucket.value += getValue(item);
    }
  }

  return buckets.map((bucket) => ({
    label: bucket.label,
    detailLabel: bucket.detailLabel,
    value: bucket.value,
  }));
}

function getBadgeClass(status: string) {
  if (
    status === 'PAID' ||
    status === 'paid' ||
    status === 'free' ||
    status === 'ADMIN' ||
    status === 'order'
  ) {
    return 'badge badge-paid';
  }

  if (
    status === 'PENDING' ||
    status === 'PROCESSING' ||
    status === 'preview'
  ) {
    return 'badge badge-pending';
  }

  if (
    status === 'FAILED' ||
    status === 'CANCELED' ||
    status === 'EXPIRED' ||
    status === 'showcase' ||
    status === 'hidden'
  ) {
    return 'badge badge-canceled';
  }

  return 'badge badge-complete';
}

function getRoleLabel(role: AdminUserRow['role']) {
  return role === 'ADMIN' ? 'Администратор' : 'Ученик';
}

function getCourseStateLabel(state: AdminCourseRow['state']) {
  if (state === 'free') {
    return 'Бесплатный';
  }

  if (state === 'paid') {
    return 'Платный';
  }

  if (state === 'showcase') {
    return 'Витрина';
  }

  return 'Скрыт';
}

function getEnrollmentSourceLabel(source: AdminEnrollmentRow['source']) {
  return source === 'order' ? 'Из заказа' : 'Бесплатно';
}

function getOrderStatusLabel(status: AdminOrderRow['status']) {
  return ORDER_FILTER_LABELS[status];
}

function getPaymentMethodLabel(method: AdminOrderRow['paymentMethod']) {
  if (method === 'TBANK') {
    return 'T-Bank';
  }

  if (method === 'TEST') {
    return 'Тест';
  }

  return 'Ручная';
}

function getLessonVisibilityLabel(lesson: Pick<AdminLessonRow, 'isPreview' | 'isPublished'>) {
  if (lesson.isPreview) {
    return 'Ознакомительный';
  }

  if (lesson.isPublished) {
    return 'Опубликован';
  }

  return 'Черновик';
}

function hasEnoughTrendData(points: TrendPoint[]) {
  return points.filter((point) => point.value > 0).length > 1;
}

function toCourseDraft(course: AdminCourseRow): CourseDraft {
  return {
    title: course.title,
    description: course.description ?? '',
    isPublished: course.isPublished,
  };
}

function toLessonDraft(lesson: AdminLessonRow): LessonDraft {
  return {
    title: lesson.title,
    description: lesson.description ?? '',
    content: lesson.content ?? '',
    isPreview: lesson.isPreview,
    isPublished: lesson.isPublished,
  };
}

function toTariffDraft(tariff: AdminTariffRow): TariffDraft {
  return {
    title: tariff.title,
    price: String(tariff.price),
    interval: tariff.interval ?? '',
    isActive: tariff.isActive,
  };
}

async function requestJson<T>(input: string, init: RequestInit, fallbackMessage: string) {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } & T;

  if (!response.ok) {
    throw new Error(payload?.error || fallbackMessage);
  }

  return payload;
}

const emptyCreateCourseDraft = {
  title: '',
  slug: '',
  description: '',
  isPublished: false,
};

const emptyCreateLessonDraft: LessonDraft = {
  title: '',
  description: '',
  content: '',
  isPreview: false,
  isPublished: true,
};

const emptyCreateTariffDraft = {
  title: '',
  slug: '',
  price: '',
  interval: 'one-time',
  isActive: true,
};

type AdminMobilePanel = 'users' | 'orders' | 'accesses';
type AdminDrawerKey = 'review' | 'content' | 'orders' | 'users' | 'accesses' | null;
const TREND_PERIOD_LABELS: Record<TrendPeriod, { title: string; note: string }> = {
  day: { title: 'День', note: 'за день' },
  week: { title: 'Неделя', note: 'за неделю' },
  month: { title: 'Месяц', note: 'за месяц' },
  year: { title: 'Год', note: 'за год' },
};
const ORDER_FILTER_LABELS: Record<OrderStatusFilter, string> = {
  ALL: 'Все',
  PROCESSING: 'На проверке',
  PENDING: 'Ожидают',
  PAID: 'Оплачены',
  FAILED: 'Сбой',
  CANCELED: 'Отмена',
  EXPIRED: 'Истекли',
};
const USER_FILTER_LABELS: Record<UserListFilter, string> = {
  ALL: 'Все',
  ADMIN: 'Админы',
  USER: 'Ученики',
  ACTIVE_ORDER: 'С заказом',
  HAS_ACCESS: 'С доступом',
};
const ACCESS_FILTER_LABELS: Record<AccessSourceFilter, string> = {
  ALL: 'Все',
  order: 'Из заказа',
  free: 'Бесплатно',
};
const ORDER_STATUS_FILTERS = ['ALL', 'PROCESSING', 'PENDING', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED'] as const;
const AI_REQUEST_STATUSES = ['NEW', 'REVIEWED', 'IN_PROGRESS', 'READY', 'CLOSED'] as const;
const AI_REQUEST_STATUS_LABELS: Record<AdminAiAssistantRequestRow['status'], string> = {
  NEW: 'Новая',
  REVIEWED: 'На проверке',
  IN_PROGRESS: 'В работе',
  READY: 'Готова',
  CLOSED: 'Закрыта',
};

function buildAiAssistantN8nBrief(request: AdminAiAssistantRequestRow) {
  return [
    `AI-заявка #${request.id}`,
    `Имя: ${request.name}`,
    `Контакт: ${request.contact}`,
    request.userEmail ? `Аккаунт DNK: ${request.userEmail}` : null,
    `Тип бизнеса: ${request.businessType}`,
    `Главная боль: ${request.pain}`,
    `Что передать помощнику: ${request.tasks.join(', ')}`,
    `Где сейчас общение: ${request.channels.join(', ')}`,
    request.comment ? `Комментарий: ${request.comment}` : null,
    request.adminNote ? `Заметка администратора: ${request.adminNote}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7.5 14.5c-1.9 0-3.6 1-4.5 2.75" />
      <path d="M16.5 14.5c1.9 0 3.6 1 4.5 2.75" />
      <circle cx="8" cy="9" r="2.75" />
      <circle cx="16" cy="9" r="2.75" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 7.5h12l-1 9.2a2 2 0 0 1-2 1.3H9a2 2 0 0 1-2-1.3L6 7.5Z" />
      <path d="M9 7.5V6a3 3 0 1 1 6 0v1.5" />
    </svg>
  );
}

function AccessIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

function CoursesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4.5 8.5 12 5l7.5 3.5L12 12 4.5 8.5Z" />
      <path d="M6.5 11.2V16.5L12 19l5.5-2.5v-5.3" />
    </svg>
  );
}

function LessonsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="4.5" width="14" height="15" rx="2.25" />
      <path d="M8 8.25h8" />
      <path d="M8 12h8" />
      <path d="M8 15.75h4.5" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.8v4.6l3.1 1.8" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3.5 12s3-5.5 8.5-5.5 8.5 5.5 8.5 5.5-3 5.5-8.5 5.5S3.5 12 3.5 12Z" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m5 16.8-.8 3 3-.8L18.7 7.5l-2.2-2.2L5 16.8Z" />
      <path d="m15.5 6.3 2.2 2.2" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="8" y="8" width="10" height="10" rx="2" />
      <path d="M6 14H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M13 5h6v6" />
      <path d="m11 13 8-8" />
      <path d="M19 14v3.5A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5v-11A1.5 1.5 0 0 1 6.5 5H10" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m7 7 10 10" />
      <path d="M17 7 7 17" />
    </svg>
  );
}

function TariffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4.5 11.5 12 4l7.5 7.5-7.5 8-7.5-8Z" />
      <path d="M9.25 11.5h5.5" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 10.25v5" />
      <circle cx="12" cy="7.75" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6.5 15.5h11l-1-1.6V10a4.5 4.5 0 1 0-9 0v3.9l-1 1.6Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

function ActivityKindIcon({ kind }: { kind: ActivityItem['kind'] }) {
  if (kind === 'review') {
    return <ReviewIcon />;
  }

  if (kind === 'access') {
    return <AccessIcon />;
  }

  return <UsersIcon />;
}

function AdminHint({
  align = 'end',
  children,
  label,
}: {
  align?: 'center' | 'end' | 'start';
  children: ReactNode;
  label: string;
}) {
  return (
    <InlineInfo align={align} label={label} overlay>
      {children}
    </InlineInfo>
  );
}

function MiniTrendChart({
  points,
  tone = 'accent',
  formatValue = (value: number) => String(value),
  metricLabel = 'Метрика',
}: {
  points: TrendPoint[];
  tone?: 'accent' | 'warning' | 'success';
  formatValue?: (value: number) => string;
  metricLabel?: string;
}) {
  const width = 360;
  const height = 148;
  const paddingLeft = 12;
  const paddingRight = 42;
  const paddingTop = 14;
  const chartHeight = 92;
  const [activePointKey, setActivePointKey] = useState<string | null>(null);
  const max = Math.max(...points.map((point) => point.value), 1);
  const step =
    points.length > 1 ? (width - paddingLeft - paddingRight) / (points.length - 1) : width - paddingLeft - paddingRight;
  const enoughData = hasEnoughTrendData(points);

  const coordinates = points.map((point, index) => {
    const x = paddingLeft + index * step;
    const y = paddingTop + chartHeight - (point.value / max) * chartHeight;
    return { ...point, x, y };
  });

  const linePath =
    coordinates.length < 3
      ? coordinates
          .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
          .join(' ')
      : coordinates.reduce((path, point, index) => {
          if (index === 0) {
            return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
          }

          if (index === coordinates.length - 1) {
            const previousPoint = coordinates[index - 1];
            return `${path} Q ${previousPoint.x.toFixed(2)} ${previousPoint.y.toFixed(2)} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
          }

          const nextPoint = coordinates[index + 1];
          const midX = (point.x + nextPoint.x) / 2;
          const midY = (point.y + nextPoint.y) / 2;

          return `${path} Q ${point.x.toFixed(2)} ${point.y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
        }, '');

  const gridLines = [0, 0.33, 0.66, 1].map((ratio) => paddingTop + chartHeight - chartHeight * ratio);
  const scaleMarks = [
    { value: max, y: paddingTop + 6 },
    { value: Math.round(max / 2), y: paddingTop + chartHeight / 2 + 3 },
    { value: 0, y: paddingTop + chartHeight - 2 },
  ];
  const activePoint =
    coordinates.find((point) => `${point.label}-${point.x}` === activePointKey) ?? null;
  const activePointLeft = activePoint ? `${(activePoint.x / width) * 100}%` : '50%';
  const activePointTop = activePoint ? `${(activePoint.y / height) * 100}%` : '50%';
  const tooltipAlign =
    activePoint && activePoint.x > width - paddingRight - 40
      ? 'end'
      : activePoint && activePoint.x < paddingLeft + 48
        ? 'start'
        : 'center';
  const tooltipPlacement = activePoint && activePoint.y < paddingTop + 28 ? 'bottom' : 'top';

  return (
    <div className={`admin-line-chart admin-line-chart--${tone}`} onMouseLeave={() => setActivePointKey(null)}>
      {enoughData ? (
        <div className="admin-line-chart__plot">
          <svg className="admin-line-chart__svg" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
          {gridLines.map((y) => (
            <line
              className="admin-line-chart__grid"
              key={y}
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={y}
              y2={y}
            />
          ))}
          {coordinates.map((point) => {
            const pointKey = `${point.label}-${point.x}`;

            return (
              <line
                className={`admin-line-chart__guide ${activePointKey === pointKey ? 'admin-line-chart__guide--active' : ''}`}
                key={`guide-${pointKey}`}
                x1={point.x}
                x2={point.x}
                y1={paddingTop}
                y2={paddingTop + chartHeight}
              />
            );
          })}
          <path className="admin-line-chart__line" d={linePath} />
          {scaleMarks.map((mark) => (
            <text
              className="admin-line-chart__scale"
              key={`${mark.value}-${mark.y}`}
              x={width - paddingRight + 28}
              y={mark.y}
            >
              {formatValue(mark.value)}
            </text>
          ))}
          {coordinates.map((point) => {
            const pointKey = `${point.label}-${point.x}`;

            return (
              <circle
                className={`admin-line-chart__point ${activePointKey === pointKey ? 'admin-line-chart__point--active' : ''}`}
                cx={point.x}
                cy={point.y}
                key={pointKey}
                r="2.9"
              />
            );
          })}
          </svg>
          {coordinates.map((point) => {
            const pointKey = `${point.label}-${point.x}`;

            return (
              <button
                aria-label={`${metricLabel}: ${formatValue(point.value)} за ${point.detailLabel ?? point.label}`}
                className="admin-line-chart__hotspot"
                key={`hotspot-${pointKey}`}
                onBlur={() => setActivePointKey((current) => (current === pointKey ? null : current))}
                onFocus={() => setActivePointKey(pointKey)}
                onMouseEnter={() => setActivePointKey(pointKey)}
                onMouseLeave={() => setActivePointKey((current) => (current === pointKey ? null : current))}
                style={{
                  left: `${(point.x / width) * 100}%`,
                  top: `${(point.y / height) * 100}%`,
                }}
                type="button"
              />
            );
          })}
          {activePoint ? (
            <div
              className="admin-line-chart__tooltip"
              data-align={tooltipAlign}
              data-placement={tooltipPlacement}
              style={{
                left: activePointLeft,
                top: activePointTop,
              }}
            >
              <span>{activePoint.detailLabel ?? activePoint.label}</span>
              <strong>{formatValue(activePoint.value)}</strong>
              <small>{metricLabel}</small>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="admin-line-chart__empty">Недостаточно данных</div>
      )}
      <div className="admin-line-chart__labels">
        {points.map((point) => (
          <span key={point.label}>
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function AdminCompactSelect({
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  ariaLabel,
  disabled = false,
}: {
  value: number | string | null;
  options: AdminCompactSelectOption[];
  onChange: (value: number | string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  ariaLabel: string;
  disabled?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const inputId = `admin-compact-select-${useId().replace(/:/g, '')}`;
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [popoverStyle, setPopoverStyle] = useState<{
    left: number;
    maxHeight: number;
    placement: 'bottom' | 'top';
    top: number;
    width: number;
  } | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const selectedOption =
    options.find((option) => String(option.value) === String(value ?? '')) ?? null;
  const filteredOptions = options.filter((option) =>
    (option.searchText ?? `${option.label} ${option.meta ?? ''}`.trim())
      .toLowerCase()
      .includes(normalizedQuery)
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (rootRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
      setQuery('');
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) {
        return;
      }

      event.preventDefault();
      setIsOpen(false);
      setQuery('');
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPopoverStyle(null);
      return undefined;
    }

    function updatePopoverPosition() {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      const popoverRect = popoverRef.current?.getBoundingClientRect();

      if (!triggerRect) {
        return;
      }

      const viewportPadding = 8;
      const nextWidth = Math.min(
        Math.max(triggerRect.width, Math.min(320, window.innerWidth - viewportPadding * 2)),
        window.innerWidth - viewportPadding * 2
      );
      const left = Math.min(
        Math.max(viewportPadding, triggerRect.left),
        window.innerWidth - nextWidth - viewportPadding
      );
      const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
      const spaceAbove = triggerRect.top - viewportPadding;
      const measuredHeight = popoverRect?.height ?? 320;
      const placement: 'bottom' | 'top' =
        spaceBelow < Math.min(measuredHeight, 280) && spaceAbove > spaceBelow ? 'top' : 'bottom';
      const maxHeight = Math.max(160, placement === 'top' ? spaceAbove : spaceBelow);
      const visibleHeight = Math.min(measuredHeight, maxHeight);
      const top =
        placement === 'top'
          ? Math.max(viewportPadding, triggerRect.top - visibleHeight - viewportPadding)
          : Math.min(
              window.innerHeight - visibleHeight - viewportPadding,
              triggerRect.bottom + viewportPadding
            );

      setPopoverStyle((current) => {
        if (
          current &&
          current.left === left &&
          current.top === top &&
          current.width === nextWidth &&
          current.maxHeight === maxHeight &&
          current.placement === placement
        ) {
          return current;
        }

        return {
          left,
          maxHeight,
          placement,
          top,
          width: nextWidth,
        };
      });
    }

    const frame = window.requestAnimationFrame(updatePopoverPosition);
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [filteredOptions.length, isOpen, query]);

  return (
    <div className="admin-compact-select" ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={`admin-compact-select__trigger ${
          isOpen ? 'admin-compact-select__trigger--open' : ''
        }`}
        disabled={disabled}
        onClick={() => {
          setIsOpen((current) => !current);
          setQuery('');
        }}
        ref={triggerRef}
        type="button"
      >
        <span className="admin-compact-select__trigger-copy">
          <strong>{selectedOption?.label ?? placeholder}</strong>
          {selectedOption?.meta ? (
            <span className="mono">{selectedOption.meta}</span>
          ) : (
            <span>{placeholder}</span>
          )}
        </span>
        {selectedOption?.badge ? (
          <span className={selectedOption.badgeClass}>{selectedOption.badge}</span>
        ) : null}
        <span className="admin-compact-select__trigger-icon" aria-hidden="true">
          v
        </span>
      </button>

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="admin-compact-select__popover"
              data-placement={popoverStyle?.placement ?? 'bottom'}
              ref={popoverRef}
              style={
                popoverStyle
                  ? {
                      left: `${popoverStyle.left}px`,
                      maxHeight: `${popoverStyle.maxHeight}px`,
                      top: `${popoverStyle.top}px`,
                      width: `${popoverStyle.width}px`,
                    }
                  : {
                      left: '0px',
                      top: '0px',
                      visibility: 'hidden',
                    }
              }
            >
              <div className="field">
                <label className="sr-only" htmlFor={inputId}>
                  {searchPlaceholder}
                </label>
                <input
                  autoFocus
                  id={inputId}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  value={query}
                />
              </div>

              <div className="admin-compact-select__list" role="listbox">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => {
                    const isActive = String(option.value) === String(value ?? '');

                    return (
                      <button
                        aria-selected={isActive}
                        className={`admin-compact-select__option ${
                          isActive ? 'admin-compact-select__option--active' : ''
                        }`}
                        key={String(option.value)}
                        onClick={() => {
                          onChange(option.value);
                          setIsOpen(false);
                          setQuery('');
                        }}
                        role="option"
                        type="button"
                      >
                        <span className="admin-compact-select__option-copy">
                          <strong>{option.label}</strong>
                          {option.meta ? <span className="mono">{option.meta}</span> : null}
                        </span>
                        {option.badge ? (
                          <span className={option.badgeClass}>{option.badge}</span>
                        ) : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="admin-compact-select__empty">{emptyText}</div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export default function AdminDashboardClient({
  adminActions,
  initialData,
  adminEmail,
  adminUserId,
  n8nWorkflowUrl,
}: {
  adminActions: AdminDashboardActions;
  initialData: AdminDashboardData;
  adminEmail: string;
  adminUserId: number;
  n8nWorkflowUrl: string | null;
}) {
  const router = useRouter();
  const courseEditorRef = useRef<HTMLElement | null>(null);
  const bellDropdownRef = useRef<HTMLDivElement | null>(null);
  const [courseFeedback, setCourseFeedback] = useState<FeedbackState>(null);
  const [lessonFeedback, setLessonFeedback] = useState<FeedbackState>(null);
  const [tariffFeedback, setTariffFeedback] = useState<FeedbackState>(null);
  const [managementFeedback, setManagementFeedback] = useState<FeedbackState>(null);
  const [orderFilter, setOrderFilter] = useState<OrderStatusFilter>('ALL');
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(
    initialData.courses[0]?.id ?? null
  );
  const [courseDraft, setCourseDraft] = useState<CourseDraft | null>(
    initialData.courses[0] ? toCourseDraft(initialData.courses[0]) : null
  );
  const [createCourseDraft, setCreateCourseDraft] = useState(emptyCreateCourseDraft);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(
    initialData.courses[0]?.lessons[0]?.id ?? null
  );
  const [lessonDraft, setLessonDraft] = useState<LessonDraft | null>(
    initialData.courses[0]?.lessons[0]
      ? toLessonDraft(initialData.courses[0].lessons[0])
      : null
  );
  const [lessonOrder, setLessonOrder] = useState<number[]>(
    initialData.courses[0]?.lessons.map((lesson) => lesson.id) ?? []
  );
  const [createLessonDraft, setCreateLessonDraft] = useState<LessonDraft>(emptyCreateLessonDraft);
  const [selectedTariffId, setSelectedTariffId] = useState<number | null>(
    initialData.courses[0]?.tariffs[0]?.id ?? null
  );
  const [tariffDraft, setTariffDraft] = useState<TariffDraft | null>(
    initialData.courses[0]?.tariffs[0]
      ? toTariffDraft(initialData.courses[0].tariffs[0])
      : null
  );
  const [createTariffDraft, setCreateTariffDraft] = useState(emptyCreateTariffDraft);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [mobileAdminPanel, setMobileAdminPanel] = useState<AdminMobilePanel>('users');
  const [activeDashboardTab, setActiveDashboardTab] = useState<AdminDashboardTab>('dashboard');
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('week');
  const [activeAdminDrawer, setActiveAdminDrawer] = useState<AdminDrawerKey>(null);
  const [drawerTargetId, setDrawerTargetId] = useState<string | null>(null);
  const [reviewSearch, setReviewSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userListFilter, setUserListFilter] = useState<UserListFilter>('ALL');
  const [accessSearch, setAccessSearch] = useState('');
  const [accessSourceFilter, setAccessSourceFilter] = useState<AccessSourceFilter>('ALL');
  const [courseSearch, setCourseSearch] = useState('');
  const [isContentSidebarOpen, setIsContentSidebarOpen] = useState(false);
  const [isBellDropdownOpen, setIsBellDropdownOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserOrderFilter, setSelectedUserOrderFilter] = useState<OrderStatusFilter>('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedGrantCourseId, setSelectedGrantCourseId] = useState<number | null>(null);
  const [accessGrantUserId, setAccessGrantUserId] = useState<number | null>(initialData.users[0]?.id ?? null);
  const [accessGrantCourseId, setAccessGrantCourseId] = useState<number | null>(
    initialData.courses.find((course) => course.hasActiveTariff)?.id ?? initialData.courses[0]?.id ?? null
  );
  const [accessWorkspaceMode, setAccessWorkspaceMode] = useState<'journal' | 'grant'>('journal');
  const [pendingManagementKey, setPendingManagementKey] = useState<string | null>(null);
  const [expandedAiAssistantRequestId, setExpandedAiAssistantRequestId] = useState<number | null>(null);
  const [aiAssistantDetailId, setAiAssistantDetailId] = useState<number | null>(null);
  const [aiAssistantStatusDraft, setAiAssistantStatusDraft] = useState<AdminAiAssistantRequestRow['status']>('NEW');
  const [aiAssistantAdminNoteDraft, setAiAssistantAdminNoteDraft] = useState('');
  const [aiAssistantN8nStatusDraft, setAiAssistantN8nStatusDraft] = useState('');
  const [aiRequestStatusFilter, setAiRequestStatusFilter] = useState<AiRequestStatusFilter>('ALL');
  const [aiRequestSearch, setAiRequestSearch] = useState('');
  const [isManagementPending, startManagementTransition] = useTransition();

  const manualReviewOrders = useMemo(
    () =>
      initialData.orders.filter(
        (order) => order.paymentMethod === 'MANUAL' && order.status === 'PROCESSING'
      ),
    [initialData.orders]
  );
  const reviewSearchValue = reviewSearch.trim().toLowerCase();
  const orderSearchValue = orderSearch.trim().toLowerCase();
  const userSearchValue = userSearch.trim().toLowerCase();
  const accessSearchValue = accessSearch.trim().toLowerCase();
  const courseSearchValue = courseSearch.trim().toLowerCase();
  const aiRequestSearchValue = aiRequestSearch.trim().toLowerCase();

  async function handleCopyAiAssistantBrief(request: AdminAiAssistantRequestRow) {
    try {
      await navigator.clipboard.writeText(buildAiAssistantN8nBrief(request));
      setManagementFeedback({
        tone: 'success',
        message: `ТЗ для n8n по заявке #${request.id} скопировано.`,
      });
    } catch {
      setManagementFeedback({
        tone: 'error',
        message: 'Не удалось скопировать ТЗ.',
      });
    }
  }

  async function handleCopyAiAssistantPayload(request: AdminAiAssistantRequestRow) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(request.payload ?? null, null, 2));
      setManagementFeedback({
        tone: 'success',
        message: `Payload JSON по заявке #${request.id} скопирован.`,
      });
    } catch {
      setManagementFeedback({
        tone: 'error',
        message: 'Не удалось скопировать payload JSON.',
      });
    }
  }

  function handleToggleAiAssistantRequest(requestId: number) {
    setExpandedAiAssistantRequestId((current) => (current === requestId ? null : requestId));
  }

  function handleOpenAiAssistantDetails(request: AdminAiAssistantRequestRow) {
    setAiAssistantDetailId(request.id);
    setAiAssistantStatusDraft(request.status);
    setAiAssistantAdminNoteDraft(request.adminNote ?? '');
    setAiAssistantN8nStatusDraft(request.n8nStatus ?? '');
  }

  function handleCloseAiAssistantDetails() {
    setAiAssistantDetailId(null);
  }

  function handleResetAiAssistantFilters() {
    setAiRequestStatusFilter('ALL');
    setAiRequestSearch('');
  }

  async function handleSaveAiAssistantDetails(request: AdminAiAssistantRequestRow) {
    setManagementFeedback(null);
    setPendingKey(`ai-request-${request.id}`);

    try {
      await requestJson(
        `/api/admin/ai-assistant-requests/${request.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            adminNote: aiAssistantAdminNoteDraft,
            n8nStatus: aiAssistantN8nStatusDraft,
            status: aiAssistantStatusDraft,
          }),
        },
        'Не удалось сохранить AI-заявку.'
      );
      setManagementFeedback({
        tone: 'success',
        message: `Заявка #${request.id} сохранена.`,
      });
      router.refresh();
    } catch (error) {
      setManagementFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Не удалось сохранить AI-заявку.',
      });
    } finally {
      setPendingKey(null);
    }
  }

  const filteredOrders = useMemo(
    () =>
      orderFilter === 'ALL'
        ? initialData.orders
        : initialData.orders.filter((order) => order.status === orderFilter),
    [initialData.orders, orderFilter]
  );
  const filteredManualReviewOrders = useMemo(() => {
    if (!reviewSearchValue) {
      return manualReviewOrders;
    }

    return manualReviewOrders.filter((order) => {
      const haystack = [
        order.userEmail,
        order.userName ?? '',
        order.courseTitle,
        order.tariffTitle,
        order.status,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(reviewSearchValue);
    });
  }, [manualReviewOrders, reviewSearchValue]);
  const filteredJournalOrders = useMemo(() => {
    if (!orderSearchValue) {
      return filteredOrders;
    }

    return filteredOrders.filter((order) => {
      const haystack = [
        order.userEmail,
        order.userName ?? '',
        order.courseTitle,
        order.courseSlug,
        order.tariffTitle,
        order.status,
        order.paymentMethod,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(orderSearchValue);
    });
  }, [filteredOrders, orderSearchValue]);
  const userNameMap = useMemo(() => {
    const map = new Map<number, string>();

    for (const order of initialData.orders) {
      if (order.userName && !map.has(order.userId)) {
        map.set(order.userId, order.userName);
      }
    }

    return map;
  }, [initialData.orders]);
  const userOrderCountMap = useMemo(() => {
    const map = new Map<number, number>();

    for (const order of initialData.orders) {
      map.set(order.userId, (map.get(order.userId) ?? 0) + 1);
    }

    return map;
  }, [initialData.orders]);
  const filteredJournalUsers = useMemo(() => {
    return initialData.users.filter((user) => {
      const haystack = [user.email, user.role, userNameMap.get(user.id) ?? ''].join(' ').toLowerCase();
      const matchesSearch = !userSearchValue || haystack.includes(userSearchValue);
      const matchesFilter =
        userListFilter === 'ALL'
          ? true
          : userListFilter === 'ACTIVE_ORDER'
            ? user.hasPendingOrder
            : userListFilter === 'HAS_ACCESS'
              ? user.accessibleCoursesCount > 0
            : user.role === userListFilter;

      return matchesSearch && matchesFilter;
    });
  }, [initialData.users, userListFilter, userNameMap, userSearchValue]);
  const filteredJournalEnrollments = useMemo(() => {
    return initialData.enrollments.filter((enrollment) => {
      const haystack = [
        enrollment.userEmail,
        enrollment.courseTitle,
        enrollment.courseSlug,
        enrollment.source,
      ]
        .join(' ')
        .toLowerCase();
      const matchesSearch = !accessSearchValue || haystack.includes(accessSearchValue);
      const matchesFilter = accessSourceFilter === 'ALL' ? true : enrollment.source === accessSourceFilter;

      return matchesSearch && matchesFilter;
    });
  }, [accessSearchValue, accessSourceFilter, initialData.enrollments]);
  const filteredContentCourses = useMemo(() => {
    if (!courseSearchValue) {
      return initialData.courses;
    }

    return initialData.courses.filter((course) => {
      const haystack = [course.title, course.slug, course.state, course.groupTitle]
        .join(' ')
        .toLowerCase();
      return haystack.includes(courseSearchValue);
    });
  }, [initialData.courses, courseSearchValue]);

  const selectedCourse = useMemo(
    () => initialData.courses.find((course) => course.id === selectedCourseId) ?? null,
    [initialData.courses, selectedCourseId]
  );

  const orderedLessons = useMemo(() => {
    if (!selectedCourse) {
      return [];
    }

    const lessonMap = new Map(selectedCourse.lessons.map((lesson) => [lesson.id, lesson]));

    return lessonOrder
      .map((lessonId) => lessonMap.get(lessonId) ?? null)
      .filter((lesson): lesson is AdminLessonRow => Boolean(lesson));
  }, [lessonOrder, selectedCourse]);

  const selectedLesson = useMemo(
    () => orderedLessons.find((lesson) => lesson.id === selectedLessonId) ?? null,
    [orderedLessons, selectedLessonId]
  );

  const selectedTariff = useMemo(
    () => selectedCourse?.tariffs.find((tariff) => tariff.id === selectedTariffId) ?? null,
    [selectedCourse, selectedTariffId]
  );
  const selectedUser = useMemo(
    () => initialData.users.find((user) => user.id === selectedUserId) ?? null,
    [initialData.users, selectedUserId]
  );
  const selectedUserOrders = useMemo(
    () => (selectedUser ? initialData.orders.filter((order) => order.userId === selectedUser.id) : []),
    [initialData.orders, selectedUser]
  );
  const selectedUserHasProcessingOrder = useMemo(
    () => selectedUserOrders.some((order) => order.status === 'PROCESSING'),
    [selectedUserOrders]
  );
  const filteredSelectedUserOrders = useMemo(
    () =>
      selectedUserOrderFilter === 'ALL'
        ? selectedUserOrders
        : selectedUserOrders.filter((order) => order.status === selectedUserOrderFilter),
    [selectedUserOrderFilter, selectedUserOrders]
  );
  const selectedUserEnrollments = useMemo(
    () => (selectedUser ? initialData.enrollments.filter((enrollment) => enrollment.userId === selectedUser.id) : []),
    [initialData.enrollments, selectedUser]
  );
  const selectedUserCourses = useMemo(() => {
    const courseMap = new Map(initialData.courses.map((course) => [course.id, course]));
    return selectedUserEnrollments
      .map((enrollment) => courseMap.get(enrollment.courseId) ?? null)
      .filter((course): course is AdminCourseRow => Boolean(course));
  }, [initialData.courses, selectedUserEnrollments]);
  const selectedUserGrantableCourses = useMemo(() => {
    if (!selectedUser) {
      return [];
    }

    const grantedCourseIds = new Set(selectedUserEnrollments.map((enrollment) => enrollment.courseId));
    return initialData.courses.filter((course) => !grantedCourseIds.has(course.id));
  }, [initialData.courses, selectedUser, selectedUserEnrollments]);
  const selectedUserName = selectedUser ? userNameMap.get(selectedUser.id) ?? 'Не указано' : null;
  const selectedOrder = useMemo(
    () => initialData.orders.find((order) => order.id === selectedOrderId) ?? null,
    [initialData.orders, selectedOrderId]
  );
  const selectedOrderUserName = selectedOrder
    ? selectedOrder.userName ?? userNameMap.get(selectedOrder.userId) ?? 'Не указано'
    : null;
  const selectedOrderNeedsManualReview =
    selectedOrder?.paymentMethod === 'MANUAL' && selectedOrder.status === 'PROCESSING';

  const dashboardRecentOrders = useMemo(
    () => initialData.orders.slice(0, 4),
    [initialData.orders]
  );
  const paidOrders = useMemo(
    () => initialData.orders.filter((order) => order.status === 'PAID'),
    [initialData.orders]
  );
  const allTariffs = useMemo(
    () =>
      initialData.courses
        .flatMap((course) =>
          course.tariffs.map((tariff) => ({
            ...tariff,
            courseId: course.id,
            courseTitle: course.title,
            courseSlug: course.slug,
          }))
        )
        .sort(
          (left, right) =>
            Number(right.isActive) - Number(left.isActive) ||
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        ),
    [initialData.courses]
  );
  const latestLessons = useMemo(
    () =>
      initialData.courses
        .flatMap((course) =>
          course.lessons.map((lesson) => ({
            ...lesson,
            courseId: course.id,
            courseTitle: course.title,
            courseSlug: course.slug,
          }))
        )
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        ),
    [initialData.courses]
  );
  const contentLessons = useMemo(
    () =>
      initialData.courses.flatMap((course) =>
        course.lessons.map((lesson) => ({
          ...lesson,
          courseId: course.id,
          courseTitle: course.title,
        }))
      ),
    [initialData.courses]
  );
  const publishedCoursesCount = useMemo(
    () => initialData.courses.filter((course) => course.isPublished).length,
    [initialData.courses]
  );
  const publishedLessonsTotal = useMemo(
    () => initialData.courses.reduce((sum, course) => sum + course.publishedLessonsCount, 0),
    [initialData.courses]
  );
  const previewLessonsTotal = useMemo(
    () => initialData.courses.reduce((sum, course) => sum + course.previewLessonsCount, 0),
    [initialData.courses]
  );
  const activeTariffsCount = useMemo(
    () => allTariffs.filter((tariff) => tariff.isActive).length,
    [allTariffs]
  );
  const processingCount = manualReviewOrders.length;
  const pendingCount = useMemo(
    () => initialData.orders.filter((order) => order.status === 'PENDING').length,
    [initialData.orders]
  );
  const failedCount = useMemo(
    () =>
      initialData.orders.filter(
        (order) => order.status === 'FAILED' || order.status === 'CANCELED' || order.status === 'EXPIRED'
      ).length,
    [initialData.orders]
  );
  const userTrendSeries = useMemo(
    () => buildTrendSeries(initialData.users, (user) => user.createdAt, () => 1, trendPeriod),
    [initialData.users, trendPeriod]
  );
  const orderTrendSeries = useMemo(
    () => buildTrendSeries(initialData.orders, (order) => order.createdAt, () => 1, trendPeriod),
    [initialData.orders, trendPeriod]
  );
  const revenueTrendSeries = useMemo(
    () => buildTrendSeries(paidOrders, (order) => order.updatedAt, (order) => order.amount, trendPeriod),
    [paidOrders, trendPeriod]
  );
  const lessonTrendSeries = useMemo(
    () => buildTrendSeries(contentLessons, (lesson) => lesson.updatedAt, () => 1, trendPeriod),
    [contentLessons, trendPeriod]
  );
  const accessTrendSeries = useMemo(
    () => buildTrendSeries(initialData.enrollments, (enrollment) => enrollment.createdAt, () => 1, trendPeriod),
    [initialData.enrollments, trendPeriod]
  );
  const recentUsersCount = useMemo(
    () => userTrendSeries.reduce((sum, point) => sum + point.value, 0),
    [userTrendSeries]
  );
  const recentOrdersCount = useMemo(
    () => orderTrendSeries.reduce((sum, point) => sum + point.value, 0),
    [orderTrendSeries]
  );
  const recentRevenue = useMemo(
    () => revenueTrendSeries.reduce((sum, point) => sum + point.value, 0),
    [revenueTrendSeries]
  );
  const recentLessonsCount = useMemo(
    () => lessonTrendSeries.reduce((sum, point) => sum + point.value, 0),
    [lessonTrendSeries]
  );
  const recentAccessCount = useMemo(
    () => accessTrendSeries.reduce((sum, point) => sum + point.value, 0),
    [accessTrendSeries]
  );

  const timelineItems = useMemo<ActivityItem[]>(() => {
    const paymentItems = manualReviewOrders.slice(0, 3).map((order) => ({
      action: () => {
        setReviewSearch(order.userEmail);
        handleOpenReviewWorkspace();
      },
      id: `queue-${order.id}`,
      kind: 'review' as const,
      meta: `${order.userEmail} · ${order.courseTitle} · ${formatMoney(order.amount)}`,
      timestamp: order.updatedAt,
      title: 'Оплата на проверке',
      tone: 'warning' as const,
    }));

    const accessItems = initialData.enrollments.slice(0, 4).map((enrollment) => ({
      action: () => handleOpenUserDetail(enrollment.userId),
      id: `timeline-access-${enrollment.id}`,
      kind: 'access' as const,
      meta: `${enrollment.userEmail} · ${enrollment.courseTitle}`,
      timestamp: enrollment.createdAt,
      title: 'Выдан доступ',
      tone: 'accent' as const,
    }));

    const userItems = initialData.users.slice(0, 3).map((user) => ({
      action: () => handleOpenUserDetail(user.id),
      id: `timeline-user-${user.id}`,
      kind: 'user' as const,
      meta: `${user.email} · ${getRoleLabel(user.role)}`,
      timestamp: user.createdAt,
      title: 'Новый пользователь',
      tone: 'success' as const,
    }));

    return [...paymentItems, ...accessItems, ...userItems]
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 5);
  }, [handleOpenReviewWorkspace, handleOpenUserDetail, initialData.enrollments, initialData.users, manualReviewOrders]);
  const kpiCards = useMemo(
    () => [
      {
        key: 'users',
        label: 'Пользователи',
        value: initialData.totals.users,
        note: `+${recentUsersCount} ${TREND_PERIOD_LABELS[trendPeriod].note}`,
        icon: UsersIcon,
        onClick: () => {
          openUsersDrawer('');
        },
      },
      {
        key: 'orders',
        label: 'Заказы',
        value: initialData.totals.orders,
        note: `+${recentOrdersCount} ${TREND_PERIOD_LABELS[trendPeriod].note}`,
        icon: OrdersIcon,
        onClick: () => {
          openOrdersDrawer('ALL');
        },
      },
      {
        key: 'accesses',
        label: 'Доступы',
        value: initialData.totals.enrollments,
        note: `+${recentAccessCount} ${TREND_PERIOD_LABELS[trendPeriod].note}`,
        icon: AccessIcon,
        onClick: () => {
          openAccessesDrawer('', 'ALL');
        },
      },
      {
        key: 'courses',
        label: 'Курсы',
        value: initialData.courses.length,
        note: `${publishedCoursesCount} опубликовано`,
        icon: CoursesIcon,
        onClick: () => {
          setActiveDashboardTab('courses');
          openContentDrawer('admin-courses', { showCourseSelector: false });
        },
      },
      {
        key: 'lessons',
        label: 'Уроки',
        value: initialData.courses.reduce((sum, course) => sum + course.lessonsCount, 0),
        note: `${publishedLessonsTotal} опубликовано`,
        icon: LessonsIcon,
        onClick: () => {
          handleOpenLessonWorkspace();
        },
      },
      {
        key: 'review',
        label: 'На проверке',
        value: processingCount,
        note: manualReviewOrders.length > 0 ? 'требуют решения' : 'очередь пуста',
        icon: ReviewIcon,
        onClick: () => {
          handleOpenReviewWorkspace();
        },
      },
    ],
    [
      handleOpenLessonWorkspace,
      initialData.courses,
      initialData.totals.enrollments,
      initialData.totals.orders,
      initialData.totals.users,
      manualReviewOrders.length,
      openAccessesDrawer,
      openContentDrawer,
      openOrdersDrawer,
      openUsersDrawer,
      processingCount,
      publishedCoursesCount,
      publishedLessonsTotal,
      recentAccessCount,
      recentOrdersCount,
      recentUsersCount,
      trendPeriod,
      handleOpenReviewWorkspace,
    ]
  );
  const dashboardTabs = useMemo(
    () => [
      { key: 'users' as const, label: 'Пользователи', icon: UsersIcon, count: initialData.users.length },
      { key: 'orders' as const, label: 'Заказы', icon: OrdersIcon, count: initialData.orders.length },
      { key: 'courses' as const, label: 'Курсы', icon: CoursesIcon, count: initialData.courses.length },
      {
        key: 'lessons' as const,
        label: 'Уроки',
        icon: LessonsIcon,
        count: initialData.courses.reduce((sum, course) => sum + course.lessonsCount, 0),
      },
      { key: 'tariffs' as const, label: 'Тарифы', icon: TariffIcon, count: allTariffs.length },
      { key: 'accesses' as const, label: 'Доступы', icon: AccessIcon, count: initialData.enrollments.length },
    ],
    [allTariffs.length, initialData.courses, initialData.enrollments.length, initialData.orders.length, initialData.users.length]
  );
  const drawerMeta = useMemo(() => {
    switch (activeAdminDrawer) {
      case 'review':
        return {
          title: 'Проверка оплат',
          description: 'Очередь ручной проверки и подтверждение оплат.',
        };
      case 'content':
        return {
          title: 'Редактор контента',
          description: 'Курсы, уроки и тарифы.',
        };
      case 'orders':
        return {
          title: 'Заказы',
          description: 'Поиск, статусы и очередь проверки.',
        };
      case 'users':
        return {
          title: 'Пользователи',
          description: 'Поиск, роли и карточка пользователя.',
        };
      case 'accesses':
        return {
          title: 'Доступы',
          description: 'Журнал доступов и фильтры по источнику.',
        };
      default:
        return null;
    }
  }, [activeAdminDrawer]);

  const isLessonOrderDirty =
    selectedCourse &&
    selectedCourse.lessons.length === lessonOrder.length &&
    selectedCourse.lessons.some((lesson, index) => lesson.id !== lessonOrder[index]);

  const drawerContextLabel = useMemo(() => {
    switch (activeAdminDrawer) {
      case 'review':
        return manualReviewOrders.length > 0
          ? `Очередь проверки · ${manualReviewOrders.length}`
          : 'Очередь проверки пуста';
      case 'content':
        if (drawerTargetId === 'admin-create-course') {
          return 'Новый курс';
        }

        if (drawerTargetId === 'admin-lessons') {
          return selectedLesson ? `Урок: ${selectedLesson.title}` : 'Редактор уроков';
        }

        if (drawerTargetId === 'admin-tariffs') {
          return selectedTariff ? `Тариф: ${selectedTariff.title}` : 'Редактор тарифов';
        }

        return selectedCourse ? `Курс: ${selectedCourse.title}` : 'Каталог курсов';
      case 'orders':
        return orderFilter === 'ALL' ? 'Журнал заказов' : `Заказы · ${ORDER_FILTER_LABELS[orderFilter]}`;
      case 'users':
        return selectedUser ? `Пользователь: ${selectedUser.email}` : 'Список пользователей';
      case 'accesses':
        return accessSourceFilter === 'ALL' ? 'Журнал доступов' : `Доступы · ${ACCESS_FILTER_LABELS[accessSourceFilter]}`;
      default:
        return null;
    }
  }, [
    accessSourceFilter,
    activeAdminDrawer,
    drawerTargetId,
    manualReviewOrders.length,
    orderFilter,
    selectedCourse,
    selectedLesson,
    selectedTariff,
    selectedUser,
  ]);
  const activeSectionPanel = useMemo<AdminSectionPanel | null>(() => {
    switch (activeDashboardTab) {
      case 'users':
        return {
          title: 'Пользователи',
          subtitle: 'График регистраций, роли и быстрый переход к полному списку.',
          actionLabel: 'Открыть пользователей',
          action: () => openUsersDrawer(''),
          metrics: [
            { label: 'Всего', value: String(initialData.totals.users) },
            { label: 'Админы', value: String(initialData.users.filter((user) => user.role === 'ADMIN').length) },
            { label: 'С заказом', value: String(initialData.users.filter((user) => user.hasPendingOrder).length) },
          ],
          rowsTitle: 'Последние регистрации',
          chart: {
            title: 'Новые регистрации',
            value: String(recentUsersCount),
            note: TREND_PERIOD_LABELS[trendPeriod].note,
            points: userTrendSeries,
            metricLabel: 'Новые пользователи',
            hint: 'Динамика регистрации новых пользователей по выбранному периоду.',
            tone: 'success',
          },
          rows: initialData.users.slice(0, 5).map((user) => ({
            id: `user-${user.id}`,
            title: user.email,
            subtitle: `${formatShortDate(user.createdAt)} · ${user.accessibleCoursesCount} доступа`,
            meta: user.hasPendingOrder ? 'Есть заказ' : 'Без заказа',
            badge: getRoleLabel(user.role),
            badgeClass: getBadgeClass(user.role),
            onClick: () => handleOpenUserDetail(user.id),
          })),
          emptyText: 'Пользователи появятся после первой регистрации.',
        };
      case 'orders':
        return {
          title: 'Заказы',
          subtitle: 'Платежи, статусы и вынесенная в отдельный сценарий ручная проверка.',
          actionLabel: 'Открыть заказы',
          action: () => openOrdersDrawer('ALL'),
          metrics: [
            { label: ORDER_FILTER_LABELS.PENDING, value: String(pendingCount) },
            { label: ORDER_FILTER_LABELS.PROCESSING, value: String(processingCount) },
            { label: ORDER_FILTER_LABELS.PAID, value: String(paidOrders.length) },
          ],
          rowsTitle: 'Последние заказы',
          chart: {
            title: 'Новые заказы',
            value: String(recentOrdersCount),
            note: TREND_PERIOD_LABELS[trendPeriod].note,
            points: orderTrendSeries,
            metricLabel: 'Новые заказы',
            hint: 'Новые заказы за выбранный период.',
            tone: 'warning',
          },
          rows: initialData.orders.slice(0, 5).map((order) => ({
            id: `order-${order.id}`,
            title: order.courseTitle,
            subtitle: `${order.userEmail} · ${formatMoney(order.amount)}`,
            meta: `${getPaymentMethodLabel(order.paymentMethod)} · ${formatShortDate(order.updatedAt)}`,
            badge: getOrderStatusLabel(order.status),
            badgeClass: getBadgeClass(order.status),
            onClick: () => {
              if (order.status === 'PROCESSING') {
                setReviewSearch(order.userEmail);
                handleOpenReviewWorkspace();
                return;
              }

              openOrdersDrawer(order.status, order.userEmail);
            },
          })),
          emptyText: 'Заказы появятся после первой оплаты.',
        };
      case 'courses':
        return {
          title: 'Курсы',
          subtitle: 'График обновлений каталога и быстрый вход в редактор.',
          actionLabel: 'Открыть редактор курсов',
          action: () => openContentDrawer('admin-courses', { showCourseSelector: false }),
          metrics: [
            { label: 'Всего', value: String(initialData.courses.length) },
            { label: 'Опубликовано', value: String(publishedCoursesCount) },
            { label: 'Ознакомительные', value: String(previewLessonsTotal) },
          ],
          rowsTitle: 'Курсы в фокусе',
          chart: {
            title: 'Активность каталога',
            value: String(recentLessonsCount),
            note: TREND_PERIOD_LABELS[trendPeriod].note,
            points: lessonTrendSeries,
            metricLabel: 'Обновления контента',
            hint: 'Изменения уроков и контента внутри курсов по выбранному периоду.',
            tone: 'accent',
          },
          rows: initialData.courses.slice(0, 5).map((course) => ({
            id: `course-${course.id}`,
            title: course.title,
            subtitle: `${course.groupTitle} · ${course.lessonsCount} уроков`,
            meta: course.slug,
            badge: getCourseStateLabel(course.state),
            badgeClass: getBadgeClass(course.state),
            onClick: () => jumpToCourseEditor(course.id),
          })),
          emptyText: 'Курсы появятся после создания каталога.',
        };
      case 'lessons':
        return {
          title: 'Уроки',
          subtitle: 'Динамика уроков и быстрый вход в редактор.',
          actionLabel: 'Открыть редактор уроков',
          action: handleOpenLessonWorkspace,
          metrics: [
            { label: 'Всего', value: String(initialData.courses.reduce((sum, course) => sum + course.lessonsCount, 0)) },
            {
              label: 'Опубликовано',
              value: String(publishedLessonsTotal),
            },
            { label: 'Ознакомительные', value: String(previewLessonsTotal) },
          ],
          rowsTitle: 'Последние обновления',
          chart: {
            title: 'Динамика контента',
            value: String(recentLessonsCount),
            note: TREND_PERIOD_LABELS[trendPeriod].note,
            points: lessonTrendSeries,
            metricLabel: 'Обновления уроков',
            hint: 'Изменения уроков и контента по выбранному периоду.',
            tone: 'accent',
          },
          rows: latestLessons.slice(0, 5).map((lesson) => ({
            id: `lesson-${lesson.id}`,
            title: lesson.title,
            subtitle: `${lesson.courseTitle} · ${formatShortDate(lesson.updatedAt)}`,
            meta: lesson.slug,
            badge: getLessonVisibilityLabel(lesson),
            badgeClass: getBadgeClass(lesson.isPreview ? 'preview' : lesson.isPublished ? 'paid' : 'hidden'),
            onClick: () => {
              setSelectedCourseId(lesson.courseId);
              setSelectedLessonId(lesson.id);
              openContentDrawer('admin-lessons', { showCourseSelector: false });
            },
          })),
          emptyText: 'Уроки появятся после создания курса.',
        };
      case 'tariffs':
        return {
          title: 'Тарифы',
          subtitle: 'Сводка по тарифам и переход в редактор.',
          actionLabel: 'Открыть редактор тарифов',
          action: handleOpenTariffWorkspace,
          metrics: [
            { label: 'Всего', value: String(allTariffs.length) },
            { label: 'Активные', value: String(activeTariffsCount) },
            { label: 'Заказов', value: String(initialData.orders.length) },
          ],
          rowsTitle: 'Тарифы в работе',
          chart: {
            title: 'Выручка по оплатам',
            value: formatMoney(recentRevenue),
            note: TREND_PERIOD_LABELS[trendPeriod].note,
            points: revenueTrendSeries,
            metricLabel: 'Выручка',
            hint: 'Оплаченные заказы за выбранный период.',
            tone: 'accent',
            formatValue: formatMoney,
          },
          rows: allTariffs.slice(0, 5).map((tariff) => ({
            id: `tariff-${tariff.id}`,
            title: tariff.title,
            subtitle: `${tariff.courseTitle} · ${formatMoney(tariff.price)}`,
            meta: `${tariff.ordersCount} заказов`,
            badge: tariff.isActive ? 'Активен' : 'Скрыт',
            badgeClass: getBadgeClass(tariff.isActive ? 'paid' : 'hidden'),
            onClick: () => {
              setSelectedCourseId(tariff.courseId);
              setSelectedTariffId(tariff.id);
              openContentDrawer('admin-tariffs', { showCourseSelector: false });
            },
          })),
          emptyText: 'Тарифы появятся после добавления предложений.',
        };
      case 'accesses':
        return {
          title: 'Доступы',
          subtitle: 'Короткая сводка и вход в журнал доступов.',
          actionLabel: 'Открыть доступы',
          action: () => openAccessesDrawer('', 'ALL'),
          metrics: [
            { label: 'Всего', value: String(initialData.totals.enrollments) },
            { label: 'Из заказа', value: String(initialData.enrollments.filter((item) => item.source === 'order').length) },
            { label: 'Бесплатно', value: String(initialData.enrollments.filter((item) => item.source === 'free').length) },
          ],
          rowsTitle: 'Последние доступы',
          chart: {
            title: 'Новые доступы',
            value: String(recentAccessCount),
            note: TREND_PERIOD_LABELS[trendPeriod].note,
            points: accessTrendSeries,
            metricLabel: 'Новые доступы',
            hint: 'Новые выдачи доступа по выбранному периоду.',
            tone: 'accent',
          },
          rows: initialData.enrollments.slice(0, 5).map((enrollment) => ({
            id: `access-${enrollment.id}`,
            title: enrollment.userEmail,
            subtitle: `${enrollment.courseTitle} · ${formatShortDate(enrollment.createdAt)}`,
            meta: enrollment.courseSlug,
            badge: getEnrollmentSourceLabel(enrollment.source),
            badgeClass: getBadgeClass(enrollment.source),
            onClick: () => handleOpenUserDetail(enrollment.userId),
          })),
          emptyText: 'Выданные доступы появятся после первых покупок.',
        };
      case 'dashboard':
      default:
        return null;
    }
  }, [
    activeDashboardTab,
    activeTariffsCount,
    allTariffs,
    accessTrendSeries,
    handleOpenLessonWorkspace,
    handleOpenReviewWorkspace,
    handleOpenTariffWorkspace,
    handleOpenUserDetail,
    initialData.courses,
    initialData.enrollments,
    initialData.orders,
    initialData.totals.enrollments,
    initialData.totals.users,
    initialData.users,
    jumpToCourseEditor,
    lessonTrendSeries,
    latestLessons,
    openAccessesDrawer,
    openContentDrawer,
    openOrdersDrawer,
    openUsersDrawer,
    paidOrders.length,
    pendingCount,
    previewLessonsTotal,
    publishedLessonsTotal,
    processingCount,
    publishedCoursesCount,
    recentAccessCount,
    recentLessonsCount,
    recentOrdersCount,
    recentRevenue,
    recentUsersCount,
    revenueTrendSeries,
    trendPeriod,
    orderTrendSeries,
    userTrendSeries,
  ]);
  const isDashboardHome = activeDashboardTab === 'dashboard';
  const showTrendPeriodSwitch = isDashboardHome || Boolean(activeSectionPanel?.chart);
  const pageTitle =
    isDashboardHome ? 'Управление платформой' : activeSectionPanel?.title ?? 'Управление платформой';
  const surfaceTitle = pageTitle;
  const surfaceDescription = isDashboardHome
    ? 'Единый центр управления курсами, уроками, тарифами, заказами и доступами без лишних экранов.'
    : activeSectionPanel?.subtitle ?? 'Рабочая область администратора.';
  const isContentDrawerFocused =
    activeAdminDrawer === 'content' &&
    Boolean(selectedCourse) &&
    !isContentSidebarOpen &&
    drawerTargetId !== 'admin-create-course';

  useEffect(() => {
    if (!selectedCourseId || !initialData.courses.some((course) => course.id === selectedCourseId)) {
      setSelectedCourseId(initialData.courses[0]?.id ?? null);
    }
  }, [initialData.courses, selectedCourseId]);

  useEffect(() => {
    if (!selectedCourse) {
      setCourseDraft(null);
      setLessonOrder([]);
      setSelectedLessonId(null);
      setLessonDraft(null);
      setSelectedTariffId(null);
      setTariffDraft(null);
      return;
    }

    setCourseDraft(toCourseDraft(selectedCourse));
    setLessonOrder(selectedCourse.lessons.map((lesson) => lesson.id));
    setSelectedLessonId((current) =>
      current && selectedCourse.lessons.some((lesson) => lesson.id === current)
        ? current
        : selectedCourse.lessons[0]?.id ?? null
    );
    setSelectedTariffId((current) =>
      current && selectedCourse.tariffs.some((tariff) => tariff.id === current)
        ? current
        : selectedCourse.tariffs[0]?.id ?? null
    );
  }, [selectedCourse]);

  useEffect(() => {
    setLessonDraft(selectedLesson ? toLessonDraft(selectedLesson) : null);
  }, [selectedLesson]);

  useEffect(() => {
    setTariffDraft(selectedTariff ? toTariffDraft(selectedTariff) : null);
  }, [selectedTariff]);

  useEffect(() => {
    if (!selectedCourse) {
      setIsContentSidebarOpen(true);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (!selectedUser) {
      setSelectedGrantCourseId(null);
      return;
    }

    if (
      selectedGrantCourseId &&
      selectedUserGrantableCourses.some((course) => course.id === selectedGrantCourseId)
    ) {
      return;
    }

    setSelectedGrantCourseId(selectedUserGrantableCourses[0]?.id ?? null);
  }, [selectedGrantCourseId, selectedUser, selectedUserGrantableCourses]);

  useEffect(() => {
    if (!accessGrantUserId || initialData.users.some((item) => item.id === accessGrantUserId)) {
      return;
    }

    setAccessGrantUserId(initialData.users[0]?.id ?? null);
  }, [accessGrantUserId, initialData.users]);

  useEffect(() => {
    if (!accessGrantCourseId || initialData.courses.some((item) => item.id === accessGrantCourseId)) {
      return;
    }

    setAccessGrantCourseId(
      initialData.courses.find((course) => course.hasActiveTariff)?.id ?? initialData.courses[0]?.id ?? null
    );
  }, [accessGrantCourseId, initialData.courses]);

  useEffect(() => {
    if (!activeAdminDrawer) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeAdminDrawer]);

  useEffect(() => {
    if (!activeAdminDrawer) {
      return;
    }

    setIsBellDropdownOpen(false);
  }, [activeAdminDrawer]);

  useEffect(() => {
    if (!activeAdminDrawer) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) {
        return;
      }

      event.preventDefault();
      closeAdminDrawer();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAdminDrawer]);

  useEffect(() => {
    if (!isBellDropdownOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (bellDropdownRef.current?.contains(target)) {
        return;
      }

      setIsBellDropdownOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) {
        return;
      }

      event.preventDefault();
      setIsBellDropdownOpen(false);
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBellDropdownOpen]);

  useEffect(() => {
    if (!activeAdminDrawer || !drawerTargetId) {
      return;
    }

    const handle = requestAnimationFrame(() => {
      const target = document.getElementById(drawerTargetId);
      target?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => cancelAnimationFrame(handle);
  }, [activeAdminDrawer, drawerTargetId, selectedCourseId, selectedLessonId, selectedTariffId]);

  function openAdminDrawer(drawer: Exclude<AdminDrawerKey, null>, targetId?: string) {
    setIsBellDropdownOpen(false);
    setActiveAdminDrawer(drawer);
    setDrawerTargetId(targetId ?? null);
  }

  function openOrdersDrawer(status: OrderStatusFilter = 'ALL', search = '') {
    setActiveDashboardTab('orders');
    setOrderFilter(status);
    setOrderSearch(search);
    openAdminDrawer('orders', 'admin-orders');
  }

  function openUsersDrawer(search = '', options?: { preserveSelection?: boolean }) {
    setActiveDashboardTab('users');
    setUserSearch(search);
    setUserListFilter('ALL');
    if (!options?.preserveSelection) {
      setSelectedUserId(null);
      setSelectedUserOrderFilter('ALL');
    }
    openAdminDrawer('users', 'admin-users');
  }

  function openAccessesDrawer(
    search = '',
    filter: AccessSourceFilter = 'ALL',
    options?: { mode?: 'journal' | 'grant' }
  ) {
    setActiveDashboardTab('accesses');
    setAccessSearch(search);
    setAccessSourceFilter(filter);
    setAccessWorkspaceMode(options?.mode ?? 'journal');
    openAdminDrawer('accesses', options?.mode === 'grant' ? 'admin-access-grant' : 'admin-accesses-table');
  }

  function closeAdminDrawer() {
    setActiveAdminDrawer(null);
    setDrawerTargetId(null);
  }

  function openContentDrawer(targetId?: string, options?: { showCourseSelector?: boolean }) {
    setIsContentSidebarOpen(options?.showCourseSelector ?? !selectedCourse);
    openAdminDrawer('content', targetId);
  }

  function toggleBellDropdown() {
    setIsBellDropdownOpen((current) => !current);
  }

  function runManagementAction(
    actionKey: string,
    request: () => Promise<AdminMutationResult>,
    options?: {
      onSuccess?: () => void;
    }
  ) {
    setManagementFeedback(null);
    setPendingManagementKey(actionKey);

    startManagementTransition(() => {
      void request()
        .then((result) => {
          setManagementFeedback({
            tone: result.ok ? 'success' : 'error',
            message: result.message,
          });

          if (result.ok) {
            options?.onSuccess?.();
            router.refresh();
          }
        })
        .catch((error) => {
          setManagementFeedback({
            tone: 'error',
            message: error instanceof Error ? error.message : 'Не удалось выполнить действие администратора.',
          });
        })
        .finally(() => {
          setPendingManagementKey((current) => (current === actionKey ? null : current));
        });
    });
  }

  function jumpToCourseEditor(courseId: number) {
    setSelectedCourseId(courseId);
    setIsContentSidebarOpen(false);
    openContentDrawer(`admin-course-${courseId}`, { showCourseSelector: false });
  }

  function handleSelectCourse(courseId: number) {
    setSelectedCourseId(courseId);
    setIsContentSidebarOpen(false);
  }

  function handleOpenUserDetail(userId: number, options?: { openDrawer?: boolean }) {
    setSelectedUserId(userId);
    setSelectedUserOrderFilter('ALL');
    if (options?.openDrawer === false) {
      return;
    }
    openUsersDrawer('', { preserveSelection: true });
  }

  function handleSelectOrder(orderId: number, options?: { openDrawer?: boolean; search?: string; filter?: OrderStatusFilter }) {
    setSelectedOrderId(orderId);
    setActiveDashboardTab('orders');

    if (options?.search !== undefined) {
      setOrderSearch(options.search);
    }

    if (options?.filter) {
      setOrderFilter(options.filter);
    }

    if (options?.openDrawer) {
      openAdminDrawer('orders', 'admin-orders');
    }
  }

  function handleOpenOrdersForUser(userEmail: string, status: OrderStatusFilter = 'ALL') {
    openOrdersDrawer(status, userEmail);
  }

  function handleOpenAccessesForUser(userEmail: string) {
    openAccessesDrawer(userEmail);
  }

  function handleOpenReviewForUser(userEmail: string) {
    setReviewSearch(userEmail);
    handleOpenReviewWorkspace();
  }

  function handleToggleUserRole() {
    if (!selectedUser) {
      return;
    }

    const nextRole = selectedUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
    const confirmed = window.confirm(
      nextRole === 'ADMIN'
        ? `Выдать роль администратора пользователю ${selectedUser.email}?`
        : `Снять роль администратора у пользователя ${selectedUser.email}?`
    );

    if (!confirmed) {
      return;
    }

    runManagementAction(`toggle-role-${selectedUser.id}`, () =>
      adminActions.setUserRoleAction({
        role: nextRole,
        userId: selectedUser.id,
      })
    );
  }

  function handleDeleteSelectedUser() {
    if (!selectedUser) {
      return;
    }

    const confirmed = window.confirm(
      `Удалить пользователя ${selectedUser.email}? Удаление будет выполнено только если у него нет заказов, доступов и прогресса.`
    );

    if (!confirmed) {
      return;
    }

    runManagementAction(`delete-user-${selectedUser.id}`, () => adminActions.deleteUserAction({ userId: selectedUser.id }), {
      onSuccess: () => {
        setSelectedUserId(null);
        setSelectedUserOrderFilter('ALL');
      },
    });
  }

  function handleGrantAccessToSelectedUser() {
    if (!selectedUser || !selectedGrantCourseId) {
      return;
    }

    runManagementAction(`grant-access-user-${selectedUser.id}`, () =>
      adminActions.grantCourseAccessAction({
        courseId: selectedGrantCourseId,
        userId: selectedUser.id,
      })
    );
  }

  function handleGrantAccessFromWorkspace() {
    if (!accessGrantUserId || !accessGrantCourseId) {
      return;
    }

    runManagementAction(`grant-access-workspace-${accessGrantUserId}-${accessGrantCourseId}`, () =>
      adminActions.grantCourseAccessAction({
        courseId: accessGrantCourseId,
        userId: accessGrantUserId,
      })
    );
  }

  function handleRevokeEnrollment(enrollment: AdminEnrollmentRow) {
    if (enrollment.source !== 'free') {
      setManagementFeedback({
        tone: 'error',
        message: 'Доступ из оплаченного заказа нельзя отзывать из админки без изменения логики оплат.',
      });
      return;
    }

    const confirmed = window.confirm(
      `Отозвать доступ ${enrollment.userEmail} к курсу «${enrollment.courseTitle}»?`
    );

    if (!confirmed) {
      return;
    }

    runManagementAction(`revoke-access-${enrollment.id}`, () =>
      adminActions.revokeCourseAccessAction({
        enrollmentId: enrollment.id,
      })
    );
  }

  function handleOpenCreateCourse() {
    setActiveDashboardTab('courses');
    openContentDrawer('admin-create-course', { showCourseSelector: true });
  }

  function handleOpenLessonWorkspace() {
    setActiveDashboardTab('lessons');
    const fallbackCourseId = selectedCourse?.id ?? initialData.courses[0]?.id ?? null;

    if (!selectedCourse && fallbackCourseId) {
      setSelectedCourseId(fallbackCourseId);
    }

    openContentDrawer(fallbackCourseId ? 'admin-lessons' : 'admin-courses', {
      showCourseSelector: !fallbackCourseId,
    });
  }

  function handleOpenTariffWorkspace() {
    setActiveDashboardTab('tariffs');
    const fallbackCourseId = selectedCourse?.id ?? initialData.courses[0]?.id ?? null;

    if (!selectedCourse && fallbackCourseId) {
      setSelectedCourseId(fallbackCourseId);
    }

    openContentDrawer(fallbackCourseId ? 'admin-tariffs' : 'admin-courses', {
      showCourseSelector: !fallbackCourseId,
    });
  }

  function handleOpenAccessWorkspace() {
    openAccessesDrawer('', 'ALL', { mode: 'grant' });
  }

  function handleOpenReviewWorkspace() {
    setActiveDashboardTab('orders');
    openAdminDrawer('review', 'manual-review');
  }

  function handleActivateDashboardTab(tab: AdminDashboardTab) {
    closeAdminDrawer();
    setActiveDashboardTab(tab);

    if (tab === 'accesses') {
      setAccessWorkspaceMode('journal');
    }

    if (tab === 'users' || tab === 'orders' || tab === 'accesses') {
      setMobileAdminPanel(tab);
    }
  }

  const scrollToAdminSection = useEffectEvent((sectionId: string) => {
    const drawerBySectionId: Record<string, Exclude<AdminDrawerKey, null>> = {
      'admin-guide': 'review',
      'manual-review': 'review',
      'admin-courses': 'content',
      'admin-create-course': 'content',
      'admin-lessons': 'content',
      'admin-tariffs': 'content',
      'admin-orders': 'orders',
      'admin-users': 'users',
      'admin-accesses-table': 'accesses',
    };

    const drawer = drawerBySectionId[sectionId];

    if (drawer) {
      if (drawer === 'content') {
        openContentDrawer(sectionId, {
          showCourseSelector:
            sectionId === 'admin-courses' ||
            sectionId === 'admin-create-course' ||
            !selectedCourse,
        });
        return;
      }

      openAdminDrawer(drawer, sectionId);
      return;
    }

    requestAnimationFrame(() => {
      const target = document.getElementById(sectionId);

      if (!target) {
        return;
      }

      const disclosure = target.closest('details') as HTMLDetailsElement | null;

      if (disclosure && !disclosure.open) {
        disclosure.open = true;
      }

      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  });

  useEffect(() => {
    function handleHashNavigation() {
      const sectionId = window.location.hash.replace(/^#/, '');

      if (!sectionId || sectionId === 'admin-overview') {
        return;
      }

      scrollToAdminSection(sectionId);
    }

    handleHashNavigation();
    window.addEventListener('hashchange', handleHashNavigation);

    return () => {
      window.removeEventListener('hashchange', handleHashNavigation);
    };
  }, []);

  async function handleCreateCourse() {
    setPendingKey('create-course');
    setCourseFeedback(null);

    try {
      const payload = await requestJson<{ course: { id: number } }>(
        '/api/admin/courses',
        {
          method: 'POST',
          body: JSON.stringify({
            title: createCourseDraft.title,
            slug: createCourseDraft.slug,
            description: createCourseDraft.description,
            isPublished: createCourseDraft.isPublished,
          }),
        },
        'Не удалось создать курс.'
      );

      setSelectedCourseId(payload.course.id);
      setCreateCourseDraft(emptyCreateCourseDraft);
      setCourseFeedback({
        tone: 'success',
        message: 'Курс создан. Теперь можно добавить уроки и тарифы.',
      });
      router.refresh();
    } catch (error) {
      setCourseFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Не удалось создать курс.',
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function handleSaveCourse() {
    if (!selectedCourse || !courseDraft) {
      return;
    }

    setPendingKey('save-course');
    setCourseFeedback(null);

    try {
      await requestJson(
        `/api/admin/courses/${selectedCourse.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(courseDraft),
        },
        'Не удалось сохранить курс.'
      );

      setCourseFeedback({
        tone: 'success',
        message: 'Изменения курса сохранены.',
      });
      router.refresh();
    } catch (error) {
      setCourseFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Не удалось сохранить курс.',
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function handleCreateLesson() {
    if (!selectedCourse) {
      return;
    }

    setPendingKey('create-lesson');
    setLessonFeedback(null);

    try {
      const payload = await requestJson<{ lessonId: number }>(
        `/api/admin/courses/${selectedCourse.id}/lessons`,
        {
          method: 'POST',
          body: JSON.stringify(createLessonDraft),
        },
        'Не удалось добавить урок.'
      );

      setSelectedLessonId(payload.lessonId);
      setCreateLessonDraft(emptyCreateLessonDraft);
      setLessonFeedback({
        tone: 'success',
        message: 'Урок добавлен.',
      });
      router.refresh();
    } catch (error) {
      setLessonFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Не удалось добавить урок.',
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function handleSaveLesson() {
    if (!selectedLesson || !lessonDraft) {
      return;
    }

    setPendingKey('save-lesson');
    setLessonFeedback(null);

    try {
      await requestJson(
        `/api/admin/lessons/${selectedLesson.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(lessonDraft),
        },
        'Не удалось сохранить урок.'
      );

      setLessonFeedback({
        tone: 'success',
        message: 'Урок обновлен.',
      });
      router.refresh();
    } catch (error) {
      setLessonFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Не удалось сохранить урок.',
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function handleDeleteLesson(lesson: AdminLessonRow) {
    if (!selectedCourse) {
      return;
    }

    const confirmed = window.confirm(
      `Удалить урок «${lesson.title}»? Это удалит и связанный прогресс по нему.`
    );

    if (!confirmed) {
      return;
    }

    setPendingKey(`delete-lesson-${lesson.id}`);
    setLessonFeedback(null);

    try {
      await requestJson(
        `/api/admin/lessons/${lesson.id}`,
        {
          method: 'DELETE',
        },
        'Не удалось удалить урок.'
      );

      setSelectedLessonId((current) =>
        current === lesson.id
          ? selectedCourse.lessons.find((item) => item.id !== lesson.id)?.id ?? null
          : current
      );
      setLessonFeedback({
        tone: 'success',
        message: 'Урок удален.',
      });
      router.refresh();
    } catch (error) {
      setLessonFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Не удалось удалить урок.',
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function handleSaveLessonOrder() {
    if (!selectedCourse) {
      return;
    }

    setPendingKey('save-lesson-order');
    setLessonFeedback(null);

    try {
      await requestJson(
        `/api/admin/courses/${selectedCourse.id}/lessons/order`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            lessonIds: lessonOrder,
          }),
        },
        'Не удалось сохранить порядок уроков.'
      );

      setLessonFeedback({
        tone: 'success',
        message: 'Порядок уроков сохранен.',
      });
      router.refresh();
    } catch (error) {
      setLessonFeedback({
        tone: 'error',
        message:
          error instanceof Error ? error.message : 'Не удалось сохранить порядок уроков.',
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function handleCreateTariff() {
    if (!selectedCourse) {
      return;
    }

    setPendingKey('create-tariff');
    setTariffFeedback(null);

    try {
      const payload = await requestJson<{ tariffId: number }>(
        '/api/admin/tariffs',
        {
          method: 'POST',
          body: JSON.stringify({
            courseId: selectedCourse.id,
            title: createTariffDraft.title,
            slug: createTariffDraft.slug,
            price: Number(createTariffDraft.price),
            interval: createTariffDraft.interval,
            isActive: createTariffDraft.isActive,
          }),
        },
        'Не удалось создать тариф.'
      );

      setSelectedTariffId(payload.tariffId);
      setCreateTariffDraft(emptyCreateTariffDraft);
      setTariffFeedback({
        tone: 'success',
        message: 'Тариф создан.',
      });
      router.refresh();
    } catch (error) {
      setTariffFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Не удалось создать тариф.',
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function handleSaveTariff() {
    if (!selectedTariff || !tariffDraft) {
      return;
    }

    setPendingKey('save-tariff');
    setTariffFeedback(null);

    try {
      await requestJson(
        `/api/admin/tariffs/${selectedTariff.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            title: tariffDraft.title,
            price: Number(tariffDraft.price),
            interval: tariffDraft.interval,
            isActive: tariffDraft.isActive,
          }),
        },
        'Не удалось сохранить тариф.'
      );

      setTariffFeedback({
        tone: 'success',
        message: 'Тариф обновлен.',
      });
      router.refresh();
    } catch (error) {
      setTariffFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Не удалось сохранить тариф.',
      });
    } finally {
      setPendingKey(null);
    }
  }

  function moveLesson(lessonId: number, direction: 'up' | 'down') {
    setLessonOrder((currentOrder) => {
      const index = currentOrder.indexOf(lessonId);

      if (index === -1) {
        return currentOrder;
      }

      const nextIndex = direction === 'up' ? index - 1 : index + 1;

      if (nextIndex < 0 || nextIndex >= currentOrder.length) {
        return currentOrder;
      }

      const nextOrder = [...currentOrder];
      const [lesson] = nextOrder.splice(index, 1);
      nextOrder.splice(nextIndex, 0, lesson);

      return nextOrder;
    });
  }

  const userManagementDetailCard = selectedUser ? (
    <article className="panel admin-user-detail" id={`admin-user-detail-${selectedUser.id}`}>
      <div className="admin-user-detail__head">
        <div className="admin-user-detail__copy">
          <span className="eyebrow">Карточка пользователя</span>
          <h3>{selectedUser.email}</h3>
          <p>
            {selectedUserName} · {formatDate(selectedUser.createdAt)}
          </p>
        </div>
        <div className="admin-user-detail__head-meta">
          <span className={getBadgeClass(selectedUser.role)}>{getRoleLabel(selectedUser.role)}</span>
          <span className={getBadgeClass(selectedUserHasProcessingOrder ? 'PROCESSING' : 'paid')}>
            {selectedUserHasProcessingOrder ? 'Есть ручная проверка' : 'Без ручной проверки'}
          </span>
          <button className="ghost-button" onClick={() => setSelectedUserId(null)} type="button">
            Скрыть карточку
          </button>
        </div>
      </div>

      <div className="admin-user-detail__summary">
        <section className="admin-user-detail__summary-card">
          <span className="eyebrow">Контакты</span>
          <strong>{selectedUserName}</strong>
          <span className="mono">{selectedUser.email}</span>
          <p className="muted-text">Регистрация: {formatDate(selectedUser.createdAt)}</p>
        </section>
        <section className="admin-user-detail__summary-card">
          <span className="eyebrow">Доступы</span>
          <strong>{selectedUser.accessibleCoursesCount} активных курсов</strong>
          <span>{selectedUserEnrollments.length} записей в журнале</span>
          <p className="muted-text">
            {selectedUserGrantableCourses.length > 0
              ? `Доступно для ручной выдачи: ${selectedUserGrantableCourses.length}.`
              : 'Новых курсов для ручной выдачи нет.'}
          </p>
        </section>
        <section className="admin-user-detail__summary-card">
          <span className="eyebrow">Заказы</span>
          <strong>{selectedUserOrders.length} всего</strong>
          <span>{selectedUser.hasPendingOrder ? 'Есть активный заказ' : 'Без активного заказа'}</span>
          <p className="muted-text">
            {selectedUserHasProcessingOrder ? 'Есть заказ в ручной проверке.' : 'Ручная проверка не требуется.'}
          </p>
        </section>
      </div>

      <div className="admin-user-detail__action-groups">
        <section className="admin-user-detail__card admin-user-detail__card--actions admin-user-detail__card--wide">
          <div className="admin-user-detail__card-head">
            <div>
              <strong>Основные действия</strong>
              <span className="muted-text">Переходы к заказам, доступам и проверке оплаты.</span>
            </div>
          </div>
          <div className="admin-user-detail__action-grid">
            <button className="secondary-button" onClick={() => handleOpenOrdersForUser(selectedUser.email)} type="button">
              Открыть заказы
            </button>
            <button className="ghost-button" onClick={() => handleOpenAccessesForUser(selectedUser.email)} type="button">
              Открыть доступы
            </button>
            {selectedUserHasProcessingOrder ? (
              <button className="ghost-button" onClick={() => handleOpenReviewForUser(selectedUser.email)} type="button">
                Проверить оплату
              </button>
            ) : null}
          </div>
        </section>

        <section className="admin-user-detail__card admin-user-detail__card--grant">
          <div className="admin-user-detail__card-head">
            <div>
              <strong>Доступы</strong>
              <span className="muted-text">
                {selectedUserGrantableCourses.length > 0 ? 'Можно открыть курс вручную.' : 'Новых курсов для выдачи нет.'}
              </span>
            </div>
          </div>
          <AdminCompactSelect
            ariaLabel="Выбрать курс для ручного доступа"
            disabled={selectedUserGrantableCourses.length === 0}
            emptyText="Нет доступных курсов"
            onChange={(nextValue) => setSelectedGrantCourseId(Number(nextValue))}
            options={selectedUserGrantableCourses.map((course) => ({
              value: course.id,
              label: course.title,
              meta: course.slug,
              badge: getCourseStateLabel(course.state),
              badgeClass: getBadgeClass(course.state),
              searchText: `${course.title} ${course.slug} ${course.groupTitle}`,
            }))}
            placeholder="Выберите курс"
            searchPlaceholder="Найти курс"
            value={selectedGrantCourseId}
          />
          <div className="admin-user-detail__action-grid">
            <button
              className="primary-button"
              disabled={
                selectedUserGrantableCourses.length === 0 ||
                pendingManagementKey === `grant-access-user-${selectedUser.id}` ||
                isManagementPending
              }
              onClick={handleGrantAccessToSelectedUser}
              type="button"
            >
              {pendingManagementKey === `grant-access-user-${selectedUser.id}` ? 'Выдаём доступ...' : 'Выдать доступ'}
            </button>
            <button className="ghost-button" onClick={() => handleOpenAccessesForUser(selectedUser.email)} type="button">
              Журнал доступов
            </button>
          </div>
        </section>

        <section className="admin-user-detail__card">
          <div className="admin-user-detail__card-head">
            <div>
              <strong>Роли и ограничения</strong>
              <span className="muted-text">Смена роли доступна, блокировка пока зависит от schema.</span>
            </div>
            <AdminHint label="Почему блокировка недоступна">
              Для блокировки нужен отдельный флаг в модели User. В текущей schema такого поля нет.
            </AdminHint>
          </div>
          <div className="admin-user-detail__action-grid">
            <button
              className="secondary-button"
              disabled={pendingManagementKey === `toggle-role-${selectedUser.id}` || isManagementPending}
              onClick={handleToggleUserRole}
              type="button"
            >
              {pendingManagementKey === `toggle-role-${selectedUser.id}`
                ? 'Сохраняем роль...'
                : selectedUser.role === 'ADMIN'
                  ? 'Снять администратора'
                  : 'Сделать администратором'}
            </button>
            <div className="admin-user-detail__action-with-hint">
              <button className="ghost-button" disabled type="button">
                Заблокировать
              </button>
              <AdminHint label="Почему блокировка недоступна">
                Блокировка не поддержана без отдельного поля в schema и server action для смены статуса.
              </AdminHint>
            </div>
          </div>
          <p className="admin-management-note admin-management-note--tight">
            {selectedUser.id === adminUserId
              ? 'Для текущего администратора запрещены самодемотирование и самоудаление.'
              : 'Смена роли применяется сразу, но полноценная блокировка требует отдельной backend-задачи.'}
          </p>
        </section>

        <section className="admin-user-detail__card admin-user-detail__card--danger">
          <div className="admin-user-detail__card-head">
            <div>
              <strong>Опасная зона</strong>
              <span className="muted-text">Удаление доступно только для пустой учётной записи.</span>
            </div>
            <AdminHint label="Когда можно удалить пользователя">
              Удаление разрешено только если у пользователя нет заказов, доступов, прогресса и других связанных данных.
            </AdminHint>
          </div>
          <div className="admin-user-detail__action-grid admin-user-detail__action-grid--single">
            <button
              className="ghost-button admin-danger-button"
              disabled={pendingManagementKey === `delete-user-${selectedUser.id}` || isManagementPending}
              onClick={handleDeleteSelectedUser}
              type="button"
            >
              {pendingManagementKey === `delete-user-${selectedUser.id}` ? 'Проверяем удаление...' : 'Удалить пользователя'}
            </button>
          </div>
        </section>
      </div>

      {managementFeedback ? (
        <p
          className={`feedback ${
            managementFeedback.tone === 'success' ? 'feedback-success' : 'feedback-error'
          }`}
        >
          {managementFeedback.message}
        </p>
      ) : null}

      <div className="admin-user-detail__stats">
        <div className="admin-inline-stat">
          <span>Имя</span>
          <strong>{selectedUserName}</strong>
        </div>
        <div className="admin-inline-stat">
          <span>Роль</span>
          <strong>{getRoleLabel(selectedUser.role)}</strong>
        </div>
        <div className="admin-inline-stat">
          <span>Регистрация</span>
          <strong>{formatShortDate(selectedUser.createdAt)}</strong>
        </div>
        <div className="admin-inline-stat">
          <span>Доступные курсы</span>
          <strong>{selectedUser.accessibleCoursesCount}</strong>
        </div>
        <div className="admin-inline-stat">
          <span>Заказов</span>
          <strong>{selectedUserOrders.length}</strong>
        </div>
        <div className="admin-inline-stat">
          <span>Активный заказ</span>
          <strong>{selectedUser.hasPendingOrder ? 'Есть' : 'Нет'}</strong>
        </div>
        <div className="admin-inline-stat">
          <span>Доступов</span>
          <strong>{selectedUserEnrollments.length}</strong>
        </div>
      </div>

      <div className="admin-user-detail__grid">
        <section className="admin-user-detail__card">
          <div className="admin-user-detail__card-head">
            <strong>Курсы пользователя</strong>
            <span className="muted-text">{selectedUserCourses.length} в доступе</span>
          </div>
          <div className="admin-user-detail__chips">
            {selectedUserCourses.length > 0 ? (
              selectedUserCourses.slice(0, 6).map((course) => (
                <button
                  className="admin-status-pill"
                  key={course.id}
                  onClick={() => jumpToCourseEditor(course.id)}
                  type="button"
                >
                  <span>{course.title}</span>
                </button>
              ))
            ) : (
              <p className="muted-text" style={{ margin: 0 }}>
                Нет активных доступов.
              </p>
            )}
          </div>
        </section>

        <section className="admin-user-detail__card">
          <div className="admin-user-detail__card-head">
            <strong>Последние доступы</strong>
            <span className="muted-text">{selectedUserEnrollments.length}</span>
          </div>
          <div className="admin-management-list--full">
            {selectedUserEnrollments.length > 0 ? (
              selectedUserEnrollments.slice(0, 4).map((enrollment) => (
                <div className="admin-access-row" key={enrollment.id}>
                  <div className="admin-access-row__copy">
                    <strong>{enrollment.courseTitle}</strong>
                    <p>
                      {enrollment.courseSlug} · {formatShortDate(enrollment.createdAt)}
                    </p>
                  </div>
                  <div className="admin-access-row__meta">
                    <span className={getBadgeClass(enrollment.source)}>{getEnrollmentSourceLabel(enrollment.source)}</span>
                  </div>
                  <div className="admin-access-row__actions">
                    <button className="ghost-button" onClick={() => jumpToCourseEditor(enrollment.courseId)} type="button">
                      Курс
                    </button>
                    {enrollment.source === 'free' ? (
                      <button
                        className="ghost-button"
                        disabled={pendingManagementKey === `revoke-access-${enrollment.id}` || isManagementPending}
                        onClick={() => handleRevokeEnrollment(enrollment)}
                        type="button"
                      >
                        {pendingManagementKey === `revoke-access-${enrollment.id}` ? 'Отзываем...' : 'Отозвать'}
                      </button>
                    ) : (
                      <>
                        <button className="ghost-button" disabled type="button">
                          Отозвать
                        </button>
                        <AdminHint label="Почему отзыв недоступен">
                          Оплаченные доступы остаются под защитой текущей логики оплат и LMS. Из админки можно отзывать только
                          free-доступы без заказа.
                        </AdminHint>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="muted-text" style={{ margin: 0 }}>
                Доступов пока нет.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="admin-user-detail__card admin-user-detail__card--orders">
        <div className="admin-user-detail__card-head">
          <div>
            <strong>Заказы пользователя</strong>
          </div>
          <div className="admin-filter-row">
            {ORDER_STATUS_FILTERS.map((status) => (
              <button
                key={status}
                aria-pressed={selectedUserOrderFilter === status}
                className={`catalog-directory__filter-pill ${
                  selectedUserOrderFilter === status ? 'catalog-directory__filter-pill--active' : ''
                }`}
                onClick={() => setSelectedUserOrderFilter(status)}
                type="button"
              >
                {ORDER_FILTER_LABELS[status]}
              </button>
            ))}
          </div>
        </div>
        <div className="admin-user-detail__orders">
          {filteredSelectedUserOrders.length > 0 ? (
            filteredSelectedUserOrders.map((order) => (
              <button
                className="admin-workbench-row admin-workbench-row--button"
                key={order.id}
                onClick={() =>
                  handleSelectOrder(order.id, {
                    filter: 'ALL',
                    openDrawer: false,
                    search: selectedUser.email,
                  })
                }
                type="button"
              >
                <div className="admin-workbench-row__copy">
                  <strong>{order.courseTitle}</strong>
                  <p>
                    {order.tariffTitle} · {formatMoney(order.amount)}
                  </p>
                </div>
                <div className="admin-workbench-row__meta">
                  <span className="mono">
                    {formatShortDate(order.updatedAt)}
                  </span>
                  <span className={getBadgeClass(order.status)}>{getOrderStatusLabel(order.status)}</span>
                </div>
              </button>
            ))
          ) : (
            <p className="muted-text" style={{ margin: 0 }}>
              Для выбранного фильтра заказов нет.
            </p>
          )}
        </div>
      </section>
    </article>
  ) : null;

  const orderDetailCard = selectedOrder ? (
    <article className="panel admin-user-detail admin-order-detail" id={`admin-order-detail-${selectedOrder.id}`}>
      <div className="admin-user-detail__head">
        <div className="admin-user-detail__copy">
          <span className="eyebrow">Карточка заказа</span>
          <h3>{selectedOrder.courseTitle}</h3>
          <p>
            {selectedOrder.userEmail} · {formatMoney(selectedOrder.amount)}
          </p>
        </div>
        <div className="admin-user-detail__actions">
          <span className={getBadgeClass(selectedOrder.status)}>{getOrderStatusLabel(selectedOrder.status)}</span>
          <button className="ghost-button" onClick={() => handleOpenUserDetail(selectedOrder.userId)} type="button">
            Открыть пользователя
          </button>
          <button className="ghost-button" onClick={() => jumpToCourseEditor(selectedOrder.courseId)} type="button">
            Открыть курс
          </button>
          <button className="ghost-button" onClick={() => handleOpenOrdersForUser(selectedOrder.userEmail)} type="button">
            Заказы пользователя
          </button>
        </div>
      </div>

      <div className="admin-user-detail__stats">
        <div className="admin-inline-stat">
          <span>Почта</span>
          <strong>{selectedOrder.userEmail}</strong>
        </div>
        <div className="admin-inline-stat">
          <span>Имя</span>
          <strong>{selectedOrderUserName}</strong>
        </div>
        <div className="admin-inline-stat">
          <span>Курс</span>
          <strong>{selectedOrder.courseTitle}</strong>
        </div>
        <div className="admin-inline-stat">
          <span>Тариф</span>
          <strong>{selectedOrder.tariffTitle}</strong>
        </div>
        <div className="admin-inline-stat">
          <span>Сумма</span>
          <strong>{formatMoney(selectedOrder.amount)}</strong>
        </div>
        <div className="admin-inline-stat">
          <span>Способ</span>
          <strong>{getPaymentMethodLabel(selectedOrder.paymentMethod)}</strong>
        </div>
        <div className="admin-inline-stat">
          <span>Создан</span>
          <strong>{formatShortDate(selectedOrder.createdAt)}</strong>
        </div>
        <div className="admin-inline-stat">
          <span>Обновлён</span>
          <strong>{formatShortDate(selectedOrder.updatedAt)}</strong>
        </div>
      </div>

      <section className="admin-user-detail__card">
        <div className="admin-user-detail__card-head">
          <strong>Действия по заказу</strong>
          <span className="muted-text">
            {selectedOrderNeedsManualReview ? 'Доступна ручная проверка' : 'Без ручной проверки'}
          </span>
        </div>
        {selectedOrderNeedsManualReview ? (
          <AdminManualReviewActions orderId={selectedOrder.id} />
        ) : (
          <p className="muted-text" style={{ margin: 0 }}>
            Для этого статуса доступны переходы к пользователю и курсу. Подтверждение и отклонение применяются только к ручной проверке.
          </p>
        )}
      </section>
    </article>
  ) : null;

  const aiAssistantRequestCounts = useMemo(() => {
    const requests = initialData.aiAssistantRequests;

    return {
      all: requests.length,
      inProgress: requests.filter((request) => request.status === 'IN_PROGRESS').length,
      new: requests.filter((request) => request.status === 'NEW').length,
      ready: requests.filter((request) => request.status === 'READY').length,
    };
  }, [initialData.aiAssistantRequests]);
  const filteredAiAssistantRequests = useMemo(
    () =>
      initialData.aiAssistantRequests.filter((request) => {
        if (aiRequestStatusFilter !== 'ALL' && request.status !== aiRequestStatusFilter) {
          return false;
        }

        if (!aiRequestSearchValue) {
          return true;
        }

        return [request.id, request.name, request.contact, request.userEmail ?? '']
          .join(' ')
          .toLowerCase()
          .includes(aiRequestSearchValue);
      }),
    [aiRequestSearchValue, aiRequestStatusFilter, initialData.aiAssistantRequests]
  );
  const aiAssistantDetailRequest =
    initialData.aiAssistantRequests.find((request) => request.id === aiAssistantDetailId) ?? null;

  return (
    <section className="dnk-section admin-shell admin-shell--saas" id="admin-overview">
      <div className="admin-app-layout">
        <aside className="panel admin-sidebar">
          <Link className="admin-sidebar__brand" href="/">
            <span className="brand-mark" />
            <div>
              <strong>Админ-панель</strong>
              <p>Рабочее пространство платформы DNK</p>
            </div>
          </Link>

          <div className="admin-sidebar__group">
            <span className="eyebrow">Навигация</span>
            <nav className="admin-sidebar__nav">
              <button
                className={`admin-sidebar__link ${activeDashboardTab === 'dashboard' ? 'admin-sidebar__link--active' : ''}`}
                onClick={() => handleActivateDashboardTab('dashboard')}
                type="button"
              >
                <UsersIcon />
                <span>Обзор</span>
              </button>
              {dashboardTabs.map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.key}
                    className={`admin-sidebar__link ${activeDashboardTab === tab.key ? 'admin-sidebar__link--active' : ''}`}
                    onClick={() => handleActivateDashboardTab(tab.key)}
                    type="button"
                  >
                    <Icon />
                    <span>{tab.label}</span>
                    <small>{tab.count}</small>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="admin-sidebar__footer">
            <Link className="admin-sidebar__utility" href="/admin/help">
              <InfoIcon />
              <span>Справка</span>
            </Link>
          </div>
        </aside>

        <div className="admin-workspace">
          <header className="panel admin-toolbar">
            <div className="admin-toolbar__primary">
              <div className="admin-toolbar__links">
                <Link href="/admin/help">Инструкция</Link>
                <Link href="/lk">Личный кабинет</Link>
                <Link href="/catalog">Каталог</Link>
              </div>
            </div>

            <div className="admin-toolbar__meta">
              <div className="admin-toolbar__notifications" ref={bellDropdownRef}>
                <button
                  aria-expanded={isBellDropdownOpen}
                  className="admin-toolbar__bell"
                  onClick={toggleBellDropdown}
                  type="button"
                >
                  <BellIcon />
                  <span>{processingCount}</span>
                </button>
                {isBellDropdownOpen ? (
                  <div className="admin-toolbar__dropdown">
                    <div className="admin-toolbar__dropdown-head">
                      <strong>Уведомления</strong>
                      <button className="ghost-button" onClick={handleOpenReviewWorkspace} type="button">
                        Очередь
                      </button>
                    </div>
                    {manualReviewOrders.length > 0 ? (
                      <div className="admin-toolbar__dropdown-list">
                        {manualReviewOrders.slice(0, 8).map((order) => (
                          <button
                            className="admin-toolbar__dropdown-item"
                            key={order.id}
                            onClick={() => {
                              setIsBellDropdownOpen(false);
                              setReviewSearch(order.userEmail);
                              handleOpenReviewWorkspace();
                            }}
                            type="button"
                          >
                            <span className="admin-toolbar__dropdown-icon admin-toolbar__dropdown-icon--warning">
                              <ReviewIcon />
                            </span>
                            <span className="admin-toolbar__dropdown-copy">
                              <strong>{order.userEmail}</strong>
                              <span>{order.courseTitle}</span>
                            </span>
                            <span className="admin-toolbar__dropdown-meta">
                              <span className="badge badge-pending">{getOrderStatusLabel(order.status)}</span>
                              <span className="mono">{formatMoney(order.amount)}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="admin-toolbar__dropdown-empty">Новых уведомлений нет.</p>
                    )}
                    <div className="admin-toolbar__dropdown-head admin-toolbar__dropdown-head--secondary">
                      <strong>События</strong>
                    </div>
                    {timelineItems.length > 0 ? (
                      <div className="admin-toolbar__dropdown-list">
                        {timelineItems.slice(0, 10).map((item) => (
                          <button
                            className="admin-toolbar__dropdown-item"
                            key={item.id}
                            onClick={() => {
                              setIsBellDropdownOpen(false);
                              item.action();
                            }}
                            type="button"
                          >
                            <span className={`admin-toolbar__dropdown-icon admin-toolbar__dropdown-icon--${item.tone}`}>
                              <ActivityKindIcon kind={item.kind} />
                            </span>
                            <span className="admin-toolbar__dropdown-copy">
                              <strong>{item.title}</strong>
                              <span>{item.meta}</span>
                            </span>
                            <span className="admin-toolbar__dropdown-meta">
                              <span className="mono">{formatShortDateTime(item.timestamp)}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="admin-toolbar__dropdown-empty">Пока нет новых событий.</p>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="admin-toolbar__profile">
                <span className="admin-toolbar__avatar">{getAdminInitials(adminEmail)}</span>
                <div>
                  <strong>{adminEmail}</strong>
                  <small>Администратор</small>
                </div>
              </div>
            </div>
          </header>

          <div className="panel admin-dashboard-surface">
            <div className="admin-dashboard-surface__header">
              <div>
                <h1>{surfaceTitle}</h1>
                <p className="panel-copy">{surfaceDescription}</p>
              </div>
              {isDashboardHome ? <div className="admin-dashboard-surface__header-actions">
                <button className="ghost-button" onClick={handleOpenReviewWorkspace} type="button">
                  Проверить оплаты
                </button>
                <button
                  className="ghost-button"
                  onClick={() =>
                    selectedCourse
                      ? jumpToCourseEditor(selectedCourse.id)
                      : openContentDrawer('admin-courses', { showCourseSelector: false })
                  }
                  type="button"
                >
                  Редактор курсов
                </button>
              </div> : null}
            </div>

            {showTrendPeriodSwitch ? (
              <div className="admin-dashboard-toolbar">
                <div className="admin-period-switch" aria-label="Период аналитики">
                  {(Object.keys(TREND_PERIOD_LABELS) as TrendPeriod[]).map((period) => (
                    <button
                      key={period}
                      aria-pressed={trendPeriod === period}
                      className={`admin-period-switch__button ${
                        trendPeriod === period ? 'admin-period-switch__button--active' : ''
                      }`}
                      onClick={() => setTrendPeriod(period)}
                      type="button"
                    >
                      {TREND_PERIOD_LABELS[period].title}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {isDashboardHome ? <div className="admin-kpi-grid">
              {kpiCards.map((card) => {
                const Icon = card.icon;

                return (
                  <button className="admin-kpi-card" key={card.key} onClick={card.onClick} type="button">
                    <span className="admin-kpi-card__icon">
                      <Icon />
                    </span>
                    <span className="admin-kpi-card__label">{card.label}</span>
                    <strong>{card.value}</strong>
                    <small>{card.note}</small>
                  </button>
                );
              })}
            </div> : null}

            {isDashboardHome ? (
              <article className="panel admin-ai-requests admin-ai-queue" id="admin-ai-requests">
                <div className="admin-ai-queue__head">
                  <div>
                    <h2>Заявки на AI-помощника</h2>
                    <p className="panel-copy">Очередь пилота: заявки, статусы и подготовка n8n.</p>
                  </div>
                  <div className="admin-ai-counters" aria-label="Счетчики AI-заявок">
                    <span><strong>{aiAssistantRequestCounts.all}</strong> всего</span>
                    <span><strong>{aiAssistantRequestCounts.new}</strong> новые</span>
                    <span><strong>{aiAssistantRequestCounts.inProgress}</strong> в работе</span>
                    <span><strong>{aiAssistantRequestCounts.ready}</strong> готовы</span>
                  </div>
                </div>

                {managementFeedback ? (
                  <p className={`feedback ${managementFeedback.tone === 'success' ? 'feedback-success' : 'feedback-error'}`}>
                    {managementFeedback.message}
                  </p>
                ) : null}

                <div className="admin-ai-filters">
                  <div className="admin-ai-filter-group" aria-label="Фильтр по статусу">
                    <span>Статус</span>
                    <div>
                      {(['ALL', 'NEW', 'REVIEWED', 'IN_PROGRESS', 'READY', 'CLOSED'] as const).map((status) => (
                        <button
                          aria-pressed={aiRequestStatusFilter === status}
                          className={`admin-ai-filter-chip ${aiRequestStatusFilter === status ? 'admin-ai-filter-chip--active' : ''}`}
                          key={status}
                          onClick={() => setAiRequestStatusFilter(status)}
                          type="button"
                        >
                          {status === 'ALL' ? 'Все' : AI_REQUEST_STATUS_LABELS[status]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field admin-ai-search-field">
                    <label htmlFor="admin-ai-search">Поиск</label>
                    <input
                      id="admin-ai-search"
                      onChange={(event) => setAiRequestSearch(event.target.value)}
                      placeholder="Имя, email, контакт"
                      value={aiRequestSearch}
                    />
                  </div>
                  <button className="ghost-button admin-ai-reset" onClick={handleResetAiAssistantFilters} type="button">
                    Сбросить
                  </button>
                </div>

                <div className="admin-ai-inbox" role="list">
                  {initialData.aiAssistantRequests.length === 0 ? (
                    <div className="admin-ai-empty">
                      <h3>Заявок пока нет</h3>
                      <p>Когда пользователь пройдёт AI-разбор, заявка появится здесь.</p>
                    </div>
                  ) : filteredAiAssistantRequests.length > 0 ? (
                    filteredAiAssistantRequests.map((request) => {
                      const previewTasks = request.tasks.slice(0, 2);
                      const hiddenTasks = Math.max(request.tasks.length - previewTasks.length, 0);
                      const previewChannels = request.channels.slice(0, 2);
                      const hiddenChannels = Math.max(request.channels.length - previewChannels.length, 0);
                      const isExpanded = expandedAiAssistantRequestId === request.id;

                      return (
                        <section
                          aria-expanded={isExpanded}
                          className={`admin-ai-inbox-item ${isExpanded ? 'admin-ai-inbox-item--active' : ''}`}
                          key={request.id}
                          role="listitem"
                        >
                          <div className="admin-ai-inbox-item__row">
                            <button className="admin-ai-inbox-item__click" onClick={() => handleToggleAiAssistantRequest(request.id)} type="button">
                              <span className="admin-ai-inbox-item__meta">
                                <strong>#{request.id}</strong>
                                <small>{formatShortDateTime(request.createdAt)}</small>
                              </span>
                              <span className="admin-ai-inbox-item__content">
                                <span className="admin-ai-inbox-item__person">
                                  <strong>{request.name}</strong>
                                  <small>{request.userEmail ?? request.contact}</small>
                                </span>
                                <span className="admin-ai-inbox-item__summary">
                                  <span>{request.businessType}</span>
                                  <span>{request.pain}</span>
                                </span>
                                <span className="admin-ai-inbox-item__chips">
                                  <span className="admin-ai-chip-label">Функции</span>
                                  {previewTasks.map((task) => (
                                    <span className="admin-ai-compact-chip" key={task}>{task}</span>
                                  ))}
                                  {hiddenTasks > 0 ? <span className="admin-ai-compact-chip admin-ai-compact-chip--muted">+{hiddenTasks}</span> : null}
                                  <span className="admin-ai-chip-label">Каналы</span>
                                  {previewChannels.map((channel) => (
                                    <span className="admin-ai-compact-chip" key={channel}>{channel}</span>
                                  ))}
                                  {hiddenChannels > 0 ? <span className="admin-ai-compact-chip admin-ai-compact-chip--muted">+{hiddenChannels}</span> : null}
                                </span>
                              </span>
                            </button>

                            <div className="admin-ai-inbox-item__side">
                              <div className="admin-ai-inbox-item__badges">
                                <span className={`admin-ai-status-pill admin-ai-status-pill--${request.status.toLowerCase().replace('_', '-')}`}>
                                  {AI_REQUEST_STATUS_LABELS[request.status]}
                                </span>
                                <span className="admin-ai-n8n-status" title={request.n8nStatus || 'NOT_CONFIGURED'}>
                                  {request.n8nStatus || '—'}
                                </span>
                              </div>
                              <div className="admin-ai-row-actions">
                                <button className="admin-icon-button" onClick={() => handleToggleAiAssistantRequest(request.id)} title={isExpanded ? 'Скрыть' : 'Открыть'} type="button">
                                  <EyeIcon />
                                </button>
                                <button className="admin-icon-button" onClick={() => handleOpenAiAssistantDetails(request)} title="Подробнее" type="button">
                                  <EditIcon />
                                </button>
                                <button className="admin-icon-button" onClick={() => handleCopyAiAssistantBrief(request)} title="Скопировать ТЗ" type="button">
                                  <CopyIcon />
                                </button>
                                {n8nWorkflowUrl ? (
                                  <a
                                    aria-label="Открыть n8n"
                                    className="admin-icon-button"
                                    href={n8nWorkflowUrl}
                                    rel="noreferrer"
                                    target="_blank"
                                    title="Открыть n8n"
                                  >
                                    <ExternalLinkIcon />
                                  </a>
                                ) : (
                                  <span className="admin-icon-button admin-icon-button--disabled" title="n8n workflow URL не настроен">
                                    <ExternalLinkIcon />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isExpanded ? (
                            <div className="admin-ai-inbox-expand">
                              <div>
                                <span>Комментарий</span>
                                <p>{request.comment || '—'}</p>
                              </div>
                              <div>
                                <span>Контакт</span>
                                <p>{request.contact}</p>
                              </div>
                              <div className="admin-ai-inbox-expand__brief">
                                <span>Краткое ТЗ</span>
                                <pre>{buildAiAssistantN8nBrief(request)}</pre>
                              </div>
                              <div className="admin-ai-inbox-expand__actions">
                                <button className="secondary-button" onClick={() => handleOpenAiAssistantDetails(request)} type="button">
                                  Подробнее
                                </button>
                                <button className="secondary-button" onClick={() => handleCopyAiAssistantBrief(request)} type="button">
                                  Скопировать ТЗ
                                </button>
                                {n8nWorkflowUrl ? (
                                  <a className="secondary-button" href={n8nWorkflowUrl} rel="noreferrer" target="_blank">
                                    Открыть n8n
                                  </a>
                                ) : (
                                  <span className="secondary-button secondary-button--disabled" title="n8n workflow URL не настроен">
                                    Открыть n8n
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </section>
                      );
                    })
                  ) : (
                    <p className="muted-text admin-ai-empty-inline">По выбранным фильтрам заявок нет.</p>
                  )}
                </div>

              </article>
            ) : null}

            {aiAssistantDetailRequest && typeof document !== 'undefined'
              ? createPortal(
                  <div className="admin-modal-backdrop" onClick={handleCloseAiAssistantDetails} role="presentation">
                    <aside
                      aria-label={`Заявка #${aiAssistantDetailRequest.id}`}
                      className="admin-ai-drawer"
                      onClick={(event) => event.stopPropagation()}
                      role="dialog"
                    >
                      <header className="admin-ai-drawer__head">
                        <div>
                          <span className="eyebrow">Заявка #{aiAssistantDetailRequest.id}</span>
                          <h3>{aiAssistantDetailRequest.businessType}</h3>
                          <p>{aiAssistantDetailRequest.pain}</p>
                        </div>
                        <button className="admin-icon-button" onClick={handleCloseAiAssistantDetails} title="Закрыть" type="button">
                          <CloseIcon />
                        </button>
                      </header>

                      <div className="admin-ai-drawer__body">
                        <div className="admin-ai-detail-grid">
                          <div>
                            <span>Пользователь</span>
                            <strong>{aiAssistantDetailRequest.name}</strong>
                            <small>
                              {aiAssistantDetailRequest.userId ? `#${aiAssistantDetailRequest.userId}` : 'Гость'}
                              {aiAssistantDetailRequest.userEmail ? ` · ${aiAssistantDetailRequest.userEmail}` : ''}
                            </small>
                          </div>
                          <div>
                            <span>Контакт</span>
                            <strong>{aiAssistantDetailRequest.contact}</strong>
                          </div>
                          <div>
                            <span>Бизнес</span>
                            <strong>{aiAssistantDetailRequest.businessType}</strong>
                          </div>
                          <div>
                            <span>Боль</span>
                            <strong>{aiAssistantDetailRequest.pain}</strong>
                          </div>
                        </div>

                        <div className="admin-ai-detail-section">
                          <span>Функции</span>
                          <div className="admin-ai-function-list">
                            {aiAssistantDetailRequest.tasks.map((task) => (
                              <span className="admin-ai-function-badge" key={task}>{task}</span>
                            ))}
                          </div>
                        </div>

                        <div className="admin-ai-detail-section">
                          <span>Каналы</span>
                          <div className="admin-ai-function-list admin-ai-function-list--compact">
                            {aiAssistantDetailRequest.channels.map((channel) => (
                              <span className="admin-ai-function-badge" key={channel}>{channel}</span>
                            ))}
                          </div>
                        </div>

                        <div className="admin-ai-detail-section">
                          <span>Комментарий</span>
                          <p>{aiAssistantDetailRequest.comment || '—'}</p>
                        </div>

                        <div className="admin-ai-editor-grid">
                          <div className="field">
                            <label htmlFor="admin-ai-detail-status">Статус</label>
                            <select
                              className="admin-ai-status-select"
                              disabled={pendingKey === `ai-request-${aiAssistantDetailRequest.id}`}
                              id="admin-ai-detail-status"
                              onChange={(event) =>
                                setAiAssistantStatusDraft(event.target.value as AdminAiAssistantRequestRow['status'])
                              }
                              value={aiAssistantStatusDraft}
                            >
                              {AI_REQUEST_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {AI_REQUEST_STATUS_LABELS[status]}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor="admin-ai-detail-n8n">n8n status</label>
                            <input
                              id="admin-ai-detail-n8n"
                              onChange={(event) => setAiAssistantN8nStatusDraft(event.target.value)}
                              placeholder="NOT_CONFIGURED"
                              value={aiAssistantN8nStatusDraft}
                            />
                          </div>
                        </div>

                        <div className="field admin-ai-note-field">
                          <label htmlFor="admin-ai-detail-note">Внутренняя заметка администратора</label>
                          <textarea
                            id="admin-ai-detail-note"
                            onChange={(event) => setAiAssistantAdminNoteDraft(event.target.value)}
                            placeholder="Что важно помнить при подготовке сценария"
                            value={aiAssistantAdminNoteDraft}
                          />
                        </div>

                        <div className="admin-ai-drawer__notice">
                          <strong>n8n workflow</strong>
                          <span>{n8nWorkflowUrl ? 'Открывается во внешней вкладке.' : 'n8n workflow URL не настроен.'}</span>
                        </div>

                        <div className="admin-ai-detail-section">
                          <span>Краткое ТЗ для n8n</span>
                          <pre className="admin-ai-brief">{buildAiAssistantN8nBrief(aiAssistantDetailRequest)}</pre>
                        </div>

                        <details className="admin-ai-collapsed-debug">
                          <summary>payload JSON</summary>
                          <pre className="admin-ai-payload">
                            {JSON.stringify(aiAssistantDetailRequest.payload ?? null, null, 2)}
                          </pre>
                        </details>
                        <details className="admin-ai-collapsed-debug">
                          <summary>n8n response</summary>
                          <pre className="admin-ai-payload">
                            {JSON.stringify(aiAssistantDetailRequest.n8nResponse ?? null, null, 2)}
                          </pre>
                        </details>
                      </div>

                      <footer className="admin-ai-drawer__actions">
                        <div className="admin-ai-drawer__secondary-actions">
                          <button className="secondary-button" onClick={() => handleCopyAiAssistantBrief(aiAssistantDetailRequest)} type="button">
                            <CopyIcon />
                            <span>ТЗ</span>
                          </button>
                          <button className="secondary-button" onClick={() => handleCopyAiAssistantPayload(aiAssistantDetailRequest)} type="button">
                            <CopyIcon />
                            <span>JSON</span>
                          </button>
                          {n8nWorkflowUrl ? (
                            <a className="secondary-button" href={n8nWorkflowUrl} rel="noreferrer" target="_blank">
                              <ExternalLinkIcon />
                              <span>n8n</span>
                            </a>
                          ) : (
                            <button className="secondary-button" disabled title="n8n workflow URL не настроен" type="button">
                              <ExternalLinkIcon />
                              <span>n8n</span>
                            </button>
                          )}
                        </div>
                        <div className="admin-ai-drawer__primary-actions">
                          <button
                            className="primary-button"
                            disabled={pendingKey === `ai-request-${aiAssistantDetailRequest.id}`}
                            onClick={() => handleSaveAiAssistantDetails(aiAssistantDetailRequest)}
                            type="button"
                          >
                            Сохранить
                          </button>
                          <button className="ghost-button" onClick={handleCloseAiAssistantDetails} type="button">
                            Закрыть
                          </button>
                        </div>
                      </footer>
                    </aside>
                  </div>,
                  document.body
                )
              : null}

            {isDashboardHome ? (
              <div className="admin-saas-grid admin-saas-grid--overview">
                <article className="panel admin-surface-card admin-surface-card--orders">
                  <div className="admin-surface-card__head">
                    <div>
                      <span className="eyebrow">Платежи</span>
                      <h2>Последние заказы</h2>
                      <p className="admin-surface-card__lead">
                        T-Bank закрывает основной поток оплат, а ручная проверка вынесена в отдельный сценарий.
                      </p>
                    </div>
                    <button className="ghost-button admin-surface-card__link" onClick={handleOpenReviewWorkspace} type="button">
                      Проверка оплат
                    </button>
                  </div>
                  <div className="admin-status-summary-grid">
                    <span className="admin-status-summary admin-status-summary--processing">
                      <strong>{processingCount}</strong>
                      <span>требуют внимания</span>
                    </span>
                    <span className="admin-status-summary admin-status-summary--pending">
                      <strong>{pendingCount}</strong>
                      <span>ожидают</span>
                    </span>
                    <span className="admin-status-summary admin-status-summary--paid">
                      <strong>{paidOrders.length}</strong>
                      <span>оплачено</span>
                    </span>
                    {failedCount > 0 ? (
                      <span className="admin-status-summary admin-status-summary--failed">
                        <strong>{failedCount}</strong>
                        <span>сбой/отмена</span>
                      </span>
                    ) : null}
                  </div>
                  <div className="admin-queue-list">
                    {dashboardRecentOrders.length > 0 ? (
                      dashboardRecentOrders.map((item) => (
                        <div className="admin-queue-item" key={`queue-${item.id}`}>
                          <div className="admin-queue-item__copy">
                            <strong className="mono">{item.userEmail}</strong>
                            <p>{item.courseTitle}</p>
                          </div>
                          <div className="admin-queue-item__meta">
                            <strong>{formatMoney(item.amount)}</strong>
                            <span className={getBadgeClass(item.status)}>{getOrderStatusLabel(item.status)}</span>
                            <button
                              className="ghost-button"
                              onClick={() => {
                                if (item.status === 'PROCESSING') {
                                  setReviewSearch(item.userEmail);
                                  handleOpenReviewWorkspace();
                                  return;
                                }

                                handleSelectOrder(item.id, { openDrawer: true });
                              }}
                              type="button"
                            >
                              {item.status === 'PROCESSING' ? 'Проверить' : 'Открыть'}
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="muted-text" style={{ margin: 0 }}>
                        Заказы появятся после первой оплаты.
                      </p>
                    )}
                  </div>
                </article>

                <article className="panel admin-surface-card admin-surface-card--users">
                  <div className="admin-surface-card__head">
                    <div>
                      <span className="eyebrow">График</span>
                      <h2>Новые пользователи</h2>
                    </div>
                    <button className="ghost-button admin-surface-card__link" onClick={() => handleActivateDashboardTab('users')} type="button">
                      Раздел
                    </button>
                  </div>
                  <div className="admin-analytics-stat">
                    <strong>{recentUsersCount}</strong>
                    <span>{TREND_PERIOD_LABELS[trendPeriod].note}</span>
                  </div>
                  <MiniTrendChart metricLabel="Новые пользователи" points={userTrendSeries} tone="success" />
                </article>

                <article className="panel admin-surface-card admin-surface-card--revenue">
                  <div className="admin-surface-card__head">
                    <div>
                      <span className="eyebrow">График</span>
                      <h2>Выручка</h2>
                    </div>
                    <button className="ghost-button admin-surface-card__link" onClick={() => openOrdersDrawer('PAID')} type="button">
                      Оплаченные
                    </button>
                  </div>
                  <div className="admin-analytics-stat">
                    <strong>{formatMoney(recentRevenue)}</strong>
                    <span>{TREND_PERIOD_LABELS[trendPeriod].note}</span>
                  </div>
                  <MiniTrendChart
                    formatValue={formatMoney}
                    metricLabel="Выручка"
                    points={revenueTrendSeries}
                    tone="accent"
                  />
                </article>

                <article className="panel admin-surface-card admin-surface-card--actions">
                  <div className="admin-surface-card__head">
                    <div>
                      <span className="eyebrow">Быстрые действия</span>
                      <h2>Рабочие сценарии</h2>
                    </div>
                    <AdminHint label="Пояснение к быстрым действиям">
                      Каждая кнопка открывает отдельную рабочую область или нужный редактор без изменения бизнес-логики.
                    </AdminHint>
                  </div>
                  <div className="admin-quick-grid admin-quick-grid--saas">
                    <button className="admin-quick-action" onClick={handleOpenCreateCourse} type="button">
                      <span className="admin-quick-action__icon"><CoursesIcon /></span>
                      <span>Создать курс</span>
                    </button>
                    <button className="admin-quick-action" onClick={handleOpenLessonWorkspace} type="button">
                      <span className="admin-quick-action__icon"><LessonsIcon /></span>
                      <span>Добавить урок</span>
                    </button>
                    <button className="admin-quick-action" onClick={handleOpenTariffWorkspace} type="button">
                      <span className="admin-quick-action__icon"><TariffIcon /></span>
                      <span>Создать тариф</span>
                    </button>
                    <button className="admin-quick-action" onClick={handleOpenAccessWorkspace} type="button">
                      <span className="admin-quick-action__icon"><AccessIcon /></span>
                      <span>Выдать доступ</span>
                    </button>
                    <button className="admin-quick-action" onClick={handleOpenReviewWorkspace} type="button">
                      <span className="admin-quick-action__icon"><ReviewIcon /></span>
                      <span>Проверить оплату</span>
                    </button>
                  </div>
                </article>

                <article className="panel admin-surface-card admin-surface-card--activity">
                  <div className="admin-surface-card__head">
                    <div>
                      <span className="eyebrow">События</span>
                      <h2>Последняя активность</h2>
                    </div>
                    <AdminHint label="Пояснение к событиям">
                      Последние события по пользователям, доступам и ручной проверке.
                    </AdminHint>
                  </div>
                  <div className="admin-activity-list admin-activity-list--timeline">
                        {timelineItems.slice(0, 4).map((item) => (
                      <button
                        className="admin-activity-list__item admin-activity-list__item--timeline"
                        key={item.id}
                        onClick={item.action}
                        type="button"
                      >
                        <span className={`admin-activity-list__icon admin-activity-list__icon--${item.tone}`}>
                          <ActivityKindIcon kind={item.kind} />
                        </span>
                        <div className="admin-activity-list__copy">
                          <strong>{item.title}</strong>
                          <p>{item.meta}</p>
                        </div>
                        <span className="mono admin-activity-list__date">{formatShortDateTime(item.timestamp)}</span>
                      </button>
                    ))}
                  </div>
                </article>
              </div>
            ) : activeSectionPanel ? (
              <div
                className={`admin-section-workspace ${
                  activeSectionPanel.chart ? 'admin-section-workspace--with-chart' : 'admin-section-workspace--summary'
                }`}
              >
                {activeSectionPanel.chart ? (
                  <article className="panel admin-surface-card admin-surface-card--chart">
                    <div className="admin-surface-card__head">
                      <div>
                        <span className="eyebrow">Аналитика</span>
                        <h2>{activeSectionPanel.chart.title}</h2>
                      </div>
                      <AdminHint label={`Пояснение к графику ${activeSectionPanel.chart.title}`}>
                        {activeSectionPanel.chart.hint}
                      </AdminHint>
                    </div>
                    <div className="admin-analytics-stat">
                      <strong>{activeSectionPanel.chart.value}</strong>
                      <span>{activeSectionPanel.chart.note}</span>
                    </div>
                    <MiniTrendChart
                      formatValue={activeSectionPanel.chart.formatValue}
                      metricLabel={activeSectionPanel.chart.metricLabel ?? activeSectionPanel.chart.title}
                      points={activeSectionPanel.chart.points}
                      tone={activeSectionPanel.chart.tone}
                    />
                  </article>
                ) : null}

                <article className="panel admin-surface-card admin-surface-card--section">
                  <div className="admin-surface-card__head">
                    <div>
                      <span className="eyebrow">Раздел</span>
                      <h2>{activeSectionPanel.title}</h2>
                    </div>
                    <div className="admin-surface-card__head-actions">
                      <AdminHint label={`Пояснение к разделу ${activeSectionPanel.title}`}>
                        {activeSectionPanel.subtitle}
                      </AdminHint>
                      <button className="ghost-button admin-surface-card__link" onClick={activeSectionPanel.action} type="button">
                        {activeSectionPanel.actionLabel}
                      </button>
                    </div>
                  </div>
                  <div className="admin-metric-cluster">
                    {activeSectionPanel.metrics.map((metric) => (
                      <span className="admin-metric-pill" key={metric.label}>
                        <strong>{metric.value}</strong>
                        <span>{metric.label}</span>
                      </span>
                    ))}
                  </div>
                </article>

                <article
                  className={`panel admin-surface-card ${
                    activeDashboardTab === 'users' ||
                    activeDashboardTab === 'orders' ||
                    activeDashboardTab === 'accesses'
                      ? 'admin-surface-card--management'
                      : 'admin-surface-card--list'
                  }`}
                >
                  <div className="admin-surface-card__head">
                    <div>
                      <span className="eyebrow">
                        {activeDashboardTab === 'users' || activeDashboardTab === 'orders' || activeDashboardTab === 'accesses'
                          ? 'Управление'
                          : 'Последние записи'}
                      </span>
                      <h2>
                        {activeDashboardTab === 'users'
                          ? 'Управление пользователями'
                          : activeDashboardTab === 'orders'
                            ? 'Заказы и оплаты'
                            : activeDashboardTab === 'accesses'
                              ? 'Журнал доступов'
                              : activeSectionPanel.rowsTitle}
                      </h2>
                    </div>
                    <button className="ghost-button admin-surface-card__link" onClick={activeSectionPanel.action} type="button">
                      {activeSectionPanel.actionLabel}
                    </button>
                  </div>
                  {activeDashboardTab === 'users' ? (
                    <>
                      <div className="admin-management-controls">
                        <div className="field">
                          <label className="sr-only" htmlFor="admin-users-workspace-search">Поиск пользователей</label>
                          <input
                            id="admin-users-workspace-search"
                            onChange={(event) => setUserSearch(event.target.value)}
                            placeholder="Поиск по email или имени"
                            value={userSearch}
                          />
                        </div>
                        <div className="admin-filter-row">
                          {(['ALL', 'ADMIN', 'USER', 'ACTIVE_ORDER', 'HAS_ACCESS'] as const).map((filterKey) => (
                            <button
                              key={filterKey}
                              aria-pressed={userListFilter === filterKey}
                              className={`catalog-directory__filter-pill ${
                                userListFilter === filterKey ? 'catalog-directory__filter-pill--active' : ''
                              }`}
                              onClick={() => setUserListFilter(filterKey)}
                              type="button"
                            >
                              {USER_FILTER_LABELS[filterKey]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="admin-management-split">
                        <div className="admin-management-list">
                          {filteredJournalUsers.length > 0 ? (
                            filteredJournalUsers.map((item) => (
                              <button
                                className={`admin-workbench-row admin-workbench-row--button ${
                                  selectedUserId === item.id ? 'admin-workbench-row--active' : ''
                                }`}
                                key={item.id}
                                onClick={() => handleOpenUserDetail(item.id, { openDrawer: false })}
                                type="button"
                              >
                                <div className="admin-workbench-row__copy">
                                  <strong>{item.email}</strong>
                                  <p>
                                    {userNameMap.get(item.id) ?? 'Имя не указано'} · {userOrderCountMap.get(item.id) ?? 0} заказов
                                  </p>
                                </div>
                                <div className="admin-workbench-row__meta">
                                  <span className="mono">
                                    {formatShortDate(item.createdAt)} · {item.accessibleCoursesCount} доступа
                                  </span>
                                  <span className={getBadgeClass(item.role)}>{getRoleLabel(item.role)}</span>
                                </div>
                              </button>
                            ))
                          ) : (
                            <p className="muted-text" style={{ margin: 0 }}>
                              Пользователи по текущему фильтру не найдены.
                            </p>
                          )}
                        </div>
                        <div className="admin-management-detail">
                          {userManagementDetailCard ?? (
                            <article className="panel admin-management-empty">
                              <strong>Выберите пользователя</strong>
                              <p className="muted-text" style={{ margin: 0 }}>
                                Справа откроется карточка пользователя, его доступы и заказы.
                              </p>
                            </article>
                          )}
                        </div>
                      </div>
                    </>
                  ) : activeDashboardTab === 'orders' ? (
                    <>
                      <div className="admin-management-controls">
                        <div className="field">
                          <label className="sr-only" htmlFor="admin-orders-workspace-search">Поиск заказов</label>
                          <input
                            id="admin-orders-workspace-search"
                            onChange={(event) => setOrderSearch(event.target.value)}
                            placeholder="Поиск по email, курсу или способу оплаты"
                            value={orderSearch}
                          />
                        </div>
                        <div className="admin-filter-row">
                          {ORDER_STATUS_FILTERS.map((status) => (
                            <button
                              key={status}
                              aria-pressed={orderFilter === status}
                              className={`catalog-directory__filter-pill ${
                                orderFilter === status ? 'catalog-directory__filter-pill--active' : ''
                              }`}
                              onClick={() => setOrderFilter(status)}
                              type="button"
                            >
                              {ORDER_FILTER_LABELS[status]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="admin-management-split">
                        <div className="admin-management-list">
                          {filteredJournalOrders.length > 0 ? (
                            filteredJournalOrders.map((item) => (
                              <button
                                className={`admin-workbench-row admin-workbench-row--button ${
                                  selectedOrderId === item.id ? 'admin-workbench-row--active' : ''
                                }`}
                                key={item.id}
                                onClick={() => handleSelectOrder(item.id, { openDrawer: false })}
                                type="button"
                              >
                                <div className="admin-workbench-row__copy">
                                  <strong>{item.courseTitle}</strong>
                                  <p>
                                    {item.userEmail} · {formatMoney(item.amount)}
                                  </p>
                                </div>
                                <div className="admin-workbench-row__meta">
                                  <span className="mono">
                                    {formatShortDate(item.updatedAt)} · {getPaymentMethodLabel(item.paymentMethod)}
                                  </span>
                                  <span className={getBadgeClass(item.status)}>{getOrderStatusLabel(item.status)}</span>
                                </div>
                              </button>
                            ))
                          ) : (
                            <p className="muted-text" style={{ margin: 0 }}>
                              По выбранному фильтру заказов нет.
                            </p>
                          )}
                        </div>
                        <div className="admin-management-detail">
                          {orderDetailCard ?? (
                            <article className="panel admin-management-empty">
                              <strong>Выберите заказ</strong>
                              <p className="muted-text" style={{ margin: 0 }}>
                                Справа откроется карточка заказа и доступные действия оплаты.
                              </p>
                            </article>
                          )}
                        </div>
                      </div>
                    </>
                  ) : activeDashboardTab === 'accesses' ? (
                    <>
                      <div className="admin-management-controls">
                        <div className="field">
                          <label className="sr-only" htmlFor="admin-accesses-workspace-search">Поиск доступов</label>
                          <input
                            id="admin-accesses-workspace-search"
                            onChange={(event) => setAccessSearch(event.target.value)}
                            placeholder="Поиск по email, курсу или источнику"
                            value={accessSearch}
                          />
                        </div>
                        <div className="admin-filter-row">
                          {(['ALL', 'order', 'free'] as const).map((filterKey) => (
                            <button
                              key={filterKey}
                              aria-pressed={accessSourceFilter === filterKey}
                              className={`catalog-directory__filter-pill ${
                                accessSourceFilter === filterKey ? 'catalog-directory__filter-pill--active' : ''
                              }`}
                              onClick={() => setAccessSourceFilter(filterKey)}
                              type="button"
                            >
                              {ACCESS_FILTER_LABELS[filterKey]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="admin-access-grant panel" id="admin-access-grant">
                        <div className="admin-user-detail__card-head">
                          <strong>Выдать доступ</strong>
                          <span className="muted-text">
                            {accessWorkspaceMode === 'grant' ? 'Открыт режим быстрого действия' : 'Ручная выдача по пользователю и курсу'}
                          </span>
                        </div>
                        <div className="admin-access-grant__controls">
                          <div className="field admin-compact-select-field">
                            <label>Пользователь</label>
                            <AdminCompactSelect
                              ariaLabel="Выбрать пользователя для выдачи доступа"
                              emptyText="Пользователи не найдены"
                              onChange={(nextValue) => setAccessGrantUserId(Number(nextValue))}
                              options={initialData.users.map((user) => ({
                                value: user.id,
                                label: user.email,
                                meta: `${getRoleLabel(user.role)} · ${user.accessibleCoursesCount} доступа`,
                                badge: getRoleLabel(user.role),
                                badgeClass: getBadgeClass(user.role),
                                searchText: `${user.email} ${getRoleLabel(user.role)}`,
                              }))}
                              placeholder="Выберите пользователя"
                              searchPlaceholder="Найти пользователя"
                              value={accessGrantUserId}
                            />
                          </div>
                          <div className="field admin-compact-select-field">
                            <label>Курс</label>
                            <AdminCompactSelect
                              ariaLabel="Выбрать курс для выдачи доступа"
                              emptyText="Курсы не найдены"
                              onChange={(nextValue) => setAccessGrantCourseId(Number(nextValue))}
                              options={initialData.courses.map((course) => ({
                                value: course.id,
                                label: course.title,
                                meta: course.slug,
                                badge: getCourseStateLabel(course.state),
                                badgeClass: getBadgeClass(course.state),
                                searchText: `${course.title} ${course.slug} ${course.groupTitle}`,
                              }))}
                              placeholder="Выберите курс"
                              searchPlaceholder="Найти курс"
                              value={accessGrantCourseId}
                            />
                          </div>
                          <button
                            className="ghost-button"
                            disabled={!accessGrantUserId || !accessGrantCourseId || isManagementPending}
                            onClick={handleGrantAccessFromWorkspace}
                            type="button"
                          >
                            {pendingManagementKey?.startsWith('grant-access-workspace-') ? 'Выдаём доступ...' : 'Выдать доступ'}
                          </button>
                        </div>
                      </div>
                      {managementFeedback ? (
                        <p
                          className={`feedback ${
                            managementFeedback.tone === 'success' ? 'feedback-success' : 'feedback-error'
                          }`}
                        >
                          {managementFeedback.message}
                        </p>
                      ) : null}
                      <p className="admin-management-note admin-management-note--access">
                        Выдача доступа работает через форму выше. Отзыв доступен только для free-доступов без связанного заказа,
                        а оплаченные доступы остаются под защитой текущей логики оплат и LMS.
                      </p>
                      <div className="admin-management-list admin-management-list--full">
                        {filteredJournalEnrollments.length > 0 ? (
                          filteredJournalEnrollments.map((item) => (
                            <div className="admin-access-row" key={item.id}>
                              <div className="admin-access-row__copy">
                                <strong>{item.userEmail}</strong>
                                <p>
                                  {item.courseTitle} · {formatShortDate(item.createdAt)}
                                </p>
                              </div>
                              <div className="admin-access-row__meta">
                                <span className={getBadgeClass(item.source)}>{getEnrollmentSourceLabel(item.source)}</span>
                                <span className="mono">{item.courseSlug}</span>
                              </div>
                              <div className="admin-access-row__actions">
                                <button className="ghost-button" onClick={() => handleOpenUserDetail(item.userId)} type="button">
                                  Пользователь
                                </button>
                                <button className="ghost-button" onClick={() => jumpToCourseEditor(item.courseId)} type="button">
                                  Курс
                                </button>
                                {item.source === 'free' ? (
                                  <button
                                    className="ghost-button"
                                    disabled={pendingManagementKey === `revoke-access-${item.id}` || isManagementPending}
                                    onClick={() => handleRevokeEnrollment(item)}
                                    type="button"
                                  >
                                    {pendingManagementKey === `revoke-access-${item.id}` ? 'Отзываем...' : 'Отозвать'}
                                  </button>
                                ) : (
                                  <>
                                    <button className="ghost-button" disabled type="button">
                                      Отозвать
                                    </button>
                                    <AdminHint label="Почему отзыв недоступен">
                                      Оплаченные доступы остаются под защитой текущей логики оплат и LMS. Из админки можно отзывать только
                                      free-доступы без заказа.
                                    </AdminHint>
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="muted-text" style={{ margin: 0 }}>
                            По выбранному фильтру доступов нет.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="admin-workbench-list">
                      {activeSectionPanel.rows.length > 0 ? (
                        activeSectionPanel.rows.map((row) => (
                          <button
                            className="admin-workbench-row admin-workbench-row--button"
                            key={row.id}
                            onClick={row.onClick ?? activeSectionPanel.action}
                            type="button"
                          >
                            <div className="admin-workbench-row__copy">
                              <strong>{row.title}</strong>
                              <p>{row.subtitle}</p>
                            </div>
                            <div className="admin-workbench-row__meta">
                              <span className="mono">{row.meta}</span>
                              <span className={row.badgeClass}>{row.badge}</span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="muted-text" style={{ margin: 0 }}>
                          {activeSectionPanel.emptyText}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {activeAdminDrawer ? (
        <div
          aria-modal="true"
          className={`admin-drawer admin-drawer--${activeAdminDrawer}`}
          onClick={closeAdminDrawer}
          role="dialog"
        >
          <div
            className={`admin-drawer__window ${isContentDrawerFocused ? 'admin-drawer__window--content-focused' : ''}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-drawer__chrome">
              <div className="admin-drawer__head">
                <div>
                  <span className="eyebrow">Рабочая область</span>
                  <h2>{drawerMeta?.title}</h2>
                  <p className="panel-copy">{drawerMeta?.description}</p>
                </div>
                <button className="ghost-button admin-drawer__close" onClick={closeAdminDrawer} type="button">
                  Закрыть
                </button>
              </div>

              <div className="admin-drawer__controls">
                {activeAdminDrawer === 'review' ? (
                  <div className="field">
                    <label className="sr-only" htmlFor="admin-review-search">Поиск по очереди</label>
                    <input
                      id="admin-review-search"
                      onChange={(event) => setReviewSearch(event.target.value)}
                      placeholder="Поиск по очереди"
                      value={reviewSearch}
                    />
                  </div>
                ) : null}

                {activeAdminDrawer === 'content' ? (
                  <div className="field">
                    <label className="sr-only" htmlFor="admin-content-search">Поиск по курсам</label>
                    <input
                      id="admin-content-search"
                      onChange={(event) => setCourseSearch(event.target.value)}
                      placeholder="Поиск курса"
                      value={courseSearch}
                    />
                  </div>
                ) : null}

                {activeAdminDrawer === 'orders' ? (
                  <>
                    <div className="field">
                      <label className="sr-only" htmlFor="admin-order-search">Поиск по заказам</label>
                      <input
                        id="admin-order-search"
                        onChange={(event) => setOrderSearch(event.target.value)}
                        placeholder="Поиск по заказам"
                        value={orderSearch}
                      />
                    </div>
                    <div className="admin-filter-row">
                      {ORDER_STATUS_FILTERS.map((status) => (
                          <button
                            key={status}
                            aria-pressed={orderFilter === status}
                            className={`catalog-directory__filter-pill ${
                              orderFilter === status ? 'catalog-directory__filter-pill--active' : ''
                            }`}
                            onClick={() => setOrderFilter(status)}
                            type="button"
                          >
                            {ORDER_FILTER_LABELS[status]}
                          </button>
                        ))}
                    </div>
                  </>
                ) : null}

                {activeAdminDrawer === 'users' ? (
                  <>
                    <div className="field">
                      <label className="sr-only" htmlFor="admin-user-search">Поиск по пользователям</label>
                      <input
                        id="admin-user-search"
                        onChange={(event) => setUserSearch(event.target.value)}
                        placeholder="Поиск по email или имени"
                        value={userSearch}
                      />
                    </div>
                    <div className="admin-filter-row">
                      {(['ALL', 'ADMIN', 'USER', 'ACTIVE_ORDER', 'HAS_ACCESS'] as const).map((filterKey) => (
                        <button
                          key={filterKey}
                          aria-pressed={userListFilter === filterKey}
                          className={`catalog-directory__filter-pill ${
                            userListFilter === filterKey ? 'catalog-directory__filter-pill--active' : ''
                          }`}
                          onClick={() => setUserListFilter(filterKey)}
                          type="button"
                        >
                          {USER_FILTER_LABELS[filterKey]}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}

                {activeAdminDrawer === 'accesses' ? (
                  <>
                    <div className="field">
                      <label className="sr-only" htmlFor="admin-access-search">Поиск по доступам</label>
                      <input
                        id="admin-access-search"
                        onChange={(event) => setAccessSearch(event.target.value)}
                        placeholder="Поиск доступа"
                        value={accessSearch}
                      />
                    </div>
                    <div className="admin-filter-row">
                      {(['ALL', 'order', 'free'] as const).map((filterKey) => (
                        <button
                          key={filterKey}
                          aria-pressed={accessSourceFilter === filterKey}
                          className={`catalog-directory__filter-pill ${
                            accessSourceFilter === filterKey ? 'catalog-directory__filter-pill--active' : ''
                          }`}
                          onClick={() => setAccessSourceFilter(filterKey)}
                          type="button"
                        >
                          {ACCESS_FILTER_LABELS[filterKey]}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>

              {drawerContextLabel ? (
                <div className="admin-drawer__context">
                  <div className="admin-drawer__context-copy">
                    <span className="eyebrow">Текущий раздел</span>
                    <strong>{drawerContextLabel}</strong>
                  </div>
                  {activeAdminDrawer === 'content' && selectedCourse ? (
                    <span className="mono admin-drawer__context-meta">{selectedCourse.slug}</span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="admin-drawer__body">
              <section className="admin-secondary-stack admin-secondary-stack--drawer">
        <details
          className="admin-collapsible-section"
          data-drawer-section="review"
          open={activeAdminDrawer === 'review'}
        >
          <summary className="admin-collapsible-section__summary">
            <div>
              <span className="eyebrow">Проверка</span>
              <strong>Проверка оплат</strong>
              <p>Очередь и памятка.</p>
            </div>
            <span className="admin-section__count">{manualReviewOrders.length}</span>
          </summary>
          <div className="admin-collapsible-section__body">
      <article className="panel admin-section" id="admin-guide">
        <div className="admin-section__head">
          <span className="eyebrow">Памятка</span>
          <h2>Перед подтверждением оплаты</h2>
          <p className="panel-copy">Короткие правила. Полная инструкция доступна на странице `/admin/help`.</p>
        </div>

        <div className="grid-two">
          <article className="status-card">
            <strong>Ручная проверка оплаты</strong>
            <ul className="utility-list utility-list--bullets">
              {adminManualQueueHints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </article>

          <article className="status-card">
            <strong>Предупреждения</strong>
            <ul className="utility-list utility-list--bullets">
              {adminSafetyHints.slice(0, 4).map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </article>
        </div>
      </article>

      <article className="panel admin-section" id="manual-review">
        <div className="admin-section__head">
          <span className="eyebrow">Ручная проверка</span>
          <h2>Заказы на проверке</h2>
          <p className="panel-copy">Подтверждайте заказ только после сверки поступления.</p>
        </div>

        <div className="admin-mobile-panel-list admin-mobile-panel-list--review">
          {filteredManualReviewOrders.length > 0 ? (
            filteredManualReviewOrders.map((item) => (
              <article key={item.id} className="admin-mobile-record admin-mobile-record--review">
                <div className="admin-mobile-record__head">
                  <strong className="mono">{item.userEmail}</strong>
                  <span className={getBadgeClass(item.status)}>{getOrderStatusLabel(item.status)}</span>
                </div>
                <div className="admin-mobile-record__meta">
                  <span>{item.courseTitle}</span>
                  <span>{formatMoney(item.amount)}</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
                <AdminManualReviewActions orderId={item.id} />
              </article>
            ))
          ) : (
            <p className="muted-text" style={{ margin: 0 }}>
              Заказов в ручной проверке пока нет.
            </p>
          )}
        </div>

        <div className="admin-table-wrap admin-table-wrap--desktop">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Почта</th>
                <th>Курс / тариф</th>
                <th>Сумма</th>
                <th>Создан</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredManualReviewOrders.length > 0 ? (
                filteredManualReviewOrders.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <a href={`#admin-user-${item.userId}`}>{item.userName || 'Без имени'}</a>
                      <div className="muted-text admin-cell__sub mono">Заказ #{item.id}</div>
                    </td>
                    <td className="mono">{item.userEmail}</td>
                    <td>
                      <button
                        className="admin-inline-link"
                        onClick={() => jumpToCourseEditor(item.courseId)}
                        type="button"
                      >
                        {item.courseTitle}
                      </button>
                      <div className="muted-text admin-cell__sub">
                        {item.tariffTitle} / <span className="mono">{item.courseSlug}</span>
                      </div>
                    </td>
                    <td>{formatMoney(item.amount)}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>
                      <span className={getBadgeClass(item.status)}>{getOrderStatusLabel(item.status)}</span>
                    </td>
                    <td>
                      <AdminManualReviewActions orderId={item.id} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <p className="muted-text" style={{ margin: 0 }}>
                      Заказов в ручной проверке сейчас нет.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
          </div>
        </details>

        <details
          className="admin-collapsible-section"
          data-drawer-section="content"
          open={activeAdminDrawer === 'content'}
        >
          <summary className="admin-collapsible-section__summary">
            <div>
              <span className="eyebrow">Контент</span>
              <strong>Курсы, уроки и тарифы</strong>
              <p>Редактор курсов, уроков и тарифов.</p>
            </div>
            <span className="admin-section__count">{initialData.courses.length}</span>
          </summary>
          <div className="admin-collapsible-section__body">

      <article className="panel admin-section" id="admin-courses">
        <div className="admin-section__head">
          <span className="eyebrow">Контент</span>
          <h2>Редактор курсов, уроков и тарифов</h2>
          <p className="panel-copy">Список можно скрыть, тогда редактор займет всю ширину.</p>
        </div>

        <div
          className={`admin-editor-grid ${
            selectedCourse && !isContentSidebarOpen ? 'admin-editor-grid--focused' : ''
          }`}
        >
          {!selectedCourse || isContentSidebarOpen ? (
            <aside className="panel admin-editor-sidebar">
            <div className="admin-editor-sidebar__head">
              <h3>Курсы</h3>
              <span className="muted-text">{initialData.courses.length} в базе</span>
            </div>

            <div className="admin-course-list">
              {filteredContentCourses.map((course) => (
                <button
                  key={course.id}
                  className={`admin-course-list__item ${
                    selectedCourseId === course.id ? 'admin-course-list__item--active' : ''
                  }`}
                  onClick={() => handleSelectCourse(course.id)}
                  type="button"
                >
                  <div className="admin-course-list__top">
                    <strong>{course.title}</strong>
                    <span className={getBadgeClass(course.state)}>
                      {getCourseStateLabel(course.state)}
                    </span>
                  </div>
                  <div className="admin-course-list__meta-row">
                    <span className="mono">{course.slug}</span>
                    <span>{course.groupTitle}</span>
                    <span>{course.lessonsCount} уроков</span>
                    <span>{course.previewLessonsCount} ознакомительных</span>
                  </div>
                  <span className="admin-course-list__action">Открыть редактор</span>
                </button>
              ))}
            </div>

              <div className="admin-editor-sidebar__create" id="admin-create-course">
              <h3>Новый курс</h3>
              <div className="field">
                <label htmlFor="admin-new-course-title">Название</label>
                <input
                  id="admin-new-course-title"
                  onChange={(event) =>
                    setCreateCourseDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Новый курс"
                  value={createCourseDraft.title}
                />
              </div>
              <div className="field">
                <label htmlFor="admin-new-course-slug">Слаг курса</label>
                <input
                  id="admin-new-course-slug"
                  onChange={(event) =>
                    setCreateCourseDraft((current) => ({
                      ...current,
                      slug: event.target.value,
                    }))
                  }
                  placeholder="novyy-kurs"
                  value={createCourseDraft.slug}
                />
              </div>
              <div className="field">
                <label htmlFor="admin-new-course-description">Короткое описание</label>
                <textarea
                  id="admin-new-course-description"
                  onChange={(event) =>
                    setCreateCourseDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Короткое описание курса для витрины"
                  value={createCourseDraft.description}
                />
              </div>
              <label className="checkbox-row">
                <input
                  checked={createCourseDraft.isPublished}
                  onChange={(event) =>
                    setCreateCourseDraft((current) => ({
                      ...current,
                      isPublished: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>Сразу опубликовать</span>
              </label>
              <button
                className="primary-button"
                disabled={pendingKey === 'create-course'}
                onClick={handleCreateCourse}
                type="button"
              >
                {pendingKey === 'create-course' ? 'Создаем...' : 'Создать курс'}
              </button>
            </div>

            {courseFeedback ? (
              <p
                className={`feedback ${
                  courseFeedback.tone === 'success' ? 'feedback-success' : 'feedback-error'
                }`}
              >
                {courseFeedback.message}
              </p>
            ) : null}
          </aside>
          ) : null}

          <div className="admin-editor-main">
            {selectedCourse ? (
              <>
                <div className="panel admin-editor-context-strip">
                  <div className="admin-editor-context-strip__copy">
                    <span className="eyebrow">Редактирование</span>
                    <strong>{selectedCourse.title}</strong>
                    <p className="mono">{selectedCourse.slug}</p>
                  </div>
                  <div className="admin-editor-context-strip__tools">
                    {initialData.courses.length > 1 ? (
                      <AdminCompactSelect
                        ariaLabel="Выбрать курс"
                        emptyText="Курсы не найдены"
                        onChange={(nextValue) => handleSelectCourse(Number(nextValue))}
                        options={initialData.courses.map((course) => ({
                          value: course.id,
                          label: course.title,
                          meta: course.slug,
                          badge: getCourseStateLabel(course.state),
                          badgeClass: getBadgeClass(course.state),
                          searchText: `${course.title} ${course.slug} ${course.groupTitle} ${course.state}`,
                        }))}
                        placeholder="Выберите курс"
                        searchPlaceholder="Найти курс"
                        value={selectedCourse.id}
                      />
                    ) : null}
                  </div>
                  <div className="admin-editor-context-strip__actions">
                    <button
                      aria-label={isContentSidebarOpen ? 'Скрыть список курсов' : 'Показать список курсов'}
                      className="ghost-button"
                      onClick={() => setIsContentSidebarOpen((current) => !current)}
                      type="button"
                    >
                      {isContentSidebarOpen ? 'Скрыть список' : 'Показать список'}
                    </button>
                    <button className="ghost-button" onClick={handleOpenCreateCourse} type="button">
                      Новый курс
                    </button>
                  </div>
                </div>

                <article
                  className="panel admin-editor-card"
                  id={`admin-course-${selectedCourse.id}`}
                  ref={courseEditorRef}
                >
                  <div className="admin-editor-card__head">
                    <div>
                      <span className="eyebrow">Курс</span>
                      <h3>{selectedCourse.title}</h3>
                    </div>
                    <span className={getBadgeClass(selectedCourse.state)}>
                      {getCourseStateLabel(selectedCourse.state)}
                    </span>
                  </div>

                  <div className="admin-editor-card__stats">
                    <div className="admin-inline-stat">
                      <span>Направление</span>
                      <strong>{selectedCourse.groupTitle}</strong>
                    </div>
                    <div className="admin-inline-stat">
                      <span>Покупка</span>
                      <strong>
                        {selectedCourse.hasActiveTariff ? 'Доступна через тариф' : 'Нет активного тарифа'}
                      </strong>
                    </div>
                    <div className="admin-inline-stat">
                      <span>Ознакомительные уроки</span>
                      <strong>{selectedCourse.previewLessonsCount} уроков</strong>
                    </div>
                    <div className="admin-inline-stat">
                      <span>Опубликовано уроков</span>
                      <strong>{selectedCourse.publishedLessonsCount}</strong>
                    </div>
                  </div>

                  <p className="panel-copy">{selectedCourse.statusNote}</p>

                  <div className="field">
                    <label htmlFor="admin-course-title">Название курса</label>
                    <input
                      id="admin-course-title"
                      onChange={(event) =>
                        setCourseDraft((current) =>
                          current
                            ? {
                                ...current,
                                title: event.target.value,
                              }
                            : current
                        )
                      }
                      value={courseDraft?.title ?? ''}
                    />
                  </div>

                  <div className="admin-readonly-grid">
                    <div className="field">
                      <label htmlFor="admin-course-slug">Слаг курса</label>
                      <input disabled id="admin-course-slug" value={selectedCourse.slug} />
                    </div>
                    <div className="field">
                      <label htmlFor="admin-course-group">Направление</label>
                      <input disabled id="admin-course-group" value={selectedCourse.groupTitle} />
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="admin-course-description">Короткое описание</label>
                    <textarea
                      id="admin-course-description"
                      onChange={(event) =>
                        setCourseDraft((current) =>
                          current
                            ? {
                                ...current,
                                description: event.target.value,
                              }
                            : current
                        )
                      }
                      value={courseDraft?.description ?? ''}
                    />
                  </div>

                  <label className="checkbox-row">
                    <input
                      checked={courseDraft?.isPublished ?? false}
                      onChange={(event) =>
                        setCourseDraft((current) =>
                          current
                            ? {
                                ...current,
                                isPublished: event.target.checked,
                              }
                            : current
                        )
                      }
                      type="checkbox"
                    />
                    <span>Курс опубликован</span>
                  </label>

                  <div className="admin-note">
                    <p>{selectedCourse.courseSlugPolicy} Направление курса определяется правилами каталога.</p>
                  </div>

                  <div className="row-actions">
                    <button
                      className="primary-button"
                      disabled={pendingKey === 'save-course'}
                      onClick={handleSaveCourse}
                      type="button"
                    >
                      {pendingKey === 'save-course' ? 'Сохраняем...' : 'Сохранить курс'}
                    </button>
                    <Link className="ghost-button" href={`/catalog/${selectedCourse.slug}`} target="_blank">
                      Открыть страницу курса
                    </Link>
                  </div>
                </article>

                <article className="panel admin-editor-card" id="admin-lessons">
                  <div className="admin-editor-card__head">
                    <div>
                      <span className="eyebrow">Уроки</span>
                      <h3>Порядок, ознакомительные уроки и публикация</h3>
                    </div>
                    <span className="muted-text">{selectedCourse.lessonsCount} всего</span>
                  </div>

                  <div className="admin-lesson-order">
                    {orderedLessons.map((lesson, index) => (
                      <div key={lesson.id} className="admin-lesson-order__item">
                        <div className="admin-lesson-order__summary">
                          <strong>
                            {index + 1}. {lesson.title}
                          </strong>
                          <div className="admin-lesson-order__meta">
                            <span className={getBadgeClass(lesson.isPublished ? 'free' : 'hidden')}>
                              {lesson.isPublished ? 'Опубликован' : 'Скрыт'}
                            </span>
                            {lesson.isPreview ? (
                              <span className="badge badge-pending">Ознакомительный</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="admin-lesson-order__actions">
                          <button
                            className="ghost-button"
                            disabled={index === 0}
                            onClick={() => moveLesson(lesson.id, 'up')}
                            type="button"
                          >
                            Вверх
                          </button>
                          <button
                            className="ghost-button"
                            disabled={index === orderedLessons.length - 1}
                            onClick={() => moveLesson(lesson.id, 'down')}
                            type="button"
                          >
                            Вниз
                          </button>
                          <button
                            className="secondary-button"
                            onClick={() => setSelectedLessonId(lesson.id)}
                            type="button"
                          >
                            Редактировать
                          </button>
                          <button
                            className="ghost-button"
                            disabled={pendingKey === `delete-lesson-${lesson.id}`}
                            onClick={() => handleDeleteLesson(lesson)}
                            type="button"
                          >
                            {pendingKey === `delete-lesson-${lesson.id}` ? 'Удаляем...' : 'Удалить'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="row-actions">
                    <button
                      className="primary-button"
                      disabled={!isLessonOrderDirty || pendingKey === 'save-lesson-order'}
                      onClick={handleSaveLessonOrder}
                      type="button"
                    >
                      {pendingKey === 'save-lesson-order'
                        ? 'Сохраняем порядок...'
                        : 'Сохранить порядок уроков'}
                    </button>
                  </div>

                  {selectedLesson && lessonDraft ? (
                    <div className="admin-subeditor">
                      <div className="admin-subeditor__head">
                        <h4>Редактирование урока</h4>
                        <span className="mono">{selectedLesson.slug}</span>
                      </div>
                      <div className="field">
                        <label htmlFor="admin-lesson-title">Название урока</label>
                        <input
                          id="admin-lesson-title"
                          onChange={(event) =>
                            setLessonDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    title: event.target.value,
                                  }
                                : current
                            )
                          }
                          value={lessonDraft.title}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="admin-lesson-description">Короткое описание</label>
                        <textarea
                          id="admin-lesson-description"
                          onChange={(event) =>
                            setLessonDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    description: event.target.value,
                                  }
                                : current
                            )
                          }
                          value={lessonDraft.description}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="admin-lesson-content">Контент</label>
                        <textarea
                          id="admin-lesson-content"
                          onChange={(event) =>
                            setLessonDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    content: event.target.value,
                                  }
                                : current
                            )
                          }
                          value={lessonDraft.content}
                        />
                      </div>
                      <div className="admin-toggle-grid">
                        <label className="checkbox-row">
                          <input
                            checked={lessonDraft.isPublished}
                            onChange={(event) =>
                              setLessonDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      isPublished: event.target.checked,
                                    }
                                  : current
                              )
                            }
                            type="checkbox"
                          />
                          <span>Урок опубликован</span>
                        </label>
                        <label className="checkbox-row">
                          <input
                            checked={lessonDraft.isPreview}
                            onChange={(event) =>
                              setLessonDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      isPreview: event.target.checked,
                                    }
                                  : current
                              )
                            }
                            type="checkbox"
                          />
                          <span>Открыт как ознакомительный урок</span>
                        </label>
                      </div>
                      <div className="row-actions">
                        <button
                          className="primary-button"
                          disabled={pendingKey === 'save-lesson'}
                          onClick={handleSaveLesson}
                          type="button"
                        >
                          {pendingKey === 'save-lesson' ? 'Сохраняем...' : 'Сохранить урок'}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="admin-subeditor">
                    <div className="admin-subeditor__head">
                      <h4>Новый урок</h4>
                      <span className="muted-text">Слаг создается автоматически</span>
                    </div>
                    <div className="field">
                      <label htmlFor="admin-new-lesson-title">Название</label>
                      <input
                        id="admin-new-lesson-title"
                        onChange={(event) =>
                          setCreateLessonDraft((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        value={createLessonDraft.title}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="admin-new-lesson-description">Короткое описание</label>
                      <textarea
                        id="admin-new-lesson-description"
                        onChange={(event) =>
                          setCreateLessonDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        value={createLessonDraft.description}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="admin-new-lesson-content">Контент</label>
                      <textarea
                        id="admin-new-lesson-content"
                        onChange={(event) =>
                          setCreateLessonDraft((current) => ({
                            ...current,
                            content: event.target.value,
                          }))
                        }
                        value={createLessonDraft.content}
                      />
                    </div>
                    <div className="admin-toggle-grid">
                      <label className="checkbox-row">
                        <input
                          checked={createLessonDraft.isPublished}
                          onChange={(event) =>
                            setCreateLessonDraft((current) => ({
                              ...current,
                              isPublished: event.target.checked,
                            }))
                          }
                          type="checkbox"
                        />
                        <span>Сразу опубликовать</span>
                      </label>
                      <label className="checkbox-row">
                        <input
                          checked={createLessonDraft.isPreview}
                          onChange={(event) =>
                            setCreateLessonDraft((current) => ({
                              ...current,
                              isPreview: event.target.checked,
                            }))
                          }
                          type="checkbox"
                          />
                        <span>Сделать ознакомительным уроком</span>
                      </label>
                    </div>
                    <button
                      className="primary-button"
                      disabled={pendingKey === 'create-lesson'}
                      onClick={handleCreateLesson}
                      type="button"
                    >
                      {pendingKey === 'create-lesson' ? 'Добавляем...' : 'Добавить урок'}
                    </button>
                  </div>

                  {lessonFeedback ? (
                    <p
                      className={`feedback ${
                        lessonFeedback.tone === 'success' ? 'feedback-success' : 'feedback-error'
                      }`}
                    >
                      {lessonFeedback.message}
                    </p>
                  ) : null}
                </article>

                <article className="panel admin-editor-card" id="admin-tariffs">
                  <div className="admin-editor-card__head">
                    <div>
                      <span className="eyebrow">Тарифы</span>
                      <h3>Цена и доступ для новых покупок</h3>
                    </div>
                    <span className="muted-text">
                      {selectedCourse.hasActiveTariff
                        ? `Активный: ${selectedCourse.activeTariffTitle}`
                        : 'Активного тарифа нет'}
                    </span>
                  </div>

                  <p className="panel-copy">{selectedCourse.tariffSlugPolicy}</p>

                  <div className="admin-tariff-list">
                    {selectedCourse.tariffs.length > 0 ? (
                      selectedCourse.tariffs.map((tariff) => (
                        <button
                          key={tariff.id}
                          className={`admin-tariff-list__item ${
                            selectedTariffId === tariff.id ? 'admin-tariff-list__item--active' : ''
                          }`}
                          onClick={() => setSelectedTariffId(tariff.id)}
                          type="button"
                        >
                          <div className="admin-tariff-list__top">
                            <strong>{tariff.title}</strong>
                            <span className={getBadgeClass(tariff.isActive ? 'paid' : 'hidden')}>
                              {tariff.isActive ? 'Активен' : 'Выключен'}
                            </span>
                          </div>
                          <div className="admin-tariff-list__meta-row">
                            <span className="mono">{tariff.slug}</span>
                            <span>{formatMoney(tariff.price)}</span>
                            <span>{tariff.ordersCount} заказов</span>
                          </div>
                          <span className="admin-tariff-list__action">Открыть тариф</span>
                        </button>
                      ))
                    ) : (
                      <p className="muted-text" style={{ margin: 0 }}>
                        У курса пока нет тарифов. Если курс опубликован, без активного тарифа он
                        считается бесплатным.
                      </p>
                    )}
                  </div>

                  {selectedTariff && tariffDraft ? (
                    <div className="admin-subeditor">
                      <div className="admin-subeditor__head">
                        <h4>Редактирование тарифа</h4>
                        <span className="mono">{selectedTariff.slug}</span>
                      </div>
                      <div className="field">
                        <label htmlFor="admin-tariff-title">Название тарифа</label>
                        <input
                          id="admin-tariff-title"
                          onChange={(event) =>
                            setTariffDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    title: event.target.value,
                                  }
                                : current
                            )
                          }
                          value={tariffDraft.title}
                        />
                      </div>
                      <div className="admin-readonly-grid">
                        <div className="field">
                          <label htmlFor="admin-tariff-price">Цена</label>
                          <input
                            id="admin-tariff-price"
                            inputMode="numeric"
                            onChange={(event) =>
                              setTariffDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      price: event.target.value,
                                    }
                                  : current
                              )
                            }
                            value={tariffDraft.price}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="admin-tariff-interval">Тип доступа</label>
                          <input
                            id="admin-tariff-interval"
                            onChange={(event) =>
                              setTariffDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      interval: event.target.value,
                                    }
                                  : current
                              )
                            }
                            value={tariffDraft.interval}
                          />
                        </div>
                      </div>
                      <label className="checkbox-row">
                        <input
                          checked={tariffDraft.isActive}
                          onChange={(event) =>
                            setTariffDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    isActive: event.target.checked,
                                  }
                                : current
                            )
                          }
                          type="checkbox"
                        />
                        <span>Тариф активен для покупки</span>
                      </label>
                      <button
                        className="primary-button"
                        disabled={pendingKey === 'save-tariff'}
                        onClick={handleSaveTariff}
                        type="button"
                      >
                        {pendingKey === 'save-tariff' ? 'Сохраняем...' : 'Сохранить тариф'}
                      </button>
                    </div>
                  ) : null}

                  <div className="admin-subeditor">
                    <div className="admin-subeditor__head">
                      <h4>Новый тариф</h4>
                      <span className="muted-text">Сделает курс платным</span>
                    </div>
                    <div className="field">
                      <label htmlFor="admin-new-tariff-title">Название тарифа</label>
                      <input
                        id="admin-new-tariff-title"
                        onChange={(event) =>
                          setCreateTariffDraft((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        value={createTariffDraft.title}
                      />
                    </div>
                    <div className="admin-readonly-grid">
                      <div className="field">
                        <label htmlFor="admin-new-tariff-slug">Слаг тарифа</label>
                        <input
                          id="admin-new-tariff-slug"
                          onChange={(event) =>
                            setCreateTariffDraft((current) => ({
                              ...current,
                              slug: event.target.value,
                            }))
                          }
                          value={createTariffDraft.slug}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="admin-new-tariff-price">Цена</label>
                        <input
                          id="admin-new-tariff-price"
                          inputMode="numeric"
                          onChange={(event) =>
                            setCreateTariffDraft((current) => ({
                              ...current,
                              price: event.target.value,
                            }))
                          }
                          value={createTariffDraft.price}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="admin-new-tariff-interval">Тип доступа</label>
                      <input
                        id="admin-new-tariff-interval"
                        onChange={(event) =>
                          setCreateTariffDraft((current) => ({
                            ...current,
                            interval: event.target.value,
                          }))
                        }
                        value={createTariffDraft.interval}
                      />
                    </div>
                    <label className="checkbox-row">
                      <input
                        checked={createTariffDraft.isActive}
                        onChange={(event) =>
                          setCreateTariffDraft((current) => ({
                            ...current,
                            isActive: event.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      <span>Сразу сделать активным</span>
                    </label>
                    <button
                      className="primary-button"
                      disabled={pendingKey === 'create-tariff'}
                      onClick={handleCreateTariff}
                      type="button"
                    >
                      {pendingKey === 'create-tariff' ? 'Создаем...' : 'Создать тариф'}
                    </button>
                  </div>

                  {tariffFeedback ? (
                    <p
                      className={`feedback ${
                        tariffFeedback.tone === 'success' ? 'feedback-success' : 'feedback-error'
                      }`}
                    >
                      {tariffFeedback.message}
                    </p>
                  ) : null}
                </article>
              </>
            ) : (
              <article className="panel admin-editor-card">
                <h3>Курсов пока нет</h3>
                <p className="panel-copy">
                  Создайте курс, затем добавьте уроки и тарифы.
                </p>
              </article>
            )}
          </div>
        </div>
      </article>
          </div>
        </details>

        <details
          className="admin-collapsible-section"
          data-drawer-section="journals"
          open={
            activeAdminDrawer === 'orders' ||
            activeAdminDrawer === 'users' ||
            activeAdminDrawer === 'accesses'
          }
        >
          <summary className="admin-collapsible-section__summary">
            <div>
              <span className="eyebrow">Журналы</span>
              <strong>Все заказы, пользователи и доступы</strong>
              <p>Таблицы и фильтры.</p>
            </div>
            <span className="admin-section__count">
              {initialData.orders.length + initialData.users.length + initialData.enrollments.length}
            </span>
          </summary>
          <div className="admin-collapsible-section__body">

      <article className="panel admin-section admin-mobile-data-hub" id="admin-accesses">
        <div className="admin-section__head">
          <span className="eyebrow">Данные</span>
          <h2>Пользователи, заказы и доступы</h2>
          <p className="panel-copy">
            Переключайте вкладки ниже.
          </p>
        </div>

        <div className="admin-mobile-tabs" role="tablist" aria-label="Панели админки">
          <button
            aria-selected={mobileAdminPanel === 'users'}
            className={`admin-mobile-tabs__button ${
              mobileAdminPanel === 'users' ? 'admin-mobile-tabs__button--active' : ''
            }`}
            onClick={() => setMobileAdminPanel('users')}
            role="tab"
            type="button"
          >
            <UsersIcon />
            <span>Пользователи</span>
          </button>
          <button
            aria-selected={mobileAdminPanel === 'orders'}
            className={`admin-mobile-tabs__button ${
              mobileAdminPanel === 'orders' ? 'admin-mobile-tabs__button--active' : ''
            }`}
            onClick={() => setMobileAdminPanel('orders')}
            role="tab"
            type="button"
          >
            <OrdersIcon />
            <span>Заказы</span>
          </button>
          <button
            aria-selected={mobileAdminPanel === 'accesses'}
            className={`admin-mobile-tabs__button ${
              mobileAdminPanel === 'accesses' ? 'admin-mobile-tabs__button--active' : ''
            }`}
            onClick={() => setMobileAdminPanel('accesses')}
            role="tab"
            type="button"
          >
            <AccessIcon />
            <span>Доступы</span>
          </button>
        </div>

        <div className="admin-mobile-panel-list" role="tabpanel">
          {mobileAdminPanel === 'users'
            ? filteredJournalUsers.map((item) => (
                <article key={item.id} className="admin-mobile-record">
                  <div className="admin-mobile-record__head">
                    <strong className="mono">{item.email}</strong>
                    <span className={getBadgeClass(item.role)}>{getRoleLabel(item.role)}</span>
                  </div>
                  <div className="admin-mobile-record__meta">
                    <span>Доступов: {item.accessibleCoursesCount}</span>
                    <span>Заказов: {userOrderCountMap.get(item.id) ?? 0}</span>
                    <span>{item.hasPendingOrder ? 'Есть активный заказ' : 'Без активного заказа'}</span>
                  </div>
                </article>
              ))
            : null}

          {mobileAdminPanel === 'orders'
            ? filteredJournalOrders.map((item) => (
                <article key={item.id} className="admin-mobile-record">
                  <div className="admin-mobile-record__head">
                    <strong>{item.courseTitle}</strong>
                    <span className={getBadgeClass(item.status)}>{getOrderStatusLabel(item.status)}</span>
                  </div>
                  <div className="admin-mobile-record__meta">
                    <span className="mono">{item.userEmail}</span>
                    <span>{formatMoney(item.amount)}</span>
                    <span>{getPaymentMethodLabel(item.paymentMethod)}</span>
                    <span>{formatDate(item.updatedAt)}</span>
                  </div>
                </article>
              ))
            : null}

          {mobileAdminPanel === 'accesses'
            ? filteredJournalEnrollments.map((item) => (
                <article key={item.id} className="admin-mobile-record">
                  <div className="admin-mobile-record__head">
                    <strong className="mono">{item.userEmail}</strong>
                    <span className={getBadgeClass(item.source)}>
                      {getEnrollmentSourceLabel(item.source)}
                    </span>
                  </div>
                  <div className="admin-mobile-record__meta">
                    <span>{item.courseTitle}</span>
                    <span className="mono">{item.courseSlug}</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </article>
              ))
            : null}
        </div>
      </article>

      <article className="panel admin-section admin-section--desktop-data" id="admin-orders">
        <div className="admin-section__head">
          <span className="eyebrow">Заказы</span>
          <h2>Все заказы и статусы оплаты</h2>
          <p className="panel-copy">
            Фильтры по статусам и переход к курсу или пользователю.
          </p>
        </div>

        {orderDetailCard}

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
              {filteredJournalOrders.length > 0 ? (
                filteredJournalOrders.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button
                        className="admin-inline-link"
                        onClick={() => handleSelectOrder(item.id, { openDrawer: false })}
                        type="button"
                      >
                        {item.courseTitle}
                      </button>
                      <div className="muted-text admin-cell__sub">
                        {item.tariffTitle} / <span className="mono">{item.courseSlug}</span>
                      </div>
                    </td>
                    <td>
                      <button className="admin-inline-link mono" onClick={() => handleOpenUserDetail(item.userId)} type="button">
                        {item.userEmail}
                      </button>
                    </td>
                    <td>{formatMoney(item.amount)}</td>
                    <td>
                      <span className={getBadgeClass(item.status)}>{getOrderStatusLabel(item.status)}</span>
                    </td>
                    <td>{getPaymentMethodLabel(item.paymentMethod)}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>{formatDate(item.updatedAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <p className="muted-text" style={{ margin: 0 }}>
                      По выбранному фильтру заказов нет.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel admin-section admin-section--desktop-data" id="admin-users">
        <div className="admin-section__head">
          <span className="eyebrow">Пользователи</span>
          <h2>Кто уже в системе</h2>
        </div>

        {userManagementDetailCard}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Почта</th>
                <th>Роль</th>
                <th>Создан</th>
                <th>Доступных курсов</th>
                <th>Заказов</th>
                <th>Активный заказ</th>
              </tr>
            </thead>
            <tbody>
              {filteredJournalUsers.length > 0 ? (
                filteredJournalUsers.map((item) => (
                  <tr id={`admin-user-${item.id}`} key={item.id}>
                    <td>
                      <button className="admin-inline-link mono" onClick={() => handleOpenUserDetail(item.id)} type="button">
                        {item.email}
                      </button>
                    </td>
                    <td>
                      <span className={getBadgeClass(item.role)}>{getRoleLabel(item.role)}</span>
                    </td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>{item.accessibleCoursesCount}</td>
                    <td>{userOrderCountMap.get(item.id) ?? 0}</td>
                    <td>{item.hasPendingOrder ? 'Да' : 'Нет'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <p className="muted-text" style={{ margin: 0 }}>
                      Пользователей пока нет.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel admin-section admin-section--desktop-data" id="admin-accesses-table">
        <div className="admin-section__head">
          <span className="eyebrow">Доступы</span>
          <h2>Кто уже получил курс</h2>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Курс</th>
                <th>Источник</th>
                <th>Создан</th>
              </tr>
            </thead>
            <tbody>
              {filteredJournalEnrollments.length > 0 ? (
                filteredJournalEnrollments.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button className="admin-inline-link mono" onClick={() => handleOpenUserDetail(item.userId)} type="button">
                        {item.userEmail}
                      </button>
                    </td>
                    <td>
                      <button
                        className="admin-inline-link"
                        onClick={() => jumpToCourseEditor(item.courseId)}
                        type="button"
                      >
                        {item.courseTitle}
                      </button>
                      <div className="muted-text admin-cell__sub mono">{item.courseSlug}</div>
                    </td>
                    <td>
                      <span className={getBadgeClass(item.source)}>
                        {getEnrollmentSourceLabel(item.source)}
                      </span>
                    </td>
                    <td>{formatDate(item.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>
                    <p className="muted-text" style={{ margin: 0 }}>
                      Выданных доступов пока нет.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
          </div>
        </details>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
