'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  canAccessAppPath,
  getRoleCapabilities,
  getVisibleAdminSections,
} from '@/lib/app-access';

type CitySummary = {
  id: number;
  name: string;
};

type PersonSummary = {
  id: number;
  profileType: string;
  firstName: string | null;
  lastName: string | null;
};

type CurrentUserSummary = {
  id: number;
  email: string | null;
  phone: string | null;
  telegramId: string | null;
  staffRole: string | null;
  roles: string[];
  preferredCity: CitySummary | null;
  profile: PersonSummary | null;
};

type AdminTeamSummary = {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  city: CitySummary | null;
  createdAt: string;
  updatedAt: string;
};

type AdminTeamApplicationSummary = {
  id: number;
  status: string;
  commentFromApplicant: string | null;
  internalNote: string | null;
  createdAt: string;
  updatedAt: string;
  participant: (PersonSummary & {
    birthDate: string | null;
    city: CitySummary | null;
  }) | null;
  team: {
    id: number;
    name: string;
    slug: string | null;
    description: string | null;
    city: CitySummary | null;
  };
  reviewedBy: {
    id: number;
    email: string | null;
    phone: string | null;
    telegramId: string | null;
  } | null;
};

type TrainerTeamApplicationSummary = {
  id: number;
  status: string;
  commentFromApplicant: string | null;
  internalNote: string | null;
  createdAt: string;
  updatedAt: string;
  participant: (PersonSummary & {
    birthDate: string | null;
    city: CitySummary | null;
  }) | null;
  team: {
    id: number;
    name: string;
    city: CitySummary | null;
  };
};

