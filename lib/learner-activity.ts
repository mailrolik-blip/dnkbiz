import 'server-only';

import { Prisma } from '@prisma/client';

import prisma from './prisma';

const DAYS_IN_WEEK = 7;
const ACTIVITY_TIME_ZONE = 'Asia/Omsk';
const EMPTY_SUMMARY = 'Краткий конспект пока не добавлен.';
const MS_IN_DAY = 24 * 60 * 60 * 1000;

const fullDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: ACTIVITY_TIME_ZONE,
});

const monthFormatter = new Intl.DateTimeFormat('ru-RU', {
  month: 'short',
  timeZone: ACTIVITY_TIME_ZONE,
});

const dayKeyFormatter = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: ACTIVITY_TIME_ZONE,
});

export type LearnerActivityEntry = {
  actionCount: number;
  completed: boolean;
  courseSlug: string;
  courseTitle: string;
  lessonId: number;
  lessonSlug: string;
  lessonSummary: string;
  lessonTitle: string;
};

export type LearnerActivityDay = {
  count: number;
  dateLabel: string;
  entries: LearnerActivityEntry[];
  isFuture: boolean;
  isOutsideYear: boolean;
  isToday: boolean;
  isoDate: string;
  level: 0 | 1 | 2 | 3;
};

export type LearnerActivityMonth = {
  key: string;
  label: string;
  startWeekIndex: number;
  weekSpan: number;
};

export type LearnerActivityWeek = {
  days: LearnerActivityDay[];
  key: string;
  startsMonth: boolean;
};

export type LearnerActivityYear = {
  activeDays: number;
  hasActivity: boolean;
  months: LearnerActivityMonth[];
  totalActions: number;
  weeks: LearnerActivityWeek[];
  year: number;
};

export type LearnerActivitySnapshot = {
  availableCourses: number;
  currentStreak: number;
  currentYear: number;
  defaultYear: number;
  hasActivity: boolean;
  lastActiveCourse: {
    slug: string;
    title: string;
  } | null;
  lastActiveLesson: {
    completed: boolean;
    courseSlug: string;
    courseTitle: string;
    lessonId: number;
    lessonSlug: string;
    lessonTitle: string;
  } | null;
  startedCourses: number;
  totalCompletedLessons: number;
  years: LearnerActivityYear[];
};

type ProgressRow = {
  completed: boolean;
  lastViewedAt: Date | null;
  updatedAt: Date;
  lesson: {
    content: string | null;
    course: {
      id: number;
      slug: string;
      title: string;
    };
    description: string | null;
    id: number;
    slug: string;
    title: string;
  };
};

type ActivitySourceRow = {
  completed: boolean;
  courseSlug: string;
  courseTitle: string;
  lessonContent: string | null;
  lessonDescription: string | null;
  lessonId: number;
  lessonSlug: string;
  lessonTitle: string;
};

type ActivityEventRow = ActivitySourceRow & {
  createdAt: Date;
};

type BucketEntry = LearnerActivityEntry & {
  lastActivityAt: number;
};

type DayBucket = {
  count: number;
  entries: Map<number, BucketEntry>;
};

type TimeZoneDayParts = {
  day: number;
  month: number;
  year: number;
};

// We store calendar grid dates as UTC midnights that represent civil dates in Omsk.
// This keeps week/month boundaries stable even if the server runs in another timezone.
function getTimeZoneDayParts(value: Date): TimeZoneDayParts {
  const parts = dayKeyFormatter.formatToParts(value);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value ?? '0'),
    month: Number(parts.find((part) => part.type === 'month')?.value ?? '0'),
    day: Number(parts.find((part) => part.type === 'day')?.value ?? '0'),
  };
}

function buildUtcDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function startOfDay(value: Date) {
  const parts = getTimeZoneDayParts(value);
  return buildUtcDate(parts.year, parts.month - 1, parts.day);
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function startOfWeek(value: Date) {
  const next = startOfDay(value);
  const dayIndex = (next.getUTCDay() + 6) % 7;
  next.setUTCDate(next.getUTCDate() - dayIndex);
  return next;
}

function endOfWeek(value: Date) {
  return addDays(startOfWeek(value), DAYS_IN_WEEK - 1);
}

function getDayKey(value: Date) {
  const parts = getTimeZoneDayParts(value);

  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(
    parts.day
  ).padStart(2, '0')}`;
}

function getActivityLevel(count: number): 0 | 1 | 2 | 3 {
  if (count >= 4) {
    return 3;
  }

  if (count >= 2) {
    return 2;
  }

  if (count >= 1) {
    return 1;
  }

  return 0;
}

function getActivityTimestamp(progress: ProgressRow) {
  return progress.lastViewedAt ?? progress.updatedAt;
}

function toActivitySourceRow(progress: ProgressRow): ActivitySourceRow {
  return {
    completed: progress.completed,
    courseSlug: progress.lesson.course.slug,
    courseTitle: progress.lesson.course.title,
    lessonContent: progress.lesson.content,
    lessonDescription: progress.lesson.description,
    lessonId: progress.lesson.id,
    lessonSlug: progress.lesson.slug,
    lessonTitle: progress.lesson.title,
  };
}

function stripLessonText(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/^##?\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/`{1,3}/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildLessonSummary(description: string | null, content: string | null) {
  const source = description?.trim() ? description : content ?? '';
  const normalized = stripLessonText(source);

  if (!normalized) {
    return EMPTY_SUMMARY;
  }

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const summary = sentences.slice(0, 2).join(' ').trim() || normalized;

  if (summary.length <= 220) {
    return summary;
  }

  return `${summary.slice(0, 217).trimEnd()}...`;
}

function buildEntry(source: ActivitySourceRow, actionAt: number): BucketEntry {
  return {
    actionCount: 1,
    completed: source.completed,
    courseSlug: source.courseSlug,
    courseTitle: source.courseTitle,
    lastActivityAt: actionAt,
    lessonId: source.lessonId,
    lessonSlug: source.lessonSlug,
    lessonSummary: buildLessonSummary(source.lessonDescription, source.lessonContent),
    lessonTitle: source.lessonTitle,
  };
}

function appendBucketActivity(
  buckets: Map<string, DayBucket>,
  dayKey: string,
  source: ActivitySourceRow,
  actionAt: number
) {
  const bucket = buckets.get(dayKey) ?? {
    count: 0,
    entries: new Map<number, BucketEntry>(),
  };

  bucket.count += 1;

  const existingEntry = bucket.entries.get(source.lessonId);

  if (existingEntry) {
    existingEntry.actionCount += 1;
    existingEntry.completed = source.completed;
    existingEntry.lastActivityAt = Math.max(existingEntry.lastActivityAt, actionAt);
    existingEntry.lessonSummary =
      existingEntry.lessonSummary === EMPTY_SUMMARY
        ? buildLessonSummary(source.lessonDescription, source.lessonContent)
        : existingEntry.lessonSummary;
  } else {
    bucket.entries.set(source.lessonId, buildEntry(source, actionAt));
  }

  buckets.set(dayKey, bucket);
}

function cloneBucket(bucket: DayBucket): DayBucket {
  return {
    count: bucket.count,
    entries: new Map(
      [...bucket.entries.entries()].map(([lessonId, entry]) => [lessonId, { ...entry }])
    ),
  };
}

function mergeActivityBuckets(
  activityBuckets: Map<string, DayBucket>,
  fallbackBuckets: Map<string, DayBucket>
) {
  const merged = new Map<string, DayBucket>();

  for (const [dayKey, bucket] of activityBuckets.entries()) {
    merged.set(dayKey, cloneBucket(bucket));
  }

  for (const [dayKey, fallbackBucket] of fallbackBuckets.entries()) {
    const resolvedBucket = merged.get(dayKey);

    if (!resolvedBucket) {
      merged.set(dayKey, cloneBucket(fallbackBucket));
      continue;
    }

    for (const [lessonId, fallbackEntry] of fallbackBucket.entries.entries()) {
      const existingEntry = resolvedBucket.entries.get(lessonId);

      if (existingEntry) {
        existingEntry.completed = existingEntry.completed || fallbackEntry.completed;

        if (
          existingEntry.lessonSummary === EMPTY_SUMMARY &&
          fallbackEntry.lessonSummary !== EMPTY_SUMMARY
        ) {
          existingEntry.lessonSummary = fallbackEntry.lessonSummary;
        }

        existingEntry.lastActivityAt = Math.max(
          existingEntry.lastActivityAt,
          fallbackEntry.lastActivityAt
        );

        continue;
      }

      resolvedBucket.entries.set(lessonId, { ...fallbackEntry });
      resolvedBucket.count += 1;
    }
  }

  return merged;
}

function sortBucketEntries(bucket: DayBucket | undefined) {
  if (!bucket) {
    return [];
  }

  return [...bucket.entries.values()]
    .sort((left, right) => {
      if (left.lastActivityAt !== right.lastActivityAt) {
        return right.lastActivityAt - left.lastActivityAt;
      }

      if (left.actionCount !== right.actionCount) {
        return right.actionCount - left.actionCount;
      }

      return left.lessonTitle.localeCompare(right.lessonTitle, 'ru-RU');
    })
    .map((entry) => ({
      actionCount: entry.actionCount,
      completed: entry.completed,
      courseSlug: entry.courseSlug,
      courseTitle: entry.courseTitle,
      lessonId: entry.lessonId,
      lessonSlug: entry.lessonSlug,
      lessonSummary: entry.lessonSummary,
      lessonTitle: entry.lessonTitle,
    }));
}

function buildLastActiveLesson(source: ActivitySourceRow | null) {
  if (!source) {
    return null;
  }

  return {
    completed: source.completed,
    courseSlug: source.courseSlug,
    courseTitle: source.courseTitle,
    lessonId: source.lessonId,
    lessonSlug: source.lessonSlug,
    lessonTitle: source.lessonTitle,
  };
}

function isMissingLessonActivityEventTableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2010' &&
    error.meta?.code === '42P01'
  );
}

