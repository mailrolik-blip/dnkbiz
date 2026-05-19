'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import type {
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

type FeedbackState = {
  tone: 'success' | 'error';
  message: string;
} | null;

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
type UserListFilter = 'ALL' | 'ADMIN' | 'USER' | 'ACTIVE_ORDER';
type AccessSourceFilter = 'ALL' | AdminEnrollmentRow['source'];
type TrendPoint = {
  label: string;
  value: number;
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

function formatDate(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function formatMoney(amount: number) {
  return moneyFormatter.format(amount);
}

function formatShortDate(value: string) {
  return shortDateFormatter.format(new Date(value));
}

function getAdminInitials(email: string) {
  const name = email.split('@')[0] || 'AD';
  return name.slice(0, 2).toUpperCase();
}

function buildLastDaysSeries<T>(
  items: T[],
  getDate: (item: T) => string,
  getValue: (item: T) => number = () => 1,
  days = 7
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    return {
      key: date.toISOString().slice(0, 10),
      label: shortDateFormatter.format(date),
      value: 0,
    };
  });

  const map = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const item of items) {
    const date = new Date(getDate(item));
    date.setHours(0, 0, 0, 0);
    const key = date.toISOString().slice(0, 10);
    const bucket = map.get(key);

    if (bucket) {
      bucket.value += getValue(item);
    }
  }

  return buckets;
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

  return buckets.map((bucket) => ({ label: bucket.label, value: bucket.value }));
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
  PAID: 'Оплачены',
  FAILED: 'Сбой',
  PENDING: 'Ждут',
  CANCELED: 'Отмена',
  EXPIRED: 'Истекли',
};
const USER_FILTER_LABELS: Record<UserListFilter, string> = {
  ALL: 'Все',
  ADMIN: 'Админы',
  USER: 'Ученики',
  ACTIVE_ORDER: 'С заказом',
};
const ACCESS_FILTER_LABELS: Record<AccessSourceFilter, string> = {
  ALL: 'Все',
  order: 'Из заказа',
  free: 'Бесплатно',
};

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

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m5 16.5 8.9-8.9 3.5 3.5-8.9 8.9L5 20l.5-3.5Z" />
      <path d="m13.1 7.5 2.4-2.4a1.7 1.7 0 0 1 2.4 0l1 1a1.7 1.7 0 0 1 0 2.4l-2.4 2.4" />
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

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m12 4 1.8 4.2L18 10l-4.2 1.8L12 16l-1.8-4.2L6 10l4.2-1.8L12 4Z" />
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

function ArrowTopRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 15 18 6" />
      <path d="M11 6h7v7" />
    </svg>
  );
}

function MiniTrendBars({
  points,
  tone = 'accent',
  formatValue = (value: number) => String(value),
}: {
  points: TrendPoint[];
  tone?: 'accent' | 'warning' | 'success';
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className={`admin-mini-trend admin-mini-trend--${tone}`}>
      {points.map((point) => (
        <div className="admin-mini-trend__item" key={point.label} title={`${point.label}: ${formatValue(point.value)}`}>
          <span
            className="admin-mini-trend__bar"
            style={{ height: `${Math.max((point.value / max) * 100, point.value > 0 ? 18 : 8)}%` }}
          />
          <span className="admin-mini-trend__label">{point.label}</span>
        </div>
      ))}
    </div>
  );
}

