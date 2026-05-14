'use client';

import Link from 'next/link';
import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import InlineInfo from '@/components/inline-info';
import type {
  LearnerActivityDay,
  LearnerActivityEntry,
  LearnerActivitySnapshot,
  LearnerActivityYear,
} from '@/lib/learner-activity';

type LearnerActivityProps = {
  activity: LearnerActivitySnapshot;
  emptyStateActionHref: string;
  emptyStateActionLabel: string;
};

type HeatmapTooltipAnchor = {
  bottom: number;
  centerX: number;
  top: number;
};

type HeatmapTooltipPosition = {
  left: number;
  placement: 'bottom' | 'top';
  top: number;
};

type TooltipState = {
  anchor: HeatmapTooltipAnchor;
  dayIso: string;
  position: HeatmapTooltipPosition | null;
} | null;

type ActivityMetricKey =
  | 'activeDays'
  | 'available'
  | 'completed'
  | 'lastCourse'
  | 'started'
  | 'streak';

type ActivityMetric = {
  detail: string;
  key: ActivityMetricKey;
  label: string;
  value: string;
};

const weekdayLabels = ['Пн', '', 'Ср', '', 'Пт', '', 'Вс'];

const HEATMAP_TOOLTIP_GAP = 10;
const HEATMAP_TOOLTIP_VIEWPORT_PADDING = 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createHeatmapTooltipAnchor(
  target: HTMLButtonElement,
  wrapper: HTMLDivElement
): HeatmapTooltipAnchor {
  const rect = target.getBoundingClientRect();
  const wrapperRect = wrapper.getBoundingClientRect();

  return {
    bottom: rect.bottom - wrapperRect.top,
    centerX: rect.left - wrapperRect.left + rect.width / 2,
    top: rect.top - wrapperRect.top,
  };
}

function getHeatmapTooltipPosition(
  anchor: HeatmapTooltipAnchor,
  wrapperWidth: number,
  tooltipRect: Pick<DOMRect, 'height' | 'width'>
): HeatmapTooltipPosition {
  const width = tooltipRect.width;
  const height = tooltipRect.height;
  const minCenter = HEATMAP_TOOLTIP_VIEWPORT_PADDING + width / 2;
  const maxCenter = Math.max(minCenter, wrapperWidth - HEATMAP_TOOLTIP_VIEWPORT_PADDING - width / 2);

  let placement: HeatmapTooltipPosition['placement'] = 'top';
  let top = anchor.top;

  if (anchor.top < height + HEATMAP_TOOLTIP_GAP + HEATMAP_TOOLTIP_VIEWPORT_PADDING) {
    placement = 'bottom';
    top = anchor.bottom + HEATMAP_TOOLTIP_GAP;
  }

  return {
    left: clamp(anchor.centerX, minCenter, maxCenter),
    placement,
    top,
  };
}

function getPluralForm(value: number, one: string, few: string, many: string) {
  const absolute = Math.abs(value);
  const mod100 = absolute % 100;
  const mod10 = absolute % 10;

  if (mod100 >= 11 && mod100 <= 14) {
    return many;
  }

  if (mod10 === 1) {
    return one;
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return few;
  }

  return many;
}

function formatActionCount(value: number) {
  return `${value} ${getPluralForm(value, 'действие', 'действия', 'действий')}`;
}

function formatDayCount(value: number) {
  return `${value} ${getPluralForm(value, 'день', 'дня', 'дней')}`;
}

function buildDayHint(day: LearnerActivityDay) {
  if (day.isOutsideYear) {
    return `${day.dateLabel} — вне выбранного года`;
  }

  if (day.isFuture) {
    return `${day.dateLabel} — день еще не наступил`;
  }

  if (day.count === 0) {
    return `${day.dateLabel} — без активности`;
  }

  return `${day.dateLabel} — ${formatActionCount(day.count)}`;
}

function buildLessonHref(entry: LearnerActivityEntry) {
  return `/courses/${entry.courseSlug}?lesson=${encodeURIComponent(entry.lessonSlug)}`;
}

function getEntryStatusKind(entry: LearnerActivityEntry) {
  if (entry.completed) {
    return 'done';
  }

  if (entry.actionCount > 1) {
    return 'updated';
  }

  return 'saved';
}