type AdminTrainingSummary = {
  id: number;
  name: string;
  trainingType: string;
  capacity: number;
  isActive: boolean;
  city: CitySummary;
  coach: {
    id: number;
    email: string | null;
    phone: string | null;
    telegramId: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type TrainerTrainingSummary = {
  trainingId: number;
  name: string;
  description: string | null;
  trainingType: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  isActive: boolean;
  city: CitySummary;
  trainer: {
    id: number;
    email: string | null;
    phone: string | null;
    telegramId: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    bookings: number;
  };
};

type AdminRentalBookingSummary = {
  id: number;
  status: string;
  bookingType: 'SELF' | 'PARTICIPANT';
  noteFromUser: string | null;
  managerNote: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    email: string | null;
    phone: string | null;
    telegramId: string | null;
  };
  participant: (PersonSummary & {
    birthDate: string | null;
    city: CitySummary | null;
  }) | null;
  rentalSlot: {
    id: number;
    startsAt: string;
    endsAt: string;
    status: string;
    isPublic: boolean;
  };
  resource: {
    id: number;
    name: string;
    resourceType: string | null;
  };
  facility: {
    id: number;
    name: string;
  };
  city: CitySummary;
};

type AdminRentalSlotSummary = {
  id: number;
  status: string;
  startsAt: string;
  endsAt: string;
  visibleToPublic: boolean;
  resource: {
    id: number;
    name: string;
    resourceType: string | null;
  };
  facility: {
    id: number;
    name: string;
  };
  city: CitySummary;
  activeBookingSummary: {
    id: number;
    status: string;
    bookingType: 'SELF' | 'PARTICIPANT';
    createdAt: string;
    updatedAt: string;
    user: {
      id: number;
      email: string | null;
      phone: string | null;
      telegramId: string | null;
    };
    participant: (PersonSummary & {
      birthDate: string | null;
      city: CitySummary | null;
    }) | null;
  } | null;
};

type AdminRentalFacilitySummary = {
  id: number;
  name: string;
  city: CitySummary;
  createdAt: string;
  updatedAt: string;
};

type AdminRentalResourceSummary = {
  id: number;
  name: string;
  type: string | null;
  facility: {
    id: number;
    name: string;
    city: CitySummary;
  };
  createdAt: string;
  updatedAt: string;
};

type AdminOverview = {
  teams: AdminTeamSummary[];
  teamApplications: AdminTeamApplicationSummary[];
  trainings: AdminTrainingSummary[];
  rentalBookings: AdminRentalBookingSummary[];
  rentalSlots: AdminRentalSlotSummary[];
  rentalFacilities: AdminRentalFacilitySummary[];
  rentalResources: AdminRentalResourceSummary[];
};

type PageStatus = 'loading' | 'ready' | 'error';

type FetchResult<T> = {
  payload: T | { error?: string } | null;
  response: Response;
};

const roleLabels: Record<string, string> = {
  USER: 'Пользователь',
  COACH: 'Тренер',
  MANAGER: 'Менеджер',
  ADMIN: 'Администратор',
};

const trainingTypeLabels: Record<string, string> = {
  general: 'Общая',
  GENERAL: 'Общая',
  group: 'Групповая',
  GROUP: 'Групповая',
  private: 'Индивидуальная',
  PRIVATE: 'Индивидуальная',
  individual: 'Индивидуальная',
  INDIVIDUAL: 'Индивидуальная',
};

const statusLabels: Record<string, string> = {
  PENDING: 'На рассмотрении',
  IN_REVIEW: 'В работе',
  ACCEPTED: 'Одобрено',
  REJECTED: 'Отклонено',
  CANCELLED: 'Отменено',
  PENDING_CONFIRMATION: 'Ждёт подтверждения',
  CONFIRMED: 'Подтверждено',
  AVAILABLE: 'Доступно',
  BOOKED: 'Забронировано',
  UNAVAILABLE: 'Недоступно',
};

function formatRoleList(roles: string[]) {
  if (roles.length === 0) {
    return 'Не указаны';
  }

  return roles.map((role) => roleLabels[role] ?? role).join(', ');
}

function formatProfileType(profileType: string | null) {
  switch (profileType) {
    case 'PLAYER':
      return 'Игрок';
    case 'CHILD':
      return 'Ребёнок';
    case 'PARENT':
      return 'Родитель';
    case 'ADULT':
      return 'Взрослый';
    default:
      return 'Профиль';
  }
}

function formatPersonName(person: PersonSummary | null) {
  if (!person) {
    return 'Профиль не указан';
  }

  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ');
  return fullName || formatProfileType(person.profileType);
}

function formatUserIdentity(user: {
  id: number;
  email: string | null;
  phone: string | null;
  telegramId: string | null;
} | null) {
  if (!user) {
    return 'Пользователь не указан';
  }

  if (user.email) {
    return user.email;
  }

  if (user.telegramId) {
    return `@${user.telegramId}`;
  }

  if (user.phone) {
    return user.phone;
  }

  return `Пользователь #${user.id}`;
}

function formatStatus(status: string) {
  return statusLabels[status] ?? status;
}

function formatTrainingType(trainingType: string) {
  return trainingTypeLabels[trainingType] ?? trainingType;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'ACCEPTED':
    case 'CONFIRMED':
    case 'AVAILABLE':
      return 'bg-emerald-100 text-emerald-700';
    case 'REJECTED':
    case 'CANCELLED':
    case 'UNAVAILABLE':
      return 'bg-rose-100 text-rose-700';
    case 'IN_REVIEW':
    case 'BOOKED':
      return 'bg-sky-100 text-sky-700';
    default:
      return 'bg-amber-100 text-amber-700';
  }
}

function translateErrorMessage(message: string) {
  const errorMessages: Record<string, string> = {
    'Failed to fetch current user': 'Не удалось определить текущего пользователя.',
    'Failed to fetch teams for staff': 'Не удалось загрузить список команд.',
    'Failed to fetch team applications for admin':
      'Не удалось загрузить заявки в команду.',
    'Failed to fetch team applications for staff':
      'Не удалось загрузить заявки в команду по тренерскому контуру.',
    'Failed to fetch trainings for staff': 'Не удалось загрузить список тренировок.',
    'Failed to fetch trainings': 'Не удалось загрузить список тренировок.',
    'Failed to fetch rental bookings for staff':
      'Не удалось загрузить бронирования аренды.',
    'Failed to fetch rental slots for staff': 'Не удалось загрузить слоты аренды.',
    'Failed to fetch rental facilities for staff':
      'Не удалось загрузить площадки аренды.',
    'Failed to fetch rental resources for staff':
      'Не удалось загрузить ресурсы аренды.',
    'Current user is not authenticated': 'Пользователь не авторизован.',
    'Staff access required': 'Нужны staff-права для рабочего кабинета.',
    'Manager or admin access required':
      'Нужны права manager/admin для staff кабинета.',
    'Method not allowed': 'Метод не поддерживается.',
  };

  return errorMessages[message] ?? message;
}