function formatMonthLabel(value: Date) {
  const normalized = monthFormatter.format(value).replace('.', '').trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getWeekIndex(gridStart: Date, value: Date) {
  return Math.floor(
    (startOfWeek(value).getTime() - gridStart.getTime()) / (MS_IN_DAY * DAYS_IN_WEEK)
  );
}

function buildYearMonths(year: number, gridStart: Date) {
  const months: LearnerActivityMonth[] = [];

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const monthStart = buildUtcDate(year, monthIndex, 1);
    const monthEnd = buildUtcDate(year, monthIndex + 1, 0);

    months.push({
      key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      label: formatMonthLabel(monthStart),
      startWeekIndex: getWeekIndex(gridStart, monthStart),
      weekSpan: getWeekIndex(gridStart, monthEnd) - getWeekIndex(gridStart, monthStart) + 1,
    });
  }

  return months;
}

function buildActivityYear(
  year: number,
  buckets: Map<string, DayBucket>,
  today: Date,
  todayKey: string
): LearnerActivityYear {
  const yearStart = buildUtcDate(year, 0, 1);
  const yearEnd = buildUtcDate(year, 11, 31);
  const gridStart = startOfWeek(yearStart);
  const gridEnd = endOfWeek(yearEnd);
  const months = buildYearMonths(year, gridStart);
  const weeks: LearnerActivityWeek[] = [];
  let activeDays = 0;
  let totalActions = 0;

  const totalWeeks =
    Math.floor((gridEnd.getTime() - gridStart.getTime()) / (MS_IN_DAY * DAYS_IN_WEEK)) + 1;

  for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex += 1) {
    const weekStart = addDays(gridStart, weekIndex * DAYS_IN_WEEK);
    const days: LearnerActivityDay[] = [];
    let startsMonth = false;

    for (let dayIndex = 0; dayIndex < DAYS_IN_WEEK; dayIndex += 1) {
      const currentDate = addDays(weekStart, dayIndex);
      const currentYear = currentDate.getUTCFullYear();
      const dayKey = getDayKey(currentDate);
      const isOutsideYear = currentYear !== year;
      const isFuture = !isOutsideYear && currentDate > today;
      const bucket = !isOutsideYear && !isFuture ? buckets.get(dayKey) : undefined;
      const count = !isOutsideYear ? bucket?.count ?? 0 : 0;

      if (!isOutsideYear && currentDate.getUTCDate() === 1) {
        startsMonth = true;
      }

      if (!isOutsideYear && count > 0) {
        activeDays += 1;
        totalActions += count;
      }

      days.push({
        count,
        dateLabel: fullDateFormatter.format(currentDate),
        entries: !isOutsideYear ? sortBucketEntries(bucket) : [],
        isFuture,
        isOutsideYear,
        isToday: !isOutsideYear && dayKey === todayKey,
        isoDate: dayKey,
        level: !isOutsideYear && !isFuture ? getActivityLevel(count) : 0,
      });
    }

    weeks.push({
      days,
      key: `${year}-${weekIndex}`,
      startsMonth,
    });
  }

  return {
    activeDays,
    hasActivity: activeDays > 0,
    months,
    totalActions,
    weeks,
    year,
  };
}