function getEntryStatusLabel(entry: LearnerActivityEntry) {
  const statusKind = getEntryStatusKind(entry);

  if (statusKind === 'done') {
    return 'Завершен';
  }

  if (statusKind === 'updated') {
    return 'Обновлен';
  }

  return 'Сохранен прогресс';
}

function getTooltipPreview(entries: LearnerActivityEntry[]) {
  return entries.slice(0, 3);
}

function buildMetricItems(
  activity: LearnerActivitySnapshot,
  selectedYearData: LearnerActivityYear
): ActivityMetric[] {
  const hasSelectedYearActivity = selectedYearData.hasActivity;
  const lastCourseTitle = activity.lastActiveCourse?.title ?? 'Пока нет';
  const lastLessonCopy = activity.lastActiveLesson
    ? `Последний урок: «${activity.lastActiveLesson.lessonTitle}».`
    : 'Последний урок появится после первого сохранения прогресса.';
  const streakCopy =
    activity.currentStreak > 0
      ? `${formatDayCount(activity.currentStreak)} подряд.`
      : 'Серия появится после нескольких дней подряд.';

  const lastCourseLabel = hasSelectedYearActivity
    ? '\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0439 \u043a\u0443\u0440\u0441'
    : '\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0439 \u043a\u0443\u0440\u0441 \u0432 \u0446\u0435\u043b\u043e\u043c';
  const lastCourseDetail = hasSelectedYearActivity
    ? `${lastLessonCopy} Текущая серия: ${streakCopy}`
    : activity.lastActiveCourse
      ? `\u0412 ${selectedYearData.year} \u0433\u043e\u0434\u0443 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438 \u043f\u043e\u043a\u0430 \u043d\u0435 \u0431\u044b\u043b\u043e. \u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0439 \u043a\u0443\u0440\u0441 \u0432 \u0446\u0435\u043b\u043e\u043c: \u00ab${activity.lastActiveCourse.title}\u00bb.`
      : `\u0412 ${selectedYearData.year} \u0433\u043e\u0434\u0443 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438 \u043f\u043e\u043a\u0430 \u043d\u0435 \u0431\u044b\u043b\u043e.`;

  return [
    {
      key: 'completed',
      label: 'Уроков завершено',
      value: String(activity.totalCompletedLessons),
      detail: `Всего завершено ${activity.totalCompletedLessons} ${getPluralForm(
        activity.totalCompletedLessons,
        'урок',
        'урока',
        'уроков'
      )}.`,
    },
    {
      key: 'started',
      label: 'Курсов начато',
      value: String(activity.startedCourses),
      detail: `Сейчас в работе ${activity.startedCourses} ${getPluralForm(
        activity.startedCourses,
        'курс',
        'курса',
        'курсов'
      )}.`,
    },
    {
      key: 'available',
      label: 'Доступно курсов',
      value: String(activity.availableCourses),
      detail: `В кабинете доступно ${activity.availableCourses} ${getPluralForm(
        activity.availableCourses,
        'курс',
        'курса',
        'курсов'
      )}.`,
    },
    {
      key: 'activeDays',
      label: 'Активных дней',
      value: String(selectedYearData.activeDays),
      detail: `${formatDayCount(selectedYearData.activeDays)} с активностью за ${selectedYearData.year} год.`,
    },
    {
      key: 'streak',
      label: 'Текущая серия',
      value: String(activity.currentStreak),
      detail: `Серия сейчас: ${streakCopy}`,
    },
    {
      key: 'lastCourse',
      label: lastCourseLabel,
      value: lastCourseTitle,
      detail: lastCourseDetail,
    },
  ];
}

function buildCalendarGridStyle(weeksCount: number): CSSProperties {
  return {
    gridTemplateColumns: `repeat(${weeksCount}, var(--activity-cell-size))`,
  };
}

function buildMonthColumnStyle(startWeekIndex: number, weekSpan: number): CSSProperties {
  return {
    gridColumn: `${startWeekIndex + 1} / span ${weekSpan}`,
  };
}