function MiniTrendChart({
  points,
  tone = 'accent',
  formatValue = (value: number) => String(value),
}: {
  points: TrendPoint[];
  tone?: 'accent' | 'warning' | 'success';
  formatValue?: (value: number) => string;
}) {
  const width = 320;
  const height = 120;
  const paddingX = 8;
  const paddingTop = 12;
  const chartHeight = 70;
  const max = Math.max(...points.map((point) => point.value), 1);
  const step = points.length > 1 ? (width - paddingX * 2) / (points.length - 1) : width - paddingX * 2;

  const coordinates = points.map((point, index) => {
    const x = paddingX + index * step;
    const y = paddingTop + chartHeight - (point.value / max) * chartHeight;
    return { ...point, x, y };
  });

  const linePath = coordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  const areaPath = `${linePath} L ${coordinates.at(-1)?.x ?? width - paddingX} ${paddingTop + chartHeight} L ${coordinates[0]?.x ?? paddingX} ${paddingTop + chartHeight} Z`;

  return (
    <div className={`admin-line-chart admin-line-chart--${tone}`}>
      <svg className="admin-line-chart__svg" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <path className="admin-line-chart__area" d={areaPath} />
        <path className="admin-line-chart__line" d={linePath} />
        {coordinates.map((point) => (
          <circle
            className="admin-line-chart__point"
            cx={point.x}
            cy={point.y}
            key={`${point.label}-${point.x}`}
            r="2.9"
          >
            <title>{`${point.label}: ${formatValue(point.value)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="admin-line-chart__labels">
        {points.map((point) => (
          <span key={point.label} title={`${point.label}: ${formatValue(point.value)}`}>
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardClient({
  initialData,
  adminEmail,
}: {
  initialData: AdminDashboardData;
  adminEmail: string;
}) {
  const router = useRouter();
  const courseEditorRef = useRef<HTMLElement | null>(null);
  const [courseFeedback, setCourseFeedback] = useState<FeedbackState>(null);
  const [lessonFeedback, setLessonFeedback] = useState<FeedbackState>(null);
  const [tariffFeedback, setTariffFeedback] = useState<FeedbackState>(null);
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
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserOrderFilter, setSelectedUserOrderFilter] = useState<OrderStatusFilter>('ALL');

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
  const filteredJournalUsers = useMemo(() => {
    return initialData.users.filter((user) => {
      const haystack = [user.email, user.role].join(' ').toLowerCase();
      const matchesSearch = !userSearchValue || haystack.includes(userSearchValue);
      const matchesFilter =
        userListFilter === 'ALL'
          ? true
          : userListFilter === 'ACTIVE_ORDER'
            ? user.hasPendingOrder
            : user.role === userListFilter;

      return matchesSearch && matchesFilter;
    });
  }, [initialData.users, userListFilter, userSearchValue]);
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
  const userNameMap = useMemo(() => {
    const map = new Map<number, string>();

    for (const order of initialData.orders) {
      if (order.userName && !map.has(order.userId)) {
        map.set(order.userId, order.userName);
      }
    }

    return map;
  }, [initialData.orders]);
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
  const selectedUserName = selectedUser ? userNameMap.get(selectedUser.id) ?? 'Не указано' : null;

  const featuredCourse = selectedCourse ?? initialData.courses[0] ?? null;
  const featuredTariff =
    featuredCourse?.tariffs.find((tariff) => tariff.isActive) ?? featuredCourse?.tariffs[0] ?? null;

  const featuredLessons = useMemo(() => {
    if (!featuredCourse) {
      return [];
    }

    return [...featuredCourse.lessons]
      .sort((left, right) => left.position - right.position)
      .slice(0, 4);
  }, [featuredCourse]);

  const dashboardTariffs = useMemo(() => {
    if (!featuredCourse) {
      return [];
    }

    return [...featuredCourse.tariffs]
      .sort((left, right) => Number(right.isActive) - Number(left.isActive))
      .slice(0, 2);
  }, [featuredCourse]);

  const dashboardManualReviewOrders = useMemo(
    () => manualReviewOrders.slice(0, 3),
    [manualReviewOrders]
  );
  const dashboardUsers = useMemo(() => initialData.users.slice(0, 3), [initialData.users]);
  const dashboardEnrollments = useMemo(
    () => initialData.enrollments.slice(0, 3),
    [initialData.enrollments]
  );
  const paidOrders = useMemo(
    () => initialData.orders.filter((order) => order.status === 'PAID'),
    [initialData.orders]
  );
  const paidRevenueTotal = useMemo(
    () => paidOrders.reduce((sum, order) => sum + order.amount, 0),
    [paidOrders]
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

  const activityItems = useMemo(() => {
    const orderEvents = manualReviewOrders.slice(0, 3).map((order) => ({
      id: `order-${order.id}`,
      timestamp: order.updatedAt,
      tone: 'warning' as const,
      title: `${order.userEmail} ожидает проверки`,
      meta: `${order.courseTitle} · ${formatMoney(order.amount)}`,
    }));

    const accessEvents = initialData.enrollments.slice(0, 4).map((enrollment) => ({
      id: `enrollment-${enrollment.id}`,
      timestamp: enrollment.createdAt,
      tone: 'accent' as const,
      title: `Доступ выдан: ${enrollment.userEmail}`,
      meta: enrollment.courseTitle,
    }));

    const userEvents = initialData.users.slice(0, 3).map((user) => ({
      id: `user-${user.id}`,
      timestamp: user.createdAt,
      tone: 'success' as const,
      title: `Новый пользователь: ${user.email}`,
      meta: getRoleLabel(user.role),
    }));

    return [...orderEvents, ...accessEvents, ...userEvents]
      .sort(
        (left, right) =>
          new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
      )
      .slice(0, 4);
  }, [initialData.enrollments, initialData.users, manualReviewOrders]);

  const overviewStats = useMemo(
    () => [
      {
        label: 'Пользователи',
        value: initialData.totals.users,
        note: `${dashboardUsers.length} в обзоре`,
      },
      {
        label: 'Заказы',
        value: initialData.totals.orders,
        note: `${filteredOrders.length} видимых`,
      },
      {
        label: 'Доступы',
        value: initialData.totals.enrollments,
        note: `${dashboardEnrollments.length} в обзоре`,
      },
      {
        label: 'Курсы',
        value: initialData.courses.length,
        note: `${initialData.totals.liveCourses} live`,
      },
      {
        label: 'Уроки',
        value: initialData.courses.reduce((sum, course) => sum + course.lessonsCount, 0),
        note: `${initialData.courses.reduce((sum, course) => sum + course.publishedLessonsCount, 0)} live`,
      },
      {
        label: 'На проверке',
        value: manualReviewOrders.length,
        note: 'PROCESSING',
      },
    ],
    [dashboardEnrollments.length, dashboardUsers.length, filteredOrders.length, initialData.courses, initialData.totals, manualReviewOrders.length]
  );
  const compactOverviewStats = useMemo(
    () =>
      overviewStats.map((stat) => {
        if (stat.label === 'Пользователи') {
          return { ...stat, note: `${dashboardUsers.length} в фокусе` };
        }

        if (stat.label === 'Заказы') {
          return { ...stat, note: `${filteredOrders.length} видимы` };
        }

        if (stat.label === 'Доступы') {
          return { ...stat, note: `${dashboardEnrollments.length} новые` };
        }

        if (stat.label === 'На проверке') {
          return { ...stat, note: 'в очереди' };
        }

        return stat;
      }),
    [dashboardEnrollments.length, dashboardUsers.length, filteredOrders.length, overviewStats]
  );
  const kpiCards = useMemo(
    () => [
      {
        key: 'users',
        label: 'Пользователи',
        value: initialData.totals.users,
        note: `+${recentUsersCount} ${TREND_PERIOD_LABELS[trendPeriod].note}`,
        icon: UsersIcon,
        onClick: () => {
          setActiveDashboardTab('users');
          openAdminDrawer('users', 'admin-users');
        },
      },
      {
        key: 'orders',
        label: 'Заказы',
        value: initialData.totals.orders,
        note: `+${recentOrdersCount} ${TREND_PERIOD_LABELS[trendPeriod].note}`,
        icon: OrdersIcon,
        onClick: () => {
          setActiveDashboardTab('orders');
          setOrderFilter('ALL');
          openAdminDrawer('orders', 'admin-orders');
        },
      },
      {
        key: 'paid-orders',
        label: 'Оплаченные',
        value: paidOrders.length,
        note: `${processingCount} на проверке`,
        icon: ReviewIcon,
        onClick: () => {
          setActiveDashboardTab('orders');
          setOrderFilter('PAID');
          openAdminDrawer('orders', 'admin-orders');
        },
      },
      {
        key: 'courses',
        label: 'Активные курсы',
        value: initialData.totals.liveCourses,
        note: `${publishedCoursesCount} опубликовано`,
        icon: CoursesIcon,
        onClick: () => {
          setActiveDashboardTab('courses');
          openContentDrawer('admin-courses', { showCourseSelector: true });
        },
      },
      {
        key: 'accesses',
        label: 'Доступы',
        value: initialData.totals.enrollments,
        note: `${dashboardEnrollments.length} новые`,
        icon: AccessIcon,
        onClick: () => {
          setActiveDashboardTab('accesses');
          openAdminDrawer('accesses', 'admin-accesses-table');
        },
      },
      {
        key: 'revenue',
        label: 'Выручка',
        value: formatMoney(paidRevenueTotal),
        note: `${formatMoney(recentRevenue)} ${TREND_PERIOD_LABELS[trendPeriod].note}`,
        icon: SparkIcon,
        onClick: () => {
          setActiveDashboardTab('orders');
          setOrderFilter('PAID');
          openAdminDrawer('orders', 'admin-orders');
        },
      },
    ],
    [
      dashboardEnrollments.length,
      initialData.totals.enrollments,
      initialData.totals.liveCourses,
      initialData.totals.orders,
      initialData.totals.users,
      paidOrders.length,
      paidRevenueTotal,
      processingCount,
      publishedCoursesCount,
      recentOrdersCount,
      recentRevenue,
      recentUsersCount,
      selectedCourse,
      trendPeriod,
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
  const orderStatusSummary = useMemo(
    () => [
      { label: 'Ждут', value: pendingCount, tone: 'pending' },
      { label: 'Проверка', value: processingCount, tone: 'processing' },
      { label: 'Оплачены', value: paidOrders.length, tone: 'paid' },
      { label: 'Сбой', value: failedCount, tone: 'failed' },
    ],
    [failedCount, paidOrders.length, pendingCount, processingCount]
  );
  const drawerMeta = useMemo(() => {
    switch (activeAdminDrawer) {
      case 'review':
        return {
          title: 'Операции и проверка',
          description: 'Очередь PROCESSING-заказов и ручная проверка оплат.',
        };
      case 'content':
        return {
          title: 'Контент: курсы, уроки и тарифы',
          description: 'Курсы, уроки и тарифы внутри отдельного drawer.',
        };
      case 'orders':
        return {
          title: 'Все заказы',
          description: 'Поиск и фильтрация заказов без раздувания главной страницы.',
        };
      case 'users':
        return {
          title: 'Все пользователи',
          description: 'Поиск по email и роли в отдельном drawer.',
        };
      case 'accesses':
        return {
          title: 'Все доступы',
          description: 'Поиск по пользователю, курсу и источнику доступа.',
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
        return orderFilter === 'ALL' ? 'Журнал заказов' : `Заказы · ${orderFilter}`;
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
          subtitle: 'Регистрации, роли и быстрый вход в users drawer без постоянного списка на dashboard.',
          actionLabel: 'Открыть users drawer',
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
            hint: 'Динамика регистрации новых пользователей по выбранному периоду.',
            tone: 'success',
          },
          rows: initialData.users.slice(0, 5).map((user) => ({
            id: `user-${user.id}`,
            title: user.email,
            subtitle: `${formatShortDate(user.createdAt)} · ${user.accessibleCoursesCount} доступа`,
            meta: user.hasPendingOrder ? 'Есть активный заказ' : 'Без активного заказа',
            badge: getRoleLabel(user.role),
            badgeClass: getBadgeClass(user.role),
            onClick: () => handleOpenUserDetail(user.id),
          })),
          emptyText: 'Пользователи появятся после первой регистрации.',
        };
      case 'orders':
        return {
          title: 'Заказы',
          subtitle: 'Статусы оплат, очередь проверки и полный журнал заказов живут отдельно от обзорного surface.',
          actionLabel: 'Открыть orders drawer',
          action: () => openOrdersDrawer('ALL'),
          metrics: [
            { label: 'PENDING', value: String(pendingCount) },
            { label: 'PROCESSING', value: String(processingCount) },
            { label: 'PAID', value: String(paidOrders.length) },
          ],
          rowsTitle: 'Последние заказы',
          chart: {
            title: 'Поток заказов',
            value: String(recentOrdersCount),
            note: TREND_PERIOD_LABELS[trendPeriod].note,
            points: orderTrendSeries,
            hint: 'Новые заказы за выбранный период.',
            tone: 'warning',
          },
          rows: initialData.orders.slice(0, 5).map((order) => ({
            id: `order-${order.id}`,
            title: order.userEmail,
            subtitle: `${order.courseTitle} · ${formatMoney(order.amount)}`,
            meta: `${order.paymentMethod} · ${formatShortDate(order.updatedAt)}`,
            badge: order.status,
            badgeClass: getBadgeClass(order.status),
            onClick: () => {
              openOrdersDrawer('ALL', order.userEmail);
            },
          })),
          emptyText: 'Заказы появятся после первой оплаты.',
        };
      case 'courses':
        return {
          title: 'Курсы',
          subtitle: 'На экране только summary. Полный редактор открывается в content drawer.',
          actionLabel: 'Открыть редактор курсов',
          action: () => openContentDrawer('admin-courses', { showCourseSelector: true }),
          metrics: [
            { label: 'Всего', value: String(initialData.courses.length) },
            { label: 'Опубликовано', value: String(publishedCoursesCount) },
            { label: 'Preview', value: String(previewLessonsTotal) },
          ],
          rowsTitle: 'Курсы в фокусе',
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
          subtitle: 'Активность контента и быстрый вход в lesson editor без длинного page-flow.',
          actionLabel: 'Открыть редактор уроков',
          action: handleOpenLessonWorkspace,
          metrics: [
            { label: 'Всего', value: String(initialData.courses.reduce((sum, course) => sum + course.lessonsCount, 0)) },
            {
              label: 'Live',
              value: String(initialData.courses.reduce((sum, course) => sum + course.publishedLessonsCount, 0)),
            },
            { label: 'Preview', value: String(previewLessonsTotal) },
          ],
          rowsTitle: 'Последние обновления',
          chart: {
            title: 'Динамика контента',
            value: String(recentLessonsCount),
            note: TREND_PERIOD_LABELS[trendPeriod].note,
            points: lessonTrendSeries,
            hint: 'Изменения уроков и контента по выбранному периоду.',
            tone: 'accent',
          },
          rows: latestLessons.slice(0, 5).map((lesson) => ({
            id: `lesson-${lesson.id}`,
            title: lesson.title,
            subtitle: `${lesson.courseTitle} · ${formatShortDate(lesson.updatedAt)}`,
            meta: lesson.slug,
            badge: lesson.isPreview ? 'Preview' : lesson.isPublished ? 'Live' : 'Draft',
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
          subtitle: 'Активные предложения и продажи по тарифам с быстрым переходом в tariff editor.',
          actionLabel: 'Открыть тарифы',
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
          subtitle: 'Журнал доступов открыт отдельно, а section-panel даёт только сводку и вход в полный drawer.',
          actionLabel: 'Открыть журнал доступов',
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
    openAdminDrawer,
    openAccessesDrawer,
    openContentDrawer,
    openOrdersDrawer,
    openUsersDrawer,
    paidOrders.length,
    pendingCount,
    previewLessonsTotal,
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

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      closeAdminDrawer();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAdminDrawer]);

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

  function openAccessesDrawer(search = '', filter: AccessSourceFilter = 'ALL') {
    setActiveDashboardTab('accesses');
    setAccessSearch(search);
    setAccessSourceFilter(filter);
    openAdminDrawer('accesses', 'admin-accesses-table');
  }

  function closeAdminDrawer() {
    setActiveAdminDrawer(null);
    setDrawerTargetId(null);
  }

  function openContentDrawer(targetId?: string, options?: { showCourseSelector?: boolean }) {
    setIsContentSidebarOpen(options?.showCourseSelector ?? !selectedCourse);
    openAdminDrawer('content', targetId);
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

  function handleOpenUserDetail(userId: number) {
    setSelectedUserId(userId);
    setSelectedUserOrderFilter('ALL');
    openUsersDrawer('', { preserveSelection: true });
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
    openAccessesDrawer('');
  }

  function handleOpenReviewWorkspace() {
    setActiveDashboardTab('orders');
    openAdminDrawer('review', 'manual-review');
  }

  function handleActivateDashboardTab(tab: AdminDashboardTab) {
    setActiveDashboardTab(tab);

    if (tab === 'users' || tab === 'orders' || tab === 'accesses') {
      setMobileAdminPanel(tab);
    }
  }

  function scrollToAdminSection(sectionId: string) {
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
  }

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

  return (
    <section className="dnk-section admin-shell admin-shell--saas" id="admin-overview">
      <div className="admin-app-layout">
        <aside className="panel admin-sidebar">
          <div className="admin-sidebar__brand">
            <span className="brand-mark" />
            <div>
              <strong>DNK Admin</strong>
              <p>Рабочая панель платформы</p>
            </div>
          </div>

          <div className="admin-sidebar__group">
            <span className="eyebrow">Навигация</span>
            <nav className="admin-sidebar__nav">
              <button
                className={`admin-sidebar__link ${activeDashboardTab === 'dashboard' ? 'admin-sidebar__link--active' : ''}`}
                onClick={() => handleActivateDashboardTab('dashboard')}
                type="button"
              >
                <UsersIcon />
                <span>Дашборд</span>
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
            <Link className="admin-sidebar__utility" href="/" target="_blank">
              <ArrowTopRightIcon />
              <span>Перейти на сайт</span>
            </Link>
          </div>
        </aside>

        <div className="admin-workspace">
          <header className="panel admin-toolbar">
            <div className="admin-toolbar__primary">
              <Link className="ghost-button admin-toolbar__site-link" href="/" target="_blank">
                <ArrowTopRightIcon />
                <span>Перейти на сайт</span>
              </Link>
              <div className="admin-toolbar__links">
                <Link href="/lk">Личный кабинет</Link>
                <Link href="/catalog">Каталог</Link>
                <Link href="/admin/help">Инструкция</Link>
              </div>
            </div>

            <div className="admin-toolbar__meta">
              <button className="admin-toolbar__bell" onClick={handleOpenReviewWorkspace} type="button">
                <BellIcon />
                <span>{processingCount}</span>
              </button>
              <div className="admin-toolbar__profile">
                <span className="admin-toolbar__avatar">{getAdminInitials(adminEmail)}</span>
                <div>
                  <strong>{adminEmail}</strong>
                  <small>ADMIN</small>
                </div>
              </div>
            </div>
          </header>

          <div className="panel admin-dashboard-surface">
            <div className="admin-dashboard-surface__header">
              <div>
                <span className="eyebrow">Управление платформой</span>
                <h1>Пользователи, заказы и контент</h1>
                <p className="panel-copy">
                  Ключевые метрики, операционные очереди и быстрый вход в редакторы на одном экране.
                </p>
              </div>
              <div className="admin-dashboard-surface__header-actions">
                <button className="ghost-button" onClick={handleOpenReviewWorkspace} type="button">
                  Проверка оплаты
                </button>
                <button
                  className="ghost-button"
                  onClick={() =>
                    selectedCourse
                      ? jumpToCourseEditor(selectedCourse.id)
                      : openContentDrawer('admin-courses', { showCourseSelector: true })
                  }
                  type="button"
                >
                  Редактор контента
                </button>
              </div>
            </div>

            <div className="admin-dashboard-toolbar">
              <div className="admin-dashboard-tabs" role="tablist" aria-label="Разделы админки">
                {dashboardTabs.map((tab) => {
                  const Icon = tab.icon;

                  return (
                    <button
                      key={tab.key}
                      aria-pressed={activeDashboardTab === tab.key}
                      className={`admin-dashboard-tab ${activeDashboardTab === tab.key ? 'admin-dashboard-tab--active' : ''}`}
                      onClick={() => handleActivateDashboardTab(tab.key)}
                      type="button"
                    >
                      <Icon />
                      <span>{tab.label}</span>
                      <small>{tab.count}</small>
                    </button>
                  );
                })}
              </div>

              {!isDashboardHome && activeSectionPanel?.chart ? (
                <div className="admin-period-switch" aria-label="Период аналитики раздела">
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
              ) : null}
            </div>

            <div className="admin-kpi-grid">
              {kpiCards.map((card) => {
                const Icon = card.icon;

                return (
                  <button className="admin-kpi-card" key={card.key} onClick={card.onClick} type="button">
                    <span className="admin-kpi-card__icon">
                      <Icon />
                    </span>
                    <span className="admin-kpi-card__label">{card.label}</span>
                    <strong>{card.value}</strong>
                    <small title={card.note}>{card.note}</small>
                  </button>
                );
              })}
            </div>

            {isDashboardHome ? (
              <div className="admin-saas-grid admin-saas-grid--overview">
                <article className="panel admin-surface-card admin-surface-card--orders">
                  <div className="admin-surface-card__head">
                    <div>
                      <span className="eyebrow">Очередь оплаты</span>
                      <h2>Только то, что требует действия</h2>
                    </div>
                    <button className="ghost-button admin-surface-card__link" onClick={handleOpenReviewWorkspace} type="button">
                      PROCESSING
                    </button>
                  </div>
                  <div className="admin-status-strip">
                    {orderStatusSummary.map((item) => (
                      <span className={`admin-status-summary admin-status-summary--${item.tone}`} key={item.label}>
                        <strong>{item.value}</strong>
                        <span>{item.label}</span>
                      </span>
                    ))}
                  </div>
                  <div className="admin-mini-list admin-mini-list--surface">
                    {dashboardManualReviewOrders.length > 0 ? (
                      dashboardManualReviewOrders.map((item) => (
                        <button
                          className="admin-mini-list__item admin-mini-list__item--action"
                          key={item.id}
                          onClick={() => {
                            setReviewSearch(item.userEmail);
                            handleOpenReviewWorkspace();
                          }}
                          type="button"
                        >
                          <div className="admin-mini-list__copy">
                            <strong className="mono" title={item.userEmail}>{item.userEmail}</strong>
                            <p title={`${item.courseTitle} · ${formatMoney(item.amount)}`}>
                              {item.courseTitle} · {formatMoney(item.amount)}
                            </p>
                          </div>
                          <span className={getBadgeClass(item.status)}>{item.status}</span>
                        </button>
                      ))
                    ) : (
                      <p className="muted-text" style={{ margin: 0 }}>
                        Очередь пуста.
                      </p>
                    )}
                  </div>
                </article>

                <article className="panel admin-surface-card admin-surface-card--actions">
                  <div className="admin-surface-card__head">
                    <div>
                      <span className="eyebrow">Быстрые действия</span>
                      <h2>Точки входа в рабочие сценарии</h2>
                    </div>
                    <span className="admin-hint-icon" title="Каждая кнопка открывает существующий drawer и нужный editor внутри него.">
                      <InfoIcon />
                    </span>
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
                      <h2>Последняя активность платформы</h2>
                    </div>
                    <span className="admin-hint-icon" title="Последние события по пользователям, доступам и ручной проверке.">
                      <InfoIcon />
                    </span>
                  </div>
                  <div className="admin-activity-list">
                    {activityItems.map((item) => (
                      <div key={item.id} className="admin-activity-list__item">
                        <span className={`admin-activity-list__dot admin-activity-list__dot--${item.tone}`} />
                        <div className="admin-activity-list__copy">
                          <strong title={item.title}>{item.title}</strong>
                          <p title={item.meta}>{item.meta}</p>
                        </div>
                        <span className="mono admin-activity-list__date">{formatShortDate(item.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            ) : activeSectionPanel ? (
              <div className="admin-section-workspace">
                {activeSectionPanel.chart ? (
                  <article className="panel admin-surface-card admin-surface-card--chart">
                    <div className="admin-surface-card__head">
                      <div>
                        <span className="eyebrow">Аналитика раздела</span>
                        <h2>{activeSectionPanel.chart.title}</h2>
                      </div>
                      <span className="admin-hint-icon" title={activeSectionPanel.chart.hint}>
                        <InfoIcon />
                      </span>
                    </div>
                    <div className="admin-analytics-stat">
                      <strong>{activeSectionPanel.chart.value}</strong>
                      <span>{activeSectionPanel.chart.note}</span>
                    </div>
                    <MiniTrendChart
                      formatValue={activeSectionPanel.chart.formatValue}
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
                    <button className="ghost-button admin-surface-card__link" onClick={activeSectionPanel.action} type="button">
                      {activeSectionPanel.actionLabel}
                    </button>
                  </div>
                  <p className="admin-surface-card__lead">{activeSectionPanel.subtitle}</p>
                  <div className="admin-metric-cluster">
                    {activeSectionPanel.metrics.map((metric) => (
                      <span className="admin-metric-pill" key={metric.label}>
                        <strong>{metric.value}</strong>
                        <span>{metric.label}</span>
                      </span>
                    ))}
                  </div>
                </article>

                <article className="panel admin-surface-card admin-surface-card--list">
                  <div className="admin-surface-card__head">
                    <div>
                      <span className="eyebrow">Последние элементы</span>
                      <h2>{activeSectionPanel.rowsTitle}</h2>
                    </div>
                    <button className="ghost-button admin-surface-card__link" onClick={activeSectionPanel.action} type="button">
                      {activeSectionPanel.actionLabel}
                    </button>
                  </div>
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
                            <strong title={row.title}>{row.title}</strong>
                            <p title={row.subtitle}>{row.subtitle}</p>
                          </div>
                          <div className="admin-workbench-row__meta">
                            <span className="mono" title={row.meta}>{row.meta}</span>
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
                      title="Поиск по email, курсу, тарифу или статусу"
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
                      title="Поиск по названию, slug, статусу или направлению"
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
                        title="Поиск по email, курсу, тарифу, статусу или способу оплаты"
                        value={orderSearch}
                      />
                    </div>
                    <div className="admin-filter-row">
                      {(['ALL', 'PROCESSING', 'PAID', 'FAILED', 'PENDING', 'CANCELED', 'EXPIRED'] as const).map(
                        (status) => (
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
                        )
                      )}
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
                        placeholder="Поиск пользователя"
                        title="Поиск по email или роли"
                        value={userSearch}
                      />
                    </div>
                    <div className="admin-filter-row">
                      {(['ALL', 'ADMIN', 'USER', 'ACTIVE_ORDER'] as const).map((filterKey) => (
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
                        title="Поиск по email, курсу, slug или источнику"
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
              <span className="eyebrow">Workspace</span>
              <strong>Операции и проверка</strong>
              <p>Памятка по процессу и полная очередь PROCESSING-заказов.</p>
            </div>
            <span className="admin-section__count">{manualReviewOrders.length}</span>
          </summary>
          <div className="admin-collapsible-section__body">
      <article className="panel admin-section" id="admin-guide">
        <div className="admin-section__head">
          <span className="eyebrow">Памятка</span>
          <h2>Что важно перед подтверждением оплаты и изменением контента</h2>
          <p className="panel-copy">
            Короткая версия основных правил. Полная пошаговая инструкция доступна на странице
            `/admin/help`.
          </p>
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
          <h2>Заказы в статусе PROCESSING</h2>
          <p className="panel-copy">
            PROCESSING означает, что пользователь уже оплатил по QR СБП и нажал «Я оплатил», но
            поступление денег еще не подтверждено. Подтверждайте заказ только после проверки
            оплаты.
          </p>
        </div>

        <div className="admin-mobile-panel-list admin-mobile-panel-list--review">
          {filteredManualReviewOrders.length > 0 ? (
            filteredManualReviewOrders.map((item) => (
              <article key={item.id} className="admin-mobile-record admin-mobile-record--review">
                <div className="admin-mobile-record__head">
                  <strong className="mono">{item.userEmail}</strong>
                  <span className={getBadgeClass(item.status)}>{item.status}</span>
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
                <th>Email</th>
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
                      <span className={getBadgeClass(item.status)}>{item.status}</span>
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
              <p>Полный editor курса, уроков и тарифов для текущего каталога.</p>
            </div>
            <span className="admin-section__count">{initialData.courses.length}</span>
          </summary>
          <div className="admin-collapsible-section__body">

      <article className="panel admin-section" id="admin-courses">
        <div className="admin-section__head">
          <span className="eyebrow">Контент и доступ</span>
          <h2>Курсы, уроки, ознакомительные уроки и тарифы</h2>
          <p className="panel-copy">
            Неопубликованный курс скрыт. Опубликованный курс без активного тарифа считается
            бесплатным. Если у опубликованного курса есть активный тариф, он продается как платный.
            Ознакомительные уроки управляются переключателем у самих уроков.
          </p>
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
                  <div className="admin-course-list__meta mono">{course.slug}</div>
                  <div className="admin-course-list__meta">
                    {course.lessonsCount} уроков, {course.previewLessonsCount} ознакомительных
                  </div>
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
                <label htmlFor="admin-new-course-slug">Slug адреса</label>
                <input
                  id="admin-new-course-slug"
                  onChange={(event) =>
                    setCreateCourseDraft((current) => ({
                      ...current,
                      slug: event.target.value,
                    }))
                  }
                  placeholder="new-course-slug"
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
                      <label className="admin-inline-select">
                        <span className="sr-only">Выбрать курс</span>
                        <select
                          onChange={(event) => handleSelectCourse(Number(event.target.value))}
                          value={selectedCourse.id}
                        >
                          {initialData.courses.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                  <div className="admin-editor-context-strip__actions">
                    <button
                      className="ghost-button"
                      onClick={() => setIsContentSidebarOpen((current) => !current)}
                      type="button"
                      title={isContentSidebarOpen ? 'Скрыть список курсов' : 'Показать список курсов'}
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
                      <label htmlFor="admin-course-slug">Slug адреса</label>
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
                    <p>{selectedCourse.courseSlugPolicy}</p>
                    <p>
                      Направление пока не хранится в БД отдельно: для старых курсов оно берется из
                      кодового каталога, для новых используется дефолтная группа.
                    </p>
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
                      <span className="muted-text">Slug создается автоматически</span>
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

                  <p className="panel-copy">
                    {selectedCourse.tariffSlugPolicy}
                  </p>

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
                          <div className="admin-tariff-list__meta mono">{tariff.slug}</div>
                          <div className="admin-tariff-list__meta">
                            {formatMoney(tariff.price)} / заказов: {tariff.ordersCount}
                          </div>
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
                          <label htmlFor="admin-tariff-interval">Тип доступа (служебное поле)</label>
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
                      <span className="muted-text">Создайте тариф, чтобы курс стал платным</span>
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
                        <label htmlFor="admin-new-tariff-slug">Slug адреса</label>
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
                      <label htmlFor="admin-new-tariff-interval">Тип доступа (служебное поле)</label>
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
                  Создайте первый курс слева, затем добавьте уроки и тарифы.
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
              <p>Полные таблицы для аудита, фильтрации и переходов к сущностям.</p>
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
            Используйте mobile-вкладки для быстрого просмотра ключевых административных разделов.
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
                    <span>Покупок: {item.ownedCoursesCount}</span>
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
                    <span className={getBadgeClass(item.status)}>{item.status}</span>
                  </div>
                  <div className="admin-mobile-record__meta">
                    <span className="mono">{item.userEmail}</span>
                    <span>{formatMoney(item.amount)}</span>
                    <span>{item.paymentMethod}</span>
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
            Быстрый фильтр по статусам и переход к пользователю или редактору курса.
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
              {filteredJournalOrders.length > 0 ? (
                filteredJournalOrders.map((item) => (
                  <tr key={item.id}>
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
                    <td>
                      <button className="admin-inline-link mono" onClick={() => handleOpenUserDetail(item.userId)} type="button">
                        {item.userEmail}
                      </button>
                    </td>
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

        {selectedUser ? (
          <article className="panel admin-user-detail" id={`admin-user-detail-${selectedUser.id}`}>
            <div className="admin-user-detail__head">
              <div className="admin-user-detail__copy">
                <span className="eyebrow">Карточка пользователя</span>
                <h3 title={selectedUser.email}>{selectedUser.email}</h3>
                <p title={selectedUserName ?? undefined}>
                  {selectedUserName} · {formatDate(selectedUser.createdAt)}
                </p>
              </div>
              <div className="admin-user-detail__actions">
                <span className={getBadgeClass(selectedUser.role)}>{getRoleLabel(selectedUser.role)}</span>
                <button className="ghost-button" onClick={() => handleOpenOrdersForUser(selectedUser.email)} type="button">
                  Заказы пользователя
                </button>
                <button className="ghost-button" onClick={() => handleOpenAccessesForUser(selectedUser.email)} type="button">
                  Доступы пользователя
                </button>
                {selectedUserHasProcessingOrder ? (
                  <button className="ghost-button" onClick={() => handleOpenReviewForUser(selectedUser.email)} type="button">
                    Проверить оплату
                  </button>
                ) : null}
                <button className="ghost-button" onClick={() => setSelectedUserId(null)} type="button">
                  Скрыть карточку
                </button>
              </div>
            </div>

            <div className="admin-user-detail__stats">
              <div className="admin-inline-stat">
                <span>Доступные курсы</span>
                <strong>{selectedUser.accessibleCoursesCount}</strong>
              </div>
              <div className="admin-inline-stat">
                <span>Покупок</span>
                <strong>{selectedUser.ownedCoursesCount}</strong>
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
                  <strong>Курсы и доступы</strong>
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
                <div className="admin-mini-list admin-mini-list--surface">
                  {selectedUserEnrollments.length > 0 ? (
                    selectedUserEnrollments.slice(0, 4).map((enrollment) => (
                      <button
                        className="admin-mini-list__item admin-mini-list__item--action"
                        key={enrollment.id}
                        onClick={() => jumpToCourseEditor(enrollment.courseId)}
                        type="button"
                      >
                        <div className="admin-mini-list__copy">
                          <strong title={enrollment.courseTitle}>{enrollment.courseTitle}</strong>
                          <p title={`${enrollment.courseSlug} · ${formatDate(enrollment.createdAt)}`}>
                            {enrollment.courseSlug} · {formatShortDate(enrollment.createdAt)}
                          </p>
                        </div>
                        <span className={getBadgeClass(enrollment.source)}>
                          {getEnrollmentSourceLabel(enrollment.source)}
                        </span>
                      </button>
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
                  <p className="muted-text" style={{ margin: '0.12rem 0 0' }}>
                    Заказы, связанные с аккаунтом, без перехода на длинный page-flow.
                  </p>
                </div>
                <div className="admin-filter-row">
                  {(['ALL', 'PROCESSING', 'PAID', 'FAILED', 'PENDING', 'CANCELED', 'EXPIRED'] as const).map(
                    (status) => (
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
                    )
                  )}
                </div>
              </div>
              <div className="admin-user-detail__orders">
                {filteredSelectedUserOrders.length > 0 ? (
                  filteredSelectedUserOrders.map((order) => (
                    <button
                      className="admin-workbench-row admin-workbench-row--button"
                      key={order.id}
                      onClick={() =>
                        order.status === 'PROCESSING'
                          ? handleOpenReviewForUser(selectedUser.email)
                          : handleOpenOrdersForUser(selectedUser.email, order.status)
                      }
                      type="button"
                    >
                      <div className="admin-workbench-row__copy">
                        <strong title={order.courseTitle}>{order.courseTitle}</strong>
                        <p title={`${order.tariffTitle} · ${formatMoney(order.amount)}`}>
                          {order.tariffTitle} · {formatMoney(order.amount)}
                        </p>
                      </div>
                      <div className="admin-workbench-row__meta">
                        <span className="mono" title={formatDate(order.updatedAt)}>
                          {formatShortDate(order.updatedAt)}
                        </span>
                        <span className={getBadgeClass(order.status)}>{order.status}</span>
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
        ) : null}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Роль</th>
                <th>Создан</th>
                <th>Доступных курсов</th>
                <th>Покупок</th>
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
                    <td>{item.ownedCoursesCount}</td>
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