export async function getLearnerActivitySnapshot(
  userId: number,
  availableCourses: number
): Promise<LearnerActivitySnapshot> {
  const today = startOfDay(new Date());
  const todayKey = getDayKey(today);
  const currentYear = today.getFullYear();

  const progressRows = await prisma.lessonProgress.findMany({
    where: {
      userId,
      lesson: {
        course: {
          isPublished: true,
        },
      },
    },
    select: {
      completed: true,
      lastViewedAt: true,
      updatedAt: true,
      lesson: {
        select: {
          content: true,
          course: {
            select: {
              id: true,
              slug: true,
              title: true,
            },
          },
          description: true,
          id: true,
          slug: true,
          title: true,
        },
      },
    },
  });

  let activityEvents: ActivityEventRow[] = [];

  try {
    activityEvents = await prisma.$queryRaw<ActivityEventRow[]>`
      SELECT
        event."createdAt" AS "createdAt",
        event."completed" AS "completed",
        course."slug" AS "courseSlug",
        course."title" AS "courseTitle",
        lesson."content" AS "lessonContent",
        lesson."description" AS "lessonDescription",
        lesson."id" AS "lessonId",
        lesson."slug" AS "lessonSlug",
        lesson."title" AS "lessonTitle"
      FROM "LessonActivityEvent" AS event
      INNER JOIN "Lesson" AS lesson ON lesson."id" = event."lessonId"
      INNER JOIN "Course" AS course ON course."id" = lesson."courseId"
      WHERE event."userId" = ${userId}
        AND course."isPublished" = true
      ORDER BY event."createdAt" ASC
    `;
  } catch (activityError) {
    if (!isMissingLessonActivityEventTableError(activityError)) {
      throw activityError;
    }
  }

  const activityBuckets = new Map<string, DayBucket>();
  const fallbackBuckets = new Map<string, DayBucket>();
  const startedCourses = new Set<number>();
  let completedLessons = 0;
  let fallbackLastActiveLesson: ActivitySourceRow | null = null;
  let fallbackLastActivityAt = 0;

  for (const progress of progressRows) {
    startedCourses.add(progress.lesson.course.id);

    if (progress.completed) {
      completedLessons += 1;
    }

    const activityAt = getActivityTimestamp(progress);
    const activityTime = activityAt.getTime();
    const source = toActivitySourceRow(progress);

    appendBucketActivity(fallbackBuckets, getDayKey(activityAt), source, activityTime);

    if (activityTime > fallbackLastActivityAt) {
      fallbackLastActivityAt = activityTime;
      fallbackLastActiveLesson = source;
    }
  }

  for (const activityEvent of activityEvents) {
    appendBucketActivity(
      activityBuckets,
      getDayKey(activityEvent.createdAt),
      activityEvent,
      activityEvent.createdAt.getTime()
    );
  }

  const resolvedBuckets = mergeActivityBuckets(activityBuckets, fallbackBuckets);
  const latestActivityEvent = activityEvents.at(-1) ?? null;
  const latestActivityEventAt = latestActivityEvent?.createdAt.getTime() ?? 0;
  const lastActiveLessonSource =
    fallbackLastActivityAt > latestActivityEventAt
      ? fallbackLastActiveLesson
      : latestActivityEvent;
  const lastActiveLesson = buildLastActiveLesson(lastActiveLessonSource);
  const activityYears = new Set<number>([currentYear, currentYear - 1]);

  for (const dayKey of resolvedBuckets.keys()) {
    activityYears.add(Number(dayKey.slice(0, 4)));
  }

  const years = [...activityYears]
    .sort((left, right) => right - left)
    .map((year) => buildActivityYear(year, resolvedBuckets, today, todayKey));

  let currentStreak = 0;
  let streakDate = today;

  while ((resolvedBuckets.get(getDayKey(streakDate))?.count ?? 0) > 0) {
    currentStreak += 1;
    streakDate = addDays(streakDate, -1);
  }

  return {
    availableCourses,
    currentStreak,
    currentYear,
    defaultYear: currentYear,
    hasActivity: years.some((year) => year.hasActivity),
    lastActiveCourse: lastActiveLesson
      ? {
          slug: lastActiveLesson.courseSlug,
          title: lastActiveLesson.courseTitle,
        }
      : null,
    lastActiveLesson,
    startedCourses: startedCourses.size,
    totalCompletedLessons: completedLessons,
    years,
  };
}