export default function LearnerActivity({
  activity,
  emptyStateActionHref,
  emptyStateActionLabel,
}: LearnerActivityProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const axisRef = useRef<HTMLDivElement | null>(null);
  const calendarBodyRef = useRef<HTMLDivElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const calendarShellRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [supportsHover, setSupportsHover] = useState(false);
  const [selectedYear, setSelectedYear] = useState(activity.defaultYear);
  const [selectedDayIso, setSelectedDayIso] = useState('');
  const [calendarCellSize, setCalendarCellSize] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const selectedYearData =
    activity.years.find((year) => year.year === selectedYear) ?? activity.years[0];
  const days = selectedYearData.weeks.flatMap((week) => week.days);
  const tooltipDay = days.find((day) => day.isoDate === tooltip?.dayIso) ?? null;
  const selectedDay = days.find((day) => day.isoDate === selectedDayIso) ?? null;
  const calendarGridStyle = buildCalendarGridStyle(selectedYearData.weeks.length);
  const metricItems = buildMetricItems(activity, selectedYearData);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => {
      setSupportsHover(media.matches);

      if (!media.matches) {
        setTooltip(null);
      }
    };

    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);

      return () => media.removeEventListener('change', update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const desktopMedia = window.matchMedia('(min-width: 960px)');

    const updateCalendarCellSize = () => {
      const axis = axisRef.current;
      const calendar = calendarRef.current;
      const calendarBody = calendarBodyRef.current;

      if (!desktopMedia.matches) {
        setCalendarCellSize(null);
        return;
      }

      if (!axis || !calendar || !calendarBody || selectedYearData.weeks.length === 0) {
        return;
      }

      const axisWidth = axis.getBoundingClientRect().width;
      const bodyGap = Number.parseFloat(window.getComputedStyle(calendarBody).columnGap || '0');
      const calendarGap = Number.parseFloat(window.getComputedStyle(calendar).columnGap || '0');
      const availableWidth = calendarBody.clientWidth - axisWidth - bodyGap;

      if (availableWidth <= 0) {
        return;
      }

      const nextCellSize = Math.max(
        12,
        (availableWidth - calendarGap * (selectedYearData.weeks.length - 1)) /
          selectedYearData.weeks.length
      );

      setCalendarCellSize((current) =>
        current !== null && Math.abs(current - nextCellSize) < 0.25 ? current : nextCellSize
      );
    };

    updateCalendarCellSize();

    const observer = new ResizeObserver(() => {
      updateCalendarCellSize();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    if (calendarBodyRef.current) {
      observer.observe(calendarBodyRef.current);
    }

    if (typeof desktopMedia.addEventListener === 'function') {
      desktopMedia.addEventListener('change', updateCalendarCellSize);
    } else {
      desktopMedia.addListener(updateCalendarCellSize);
    }

    return () => {
      observer.disconnect();

      if (typeof desktopMedia.removeEventListener === 'function') {
        desktopMedia.removeEventListener('change', updateCalendarCellSize);
      } else {
        desktopMedia.removeListener(updateCalendarCellSize);
      }
    };
  }, [selectedYearData.weeks.length]);

  useEffect(() => {
    if (!selectedDay) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedDayIso('');
      }
    }

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [selectedDay]);

  useLayoutEffect(() => {
    if (
      typeof window === 'undefined' ||
      !supportsHover ||
      !tooltip ||
      !tooltipDay ||
      selectedDay ||
      !calendarShellRef.current ||
      !tooltipRef.current
    ) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();
      const shellRect = calendarShellRef.current?.getBoundingClientRect();

      if (!tooltipRect || !shellRect) {
        return;
      }

      const nextPosition = getHeatmapTooltipPosition(tooltip.anchor, shellRect.width, tooltipRect);

      setTooltip((current) => {
        if (!current || current.dayIso !== tooltip.dayIso) {
          return current;
        }

        if (
          current.position &&
          current.position.left === nextPosition.left &&
          current.position.top === nextPosition.top &&
          current.position.placement === nextPosition.placement
        ) {
          return current;
        }

        return {
          ...current,
          position: nextPosition,
        };
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [selectedDay, supportsHover, tooltip, tooltipDay]);

  useEffect(() => {
    if (!tooltip) {
      return undefined;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setTooltip(null);
      }
    }

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [tooltip]);

  function hideTooltip(dayIso?: string) {
    setTooltip((current) => {
      if (!current) {
        return null;
      }

      if (dayIso && current.dayIso !== dayIso) {
        return current;
      }

      return null;
    });
  }

  function showTooltip(target: HTMLButtonElement, day: LearnerActivityDay) {
    if (day.isOutsideYear || day.isFuture || day.count === 0 || !supportsHover) {
      hideTooltip();
      return;
    }

    if (!calendarShellRef.current) {
      return;
    }

    setTooltip({
      anchor: createHeatmapTooltipAnchor(target, calendarShellRef.current),
      dayIso: day.isoDate,
      position: null,
    });
  }

  function handleDayClick(day: LearnerActivityDay) {
    if (day.isOutsideYear || day.isFuture || day.count === 0) {
      return;
    }

    setSelectedDayIso(day.isoDate);
    setTooltip(null);
  }

  function handleYearSelect(year: number) {
    setSelectedYear(year);
    setSelectedDayIso('');
    setTooltip(null);
  }

  const activityStyle =
    calendarCellSize !== null
      ? ({ '--activity-cell-size': `${calendarCellSize}px` } as CSSProperties)
      : undefined;

  return (
    <section
      aria-labelledby="learner-activity-title"
      className="panel dashboard-activity"
      ref={containerRef}
      style={activityStyle}
    >
      <div className="dashboard-activity__head">
        <div className="dashboard-activity__title-row">
          <div>
            <span className="eyebrow">Активность обучения</span>
            <h2 id="learner-activity-title">Годовая активность</h2>
          </div>

          <InlineInfo align="end" label="Как читать activity block" overlay>
            График показывает весь выбранный год. Наведите или сфокусируйтесь на активном дне,
            чтобы увидеть краткий preview, и нажмите на клетку, чтобы открыть полный список
            уроков за этот день.
          </InlineInfo>
        </div>

        <div className="dashboard-activity__summary-row">
          <span className="dashboard-activity__year-chip">{selectedYearData.year} год</span>
          <span className="dashboard-activity__summary-stat">
            {formatDayCount(selectedYearData.activeDays)}
          </span>
          <span className="dashboard-activity__summary-stat">
            {selectedYearData.totalActions > 0
              ? formatActionCount(selectedYearData.totalActions)
              : 'Без активности'}
          </span>
        </div>
      </div>

      <div className="dashboard-activity__workspace">
        <div className="dashboard-activity__main">
          <div
            className="dashboard-activity__calendar-shell"
            ref={calendarShellRef}
            onMouseLeave={() => {
              if (supportsHover) {
                setTooltip(null);
              }
            }}
          >
            <div className="dashboard-activity__calendar-scroller">
              <div className="dashboard-activity__calendar-frame">
                <div className="dashboard-activity__months" style={calendarGridStyle}>
                  {selectedYearData.months.map((month) => (
                    <span
                      className="dashboard-activity__month"
                      key={month.key}
                      style={buildMonthColumnStyle(month.startWeekIndex, month.weekSpan)}
                    >
                      {month.label}
                    </span>
                  ))}
                </div>

                <div className="dashboard-activity__calendar-body" ref={calendarBodyRef}>
                  <div className="dashboard-activity__axis" aria-hidden="true" ref={axisRef}>
                    {weekdayLabels.map((label, index) => (
                      <span key={`${label}-${index}`}>{label}</span>
                    ))}
                  </div>

                  <div className="dashboard-activity__calendar-stack">
                    <div
                      aria-hidden="true"
                      className="dashboard-activity__month-bands"
                      style={calendarGridStyle}
                    >
                      {selectedYearData.months.map((month, index) => (
                        <span
                          className={`dashboard-activity__month-band${
                            index % 2 === 0 ? ' dashboard-activity__month-band--alt' : ''
                          }`}
                          key={`${month.key}-band`}
                          style={buildMonthColumnStyle(month.startWeekIndex, month.weekSpan)}
                        />
                      ))}
                    </div>

                    <div
                      aria-label={`Календарь активности за ${selectedYearData.year} год`}
                      className="dashboard-activity__calendar"
                      ref={calendarRef}
                      role="grid"
                      style={calendarGridStyle}
                    >
                      {selectedYearData.weeks.map((week) => (
                        <div
                          className={`dashboard-activity__week${
                            week.startsMonth ? ' dashboard-activity__week--month-start' : ''
                          }`}
                          key={week.key}
                          role="rowgroup"
                        >
                          {week.days.map((day) => {
                            const hint = buildDayHint(day);
                            const isSelected = selectedDay?.isoDate === day.isoDate;
                            const isTooltipActive = tooltipDay?.isoDate === day.isoDate;

                            return (
                              <button
                                aria-expanded={isSelected}
                                aria-haspopup={day.count > 0 ? 'dialog' : undefined}
                                aria-label={hint}
                                className={[
                                  'dashboard-activity__cell',
                                  `dashboard-activity__cell--level-${day.level}`,
                                  day.isToday ? 'dashboard-activity__cell--today' : '',
                                  day.isFuture ? 'dashboard-activity__cell--future' : '',
                                  day.isOutsideYear ? 'dashboard-activity__cell--outside' : '',
                                  isSelected || isTooltipActive
                                    ? 'dashboard-activity__cell--active'
                                    : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                                disabled={day.isFuture || day.isOutsideYear || day.count === 0}
                                key={day.isoDate}
                                onBlur={() => hideTooltip(day.isoDate)}
                                onClick={() => handleDayClick(day)}
                                onFocus={(event) => showTooltip(event.currentTarget, day)}
                                onMouseEnter={(event) => showTooltip(event.currentTarget, day)}
                                onMouseLeave={() => hideTooltip(day.isoDate)}
                                type="button"
                              >
                                <span className="sr-only">{hint}</span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {supportsHover && tooltipDay && !selectedDay ? (
              <div
                className={`dashboard-activity__tooltip dashboard-activity__tooltip--local dashboard-activity__tooltip--${
                  tooltip?.position?.placement ?? 'top'
                }`}
                ref={tooltipRef}
                role="status"
                style={
                  (tooltip?.position
                    ? {
                        left: `${tooltip.position.left}px`,
                        top: `${tooltip.position.top}px`,
                        transform:
                          tooltip.position.placement === 'top'
                            ? 'translate(-50%, calc(-100% - 10px))'
                            : 'translate(-50%, 0)',
                      }
                    : {
                        left: '0px',
                        top: '0px',
                        visibility: 'hidden',
                      }) as CSSProperties
                }
              >
                <strong>{tooltipDay.dateLabel}</strong>
                <p>{formatActionCount(tooltipDay.count)}</p>
                {tooltipDay.entries.length > 0 ? (
                  <ul>
                    {getTooltipPreview(tooltipDay.entries).map((entry) => (
                      <li key={entry.lessonId}>
                        <span>{entry.lessonTitle}</span>
                        <small>{getEntryStatusLabel(entry)}</small>
                      </li>
                    ))}
                  {tooltipDay!.entries.length > 3 ? (
                    <li className="dashboard-activity__tooltip-more">
                      Р РµС‰Рµ {tooltipDay!.entries.length - 3}
                    </li>
                  ) : null}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <div className="dashboard-activity__footer">
              <div className="dashboard-activity__legend" aria-hidden="true">
                <span>Реже</span>
                <span className="dashboard-activity__legend-cell" />
                <span className="dashboard-activity__legend-cell dashboard-activity__legend-cell--1" />
                <span className="dashboard-activity__legend-cell dashboard-activity__legend-cell--2" />
                <span className="dashboard-activity__legend-cell dashboard-activity__legend-cell--3" />
                <span>Чаще</span>
              </div>

              <div className="dashboard-activity__footer-actions">
                {!selectedYearData.hasActivity ? (
                  <span className="dashboard-activity__empty-note">
                    В {selectedYearData.year} году пока нет активности.
                  </span>
                ) : null}

                {!activity.hasActivity ? (
                  <Link className="secondary-button" href={emptyStateActionHref}>
                    {emptyStateActionLabel}
                  </Link>
                ) : null}

                <InlineInfo align="end" label="Подсказка по activity block" overlay>
                  Клик по активному дню открывает модальное окно с уроками, статусами, краткими
                  summary и кнопкой перехода в урок.
                </InlineInfo>
              </div>
            </div>
          </div>
        </div>

        <aside className="dashboard-activity__years" aria-label="Выбор года">
          {activity.years.map((yearData) => {
            const isActive = yearData.year === selectedYear;

            return (
              <button
                aria-pressed={isActive}
                className={`dashboard-activity__year-button${
                  isActive ? ' dashboard-activity__year-button--active' : ''
                }`}
                key={yearData.year}
                onClick={() => handleYearSelect(yearData.year)}
                type="button"
              >
                <span className="dashboard-activity__year-value">{yearData.year}</span>
                <span className="dashboard-activity__year-meta">
                  {yearData.hasActivity
                    ? `${yearData.activeDays} ${getPluralForm(
                        yearData.activeDays,
                        'день',
                        'дня',
                        'дней'
                      )}`
                    : 'без данных'}
                </span>
              </button>
            );
          })}
        </aside>
      </div>

      <div className="dashboard-activity__metrics-block">
        <div className="dashboard-activity__metrics" role="list">
          {metricItems.map((metric) => {
            return (
              <article
                className="dashboard-activity__metric"
                key={metric.key}
                role="listitem"
              >
                <div className="dashboard-activity__metric-head">
                  <span className="dashboard-activity__metric-label">{metric.label}</span>
                  <InlineInfo align="end" label={`Пояснение: ${metric.label}`} overlay>
                    {metric.detail}
                  </InlineInfo>
                </div>
                <strong
                  className={[
                    'dashboard-activity__metric-value',
                    metric.key === 'lastCourse'
                      ? 'dashboard-activity__metric-value--text'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {metric.value}
                </strong>
              </article>
            );
          })}
        </div>
      </div>

      {false && supportsHover && tooltipDay && !selectedDay && typeof document !== 'undefined'
        ? createPortal(
            <div
              className={`dashboard-activity__tooltip dashboard-activity__tooltip--${
                tooltip!.position!.placement
              }`}
              ref={tooltipRef}
              role="status"
              style={
                (tooltip?.position
                  ? {
                      left: `${tooltip!.position!.left}px`,
                      top: `${tooltip!.position!.top}px`,
                    }
                  : {
                      left: '0px',
                      top: '0px',
                      visibility: 'hidden',
                    }) as CSSProperties
              }
            >
              <strong>{tooltipDay!.dateLabel}</strong>
              <p>{formatActionCount(tooltipDay!.count)}</p>
              {tooltipDay!.entries.length > 0 ? (
                <ul>
                  {getTooltipPreview(tooltipDay!.entries).map((entry) => (
                    <li key={entry.lessonId}>
                      <span>{entry.lessonTitle}</span>
                      <small>{getEntryStatusLabel(entry)}</small>
                    </li>
                  ))}
                  {tooltipDay!.entries.length > 3 ? (
                    <li className="dashboard-activity__tooltip-more">
                      И еще {tooltipDay!.entries.length - 3}
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>,
            document.body
          )
        : null}

      {selectedDay && selectedDay.count > 0 ? (
        <div
          aria-modal="true"
          className="dashboard-activity-modal"
          onClick={() => setSelectedDayIso('')}
          role="dialog"
        >
          <div
            className="dashboard-activity-modal__window"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dashboard-activity-modal__head">
              <div>
                <span className="eyebrow">Активность за день</span>
                <h3>{selectedDay.dateLabel}</h3>
                <p className="panel-copy">{formatActionCount(selectedDay.count)}</p>
              </div>

              <button
                aria-label="Закрыть"
                className="ghost-button dashboard-activity-modal__close"
                onClick={() => setSelectedDayIso('')}
                type="button"
              >
                Закрыть
              </button>
            </div>

            <div className="dashboard-activity-modal__list">
              {selectedDay.entries.map((entry) => {
                const statusKind = getEntryStatusKind(entry);

                return (
                  <article className="dashboard-activity-modal__item" key={entry.lessonId}>
                    <div className="dashboard-activity-modal__item-head">
                      <div>
                        <span className="dashboard-activity-modal__course">
                          {entry.courseTitle}
                        </span>
                        <h4>{entry.lessonTitle}</h4>
                      </div>

                      <span
                        className={`dashboard-activity-modal__status dashboard-activity-modal__status--${statusKind}`}
                      >
                        {getEntryStatusLabel(entry)}
                      </span>
                    </div>

                    <p className="dashboard-activity-modal__summary">{entry.lessonSummary}</p>

                    <div className="dashboard-activity-modal__actions">
                      <span className="dashboard-activity-modal__meta">
                        {entry.actionCount > 1
                          ? `${formatActionCount(entry.actionCount)} по уроку`
                          : '1 сохранение прогресса'}
                      </span>

                      <Link className="secondary-button" href={buildLessonHref(entry)}>
                        Открыть урок
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