async function fetchJson<T>(url: string): Promise<FetchResult<T>> {
  const response = await fetch(url, {
    credentials: 'include',
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null;

  return {
    response,
    payload,
  };
}

function normalizeTrainerApplication(
  application: TrainerTeamApplicationSummary
): AdminTeamApplicationSummary {
  return {
    ...application,
    team: {
      ...application.team,
      slug: null,
      description: null,
    },
    reviewedBy: null,
  };
}

function normalizeTrainerTraining(
  training: TrainerTrainingSummary
): AdminTrainingSummary {
  return {
    id: training.trainingId,
    name: training.name,
    trainingType: training.trainingType,
    capacity: training.capacity,
    isActive: training.isActive,
    city: training.city,
    coach: training.trainer,
    createdAt: training.createdAt,
    updatedAt: training.updatedAt,
  };
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-stone-300/70 bg-white p-6 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-stone-950">{title}</h2>
        <p className="text-sm leading-6 text-stone-600">{description}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SummaryCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-[24px] border border-stone-300/70 bg-white/95 p-5 shadow-[0_18px_45px_-35px_rgba(0,0,0,0.35)]">
      <p className="text-sm font-medium text-stone-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-stone-600">{detail}</p>
    </article>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [status, setStatus] = useState<PageStatus>('loading');
  const [currentUser, setCurrentUser] = useState<CurrentUserSummary | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadAdminOverview() {
      setStatus('loading');
      setError(null);

      const currentUserResult = await fetchJson<CurrentUserSummary>('/api/me');

      if (currentUserResult.response.status === 401) {
        router.replace('/dev/login?next=/admin');
        return;
      }

      if (!currentUserResult.response.ok) {
        if (!isCancelled) {
          setStatus('error');
          setError(
            translateErrorMessage(
              (currentUserResult.payload as { error?: string } | null)?.error ||
                'Failed to fetch current user'
            )
          );
        }
        return;
      }

      const nextCurrentUser = currentUserResult.payload as CurrentUserSummary;
      const nextCurrentUserCapabilities = getRoleCapabilities(nextCurrentUser);

      if (!isCancelled) {
        setCurrentUser(nextCurrentUser);
      }

      if (!canAccessAppPath(nextCurrentUser, '/admin')) {
        router.replace('/cabinet');
        return;
      }

      if (nextCurrentUserCapabilities.isTrainer) {
        const [teamApplicationsResult, trainingsResult] = await Promise.all([
          fetchJson<TrainerTeamApplicationSummary[]>('/api/coach/team-applications'),
          fetchJson<TrainerTrainingSummary[]>(
            `/api/trainings?trainerId=${nextCurrentUser.id}&isActive=true`
          ),
        ]);

        const results = [teamApplicationsResult, trainingsResult];

        if (results.some((result) => result.response.status === 401)) {
          router.replace('/dev/login?next=/admin');
          return;
        }

        const failedResult = results.find((result) => !result.response.ok);

        if (failedResult) {
          const failedMessage = translateErrorMessage(
            (failedResult.payload as { error?: string } | null)?.error ||
              'Не удалось загрузить staff кабинет.'
          );

          if (!isCancelled) {
            setOverview(null);
            setStatus('error');
            setError(failedMessage);
          }

          return;
        }

        if (!isCancelled) {
          setOverview({
            teams: [],
            teamApplications: (
              teamApplicationsResult.payload as TrainerTeamApplicationSummary[]
            ).map(normalizeTrainerApplication),
            trainings: (trainingsResult.payload as TrainerTrainingSummary[]).map(
              normalizeTrainerTraining
            ),
            rentalBookings: [],
            rentalSlots: [],
            rentalFacilities: [],
            rentalResources: [],
          });
          setStatus('ready');
        }

        return;
      }

      const [
        teamsResult,
        teamApplicationsResult,
        trainingsResult,
        rentalBookingsResult,
        rentalSlotsResult,
        rentalFacilitiesResult,
        rentalResourcesResult,
      ] = await Promise.all([
        fetchJson<AdminTeamSummary[]>('/api/admin/teams'),
        fetchJson<AdminTeamApplicationSummary[]>('/api/admin/team-applications'),
        fetchJson<AdminTrainingSummary[]>('/api/admin/trainings'),
        fetchJson<AdminRentalBookingSummary[]>('/api/admin/rental-bookings'),
        fetchJson<AdminRentalSlotSummary[]>('/api/admin/rental-slots'),
        fetchJson<AdminRentalFacilitySummary[]>('/api/admin/rental-facilities'),
        fetchJson<AdminRentalResourceSummary[]>('/api/admin/rental-resources'),
      ]);

      const results = [
        teamsResult,
        teamApplicationsResult,
        trainingsResult,
        rentalBookingsResult,
        rentalSlotsResult,
        rentalFacilitiesResult,
        rentalResourcesResult,
      ];

      if (results.some((result) => result.response.status === 401)) {
        router.replace('/dev/login?next=/admin');
        return;
      }

      const failedResult = results.find((result) => !result.response.ok);

      if (failedResult) {
        const failedMessage = translateErrorMessage(
          (failedResult.payload as { error?: string } | null)?.error ||
            'Не удалось загрузить staff кабинет.'
        );

        if (!isCancelled) {
          setOverview(null);
          setStatus('error');
          setError(failedMessage);
        }

        return;
      }

      if (!isCancelled) {
        setOverview({
          teams: teamsResult.payload as AdminTeamSummary[],
          teamApplications:
            teamApplicationsResult.payload as AdminTeamApplicationSummary[],
          trainings: trainingsResult.payload as AdminTrainingSummary[],
          rentalBookings: rentalBookingsResult.payload as AdminRentalBookingSummary[],
          rentalSlots: rentalSlotsResult.payload as AdminRentalSlotSummary[],
          rentalFacilities:
            rentalFacilitiesResult.payload as AdminRentalFacilitySummary[],
          rentalResources:
            rentalResourcesResult.payload as AdminRentalResourceSummary[],
        });
        setStatus('ready');
      }
    }

    void loadAdminOverview();

    return () => {
      isCancelled = true;
    };
  }, [router]);

  const activeTrainingsCount =
    overview?.trainings.filter((training) => training.isActive).length ?? 0;
  const pendingApplicationsCount =
    overview?.teamApplications.filter((application) =>
      ['PENDING', 'IN_REVIEW'].includes(application.status)
    ).length ?? 0;
  const availablePublicSlotsCount =
    overview?.rentalSlots.filter(
      (slot) => slot.visibleToPublic && slot.status === 'AVAILABLE'
    ).length ?? 0;
  const pendingRentalBookingsCount =
    overview?.rentalBookings.filter(
      (booking) => booking.status === 'PENDING_CONFIRMATION'
    ).length ?? 0;
  const currentUserCapabilities = getRoleCapabilities(currentUser);
  const visibleAdminSections = getVisibleAdminSections(currentUserCapabilities);
  const visibleAdminSectionIds = new Set(
    visibleAdminSections.map((section) => section.id)
  );
  const teamCityCount = overview
    ? new Set(
        overview.teams
          .map((team) => team.city?.name)
          .filter((cityName): cityName is string => Boolean(cityName))
      ).size
    : 0;
  const recentTrainings =
    overview?.trainings
      .slice()
      .sort((left, right) => {
        if (left.isActive !== right.isActive) {
          return Number(right.isActive) - Number(left.isActive);
        }

        return (
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        );
      })
      .slice(0, 5) ?? [];
  const latestRentalSlots = overview?.rentalSlots.slice(0, 4) ?? [];
  const summaryCards = [
    visibleAdminSectionIds.has('teams')
      ? {
          title: 'Команды',
          value: String(overview?.teams.length ?? 0),
          detail: `Городов в командах: ${teamCityCount}. Последнее обновление по данным staff API.`,
        }
      : null,
    visibleAdminSectionIds.has('teamApplications')
      ? {
          title: 'Заявки в команду',
          value: String(overview?.teamApplications.length ?? 0),
          detail:
            currentUserCapabilities.teamApplicationReviewScope === 'own'
              ? `По вашим командам новых и в работе: ${pendingApplicationsCount}.`
              : `Новых и в работе: ${pendingApplicationsCount}.`,
        }
      : null,
    visibleAdminSectionIds.has('trainings')
      ? {
          title: 'Тренировки',
          value: String(overview?.trainings.length ?? 0),
          detail:
            currentUserCapabilities.trainingManagementScope === 'own'
              ? `Активных ваших тренировок: ${activeTrainingsCount}.`
              : `Активных тренировок: ${activeTrainingsCount}.`,
        }
      : null,
    visibleAdminSectionIds.has('rentals')
      ? {
          title: 'Аренда',
          value: String(overview?.rentalBookings.length ?? 0),
          detail: `Ожидают подтверждения: ${pendingRentalBookingsCount}. Публичных доступных слотов: ${availablePublicSlotsCount}.`,
        }
      : null,
  ].filter(
    (
      card
    ): card is {
      title: string;
      value: string;
      detail: string;
    } => Boolean(card)
  );
  const responsibilitySummary =
    currentUserCapabilities.role === 'TRAINER'
      ? 'Отвечает только за свои тренировки и заявки по закреплённым командам.'
      : currentUserCapabilities.role === 'MANAGER'
        ? 'Отвечает за операционный staff-контур: команды, заявки, тренировки и аренду.'
        : 'Отвечает за полный staff/admin контур платформы и foundation под управление ролями.';

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f4efe4_0%,#ede6d8_45%,#e4ddcf_100%)] px-4 py-8 text-stone-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-[30px] border border-stone-300/70 bg-[#171411] px-6 py-7 text-stone-100 shadow-[0_30px_80px_-45px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-400">
                Staff / admin
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Staff/admin кабинет
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
                Рабочая зона staff с role-aware доступом к командам, заявкам,
                тренировкам и аренде.
              </p>
              {currentUser ? (
                <p className="mt-3 text-sm text-stone-300">
                  Текущий пользователь: {formatPersonName(currentUser.profile)}. Роли:{' '}
                  {formatRoleList(currentUser.roles)}. Платформенная роль:{' '}
                  {currentUserCapabilities.roleLabel}. Уровень доступа:{' '}
                  {currentUserCapabilities.adminAccessLabel}. Основной рабочий маршрут:{' '}
                  {currentUserCapabilities.primaryEntryPath}.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/cabinet"
                className="rounded-full border border-stone-600 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-stone-300 hover:text-white"
              >
                Пользовательский кабинет
              </Link>
              <Link
                href="/dev/login"
                className="rounded-full border border-stone-600 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-stone-300 hover:text-white"
              >
                Сменить пользователя
              </Link>
            </div>
          </div>
        </header>

        {status === 'loading' ? (
          <section className="rounded-[28px] border border-stone-300/70 bg-white/90 p-6 text-sm text-stone-600 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.35)]">
            Проверяем доступ и загружаем staff/admin обзор...
          </section>
        ) : null}

        {status === 'error' ? (
          <section className="rounded-[28px] border border-rose-300 bg-rose-50 p-6 text-sm text-rose-700 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.35)]">
            {error}
          </section>
        ) : null}

        {status === 'ready' && overview && currentUser ? (
          <>
            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-[28px] border border-stone-300/70 bg-white p-6 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.35)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Role-native workspace
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                    {currentUserCapabilities.accessBadge}
                  </span>
                  <span className="text-sm font-medium text-stone-600">
                    {currentUserCapabilities.adminAccessLabel}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-stone-950">
                  /admin является рабочей зоной роли{' '}
                  {currentUserCapabilities.roleLabel}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-700">
                  {currentUserCapabilities.adminDescription}
                </p>
              </article>

              <article className="rounded-[28px] border border-stone-300/70 bg-white p-6 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.35)]">
                <p className="text-sm font-medium text-stone-500">
                  Role / access summary
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-stone-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                      Текущая роль
                    </p>
                    <p className="mt-2 text-base font-semibold text-stone-950">
                      {currentUserCapabilities.roleLabel}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-stone-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                      Уровень доступа
                    </p>
                    <p className="mt-2 text-base font-semibold text-stone-950">
                      {currentUserCapabilities.adminAccessLabel}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-stone-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                      Рабочий маршрут
                    </p>
                    <p className="mt-2 text-base font-semibold text-stone-950">
                      {currentUserCapabilities.primaryEntryPath}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-stone-700">
                  {responsibilitySummary}
                </p>
                {visibleAdminSections.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {visibleAdminSections.map((section) => (
                      <span
                        key={section.id}
                        className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-stone-700"
                      >
                        {section.label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            </section>

            {summaryCards.length > 0 ? (
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => (
                  <SummaryCard
                    key={card.title}
                    title={card.title}
                    value={card.value}
                    detail={card.detail}
                  />
                ))}
              </section>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-2">
              {visibleAdminSectionIds.has('teams') ? (
                <SectionCard
                  title="Команды"
                  description="Короткий обзор всех команд, доступных staff/admin через текущий backend."
                >
                  {overview.teams.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-stone-600">
                      Команд пока нет.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {overview.teams.slice(0, 5).map((team) => (
                        <article
                          key={team.id}
                          className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold text-stone-950">
                                {team.name}
                              </p>
                              <p className="mt-1 text-sm text-stone-600">
                                {team.city?.name || 'Город не указан'}
                                {team.slug ? ` / ${team.slug}` : ''}
                              </p>
                            </div>
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                              {formatDate(team.updatedAt)}
                            </p>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-stone-700">
                            {team.description || 'Описание не заполнено.'}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </SectionCard>
              ) : null}

              {visibleAdminSectionIds.has('teamApplications') ? (
                <SectionCard
                  title="Заявки в команду"
                  description={
                    currentUserCapabilities.teamApplicationReviewScope === 'own'
                      ? 'Только заявки по вашим coached teams.'
                      : 'Последние заявки и их текущие статусы по staff/admin API.'
                  }
                >
                  {overview.teamApplications.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-stone-600">
                      Заявок пока нет.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {overview.teamApplications.slice(0, 5).map((application) => (
                        <article
                          key={application.id}
                          className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold text-stone-950">
                                {application.team.name}
                              </p>
                              <p className="mt-1 text-sm text-stone-600">
                                {formatPersonName(application.participant)} /{' '}
                                {application.team.city?.name || 'Город не указан'}
                              </p>
                              <p className="mt-2 text-sm text-stone-700">
                                {application.commentFromApplicant ||
                                  'Комментарий от заявителя не указан.'}
                              </p>
                            </div>
                            <div className="flex flex-col items-start gap-3 sm:items-end">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(application.status)}`}
                              >
                                {formatStatus(application.status)}
                              </span>
                              <p className="text-xs text-stone-500">
                                {formatDateTime(application.createdAt)}
                              </p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </SectionCard>
              ) : null}

              {visibleAdminSectionIds.has('trainings') ? (
                <SectionCard
                  title="Тренировки"
                  description={
                    currentUserCapabilities.trainingManagementScope === 'own'
                      ? 'Список ваших тренировок и их текущая активность.'
                      : 'Список тренировок без CRUD: активность, тип, тренер и ёмкость.'
                  }
                >
                  {recentTrainings.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-stone-600">
                      Тренировок пока нет.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {recentTrainings.map((training) => (
                        <article
                          key={training.id}
                          className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold text-stone-950">
                                {training.name}
                              </p>
                              <p className="mt-1 text-sm text-stone-600">
                                {training.city.name} /{' '}
                                {formatTrainingType(training.trainingType)}
                              </p>
                              <div className="mt-2 grid gap-1 text-sm text-stone-700">
                                <p>Тренер: {formatUserIdentity(training.coach)}</p>
                                <p>Вместимость: {training.capacity}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-start gap-3 sm:items-end">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  training.isActive
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-stone-200 text-stone-700'
                                }`}
                              >
                                {training.isActive ? 'Активна' : 'Неактивна'}
                              </span>
                              <p className="text-xs text-stone-500">
                                {formatDate(training.updatedAt)}
                              </p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </SectionCard>
              ) : null}

              {visibleAdminSectionIds.has('rentals') ? (
                <SectionCard
                  title="Аренда"
                  description="Сводка по бронированиям и инвентарю аренды в текущем staff/admin контуре."
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-stone-100 p-4">
                      <p className="text-sm font-medium text-stone-500">
                        Инвентарь аренды
                      </p>
                      <div className="mt-3 grid gap-1 text-sm text-stone-700">
                        <p>Площадок: {overview.rentalFacilities.length}</p>
                        <p>Ресурсов: {overview.rentalResources.length}</p>
                        <p>Слотов: {overview.rentalSlots.length}</p>
                        <p>Публично доступных: {availablePublicSlotsCount}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-stone-100 p-4">
                      <p className="text-sm font-medium text-stone-500">
                        Бронирования аренды
                      </p>
                      <div className="mt-3 grid gap-1 text-sm text-stone-700">
                        <p>Всего бронирований: {overview.rentalBookings.length}</p>
                        <p>Ждут подтверждения: {pendingRentalBookingsCount}</p>
                        <p>
                          Подтверждено:{' '}
                          {
                            overview.rentalBookings.filter(
                              (booking) => booking.status === 'CONFIRMED'
                            ).length
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3">
                      <h3 className="text-base font-semibold text-stone-950">
                        Последние бронирования
                      </h3>
                      {overview.rentalBookings.slice(0, 4).map((booking) => (
                        <article
                          key={booking.id}
                          className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-stone-950">
                                {booking.resource.name}
                              </p>
                              <p className="mt-1 text-sm text-stone-600">
                                {booking.facility.name} / {booking.city.name}
                              </p>
                              <p className="mt-2 text-sm text-stone-700">
                                {formatDateTime(booking.rentalSlot.startsAt)}
                              </p>
                              <p className="mt-2 text-sm text-stone-600">
                                Заказчик: {formatUserIdentity(booking.user)}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(booking.status)}`}
                            >
                              {formatStatus(booking.status)}
                            </span>
                          </div>
                        </article>
                      ))}
                      {overview.rentalBookings.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-stone-600">
                          Бронирований пока нет.
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-base font-semibold text-stone-950">
                        Ближайшие слоты
                      </h3>
                      {latestRentalSlots.map((slot) => (
                        <article
                          key={slot.id}
                          className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-stone-950">
                                {slot.resource.name}
                              </p>
                              <p className="mt-1 text-sm text-stone-600">
                                {slot.facility.name} / {slot.city.name}
                              </p>
                              <p className="mt-2 text-sm text-stone-700">
                                {formatDateTime(slot.startsAt)}
                              </p>
                              <p className="mt-2 text-sm text-stone-600">
                                {slot.visibleToPublic
                                  ? 'Виден в публичной аренде'
                                  : 'Скрыт из публичной аренды'}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(slot.status)}`}
                            >
                              {formatStatus(slot.status)}
                            </span>
                          </div>
                        </article>
                      ))}
                      {latestRentalSlots.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-stone-600">
                          Слотов аренды пока нет.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </SectionCard>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
