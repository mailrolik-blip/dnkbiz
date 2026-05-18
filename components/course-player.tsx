'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from 'react';

import type { CourseViewerData, CourseViewerLesson } from '@/lib/course-access';
import { dnkFeaturedPrograms } from '@/lib/dnk-content';
import { getCourseCatalogHref } from '@/lib/lms-catalog';
import { getActiveOrderActionLabel } from '@/lib/payments/constants';
import { formatPreviewLessons } from '@/lib/purchase-ux';

type CoursePlayerProps = {
  course: CourseViewerData;
  initialLessonSlug?: string | null;
};

type ChatMessage = {
  id: number;
  role: 'ai' | 'user';
  text: string;
};

type HomeworkType = 'TEXT' | 'CHECKLIST' | 'ACTION_PLAN';

type HomeworkDraft = {
  text: string;
  selectedOptions: string[];
};

type ContentBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'ordered-list'; items: string[] }
  | { type: 'quote'; text: string };

type VideoPresentation =
  | {
      kind: 'iframe';
      src: string;
      providerLabel: string;
    }
  | {
      kind: 'video';
      src: string;
      providerLabel: string;
    }
  | {
      kind: 'link';
      src: string;
      providerLabel: string;
    };

function formatDateTime(value: string | null) {
  if (!value) {
    return 'еще не сохраняли';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatMoney(value: number) {
  return `${value.toLocaleString('ru-RU')} ₽`;
}

function isCourseCompleted(lessons: CourseViewerLesson[]) {
  return lessons.length > 0 && lessons.every((lesson) => lesson.progress?.completed);
}

function getNextLessonId(lessons: CourseViewerLesson[], currentLessonId?: number) {
  if (currentLessonId && lessons.some((lesson) => lesson.id === currentLessonId)) {
    return currentLessonId;
  }

  return (
    lessons.find((lesson) => !lesson.isLocked && !lesson.progress?.completed)?.id ??
    lessons.find((lesson) => lesson.isLocked)?.id ??
    lessons.find((lesson) => !lesson.isLocked)?.id ??
    lessons[0]?.id ??
    0
  );
}

function getRequestedLessonId(
  lessons: CourseViewerLesson[],
  requestedLessonSlug: string | null
) {
  if (!requestedLessonSlug) {
    return undefined;
  }

  const lesson = lessons.find(
    (item) => item.slug === requestedLessonSlug && !item.isLocked
  );

  return lesson?.id;
}

function normalizeHomeworkType(value: string | null | undefined): HomeworkType {
  if (!value) {
    return 'TEXT';
  }

  const normalized = value.trim().toUpperCase();

  if (normalized === 'CHECKLIST') {
    return 'CHECKLIST';
  }

  if (normalized === 'ACTION_PLAN') {
    return 'ACTION_PLAN';
  }

  return 'TEXT';
}

function getHomeworkTypeLabel(type: HomeworkType) {
  if (type === 'CHECKLIST') {
    return 'Чек-лист действия';
  }

  if (type === 'ACTION_PLAN') {
    return 'План внедрения';
  }

  return 'Рабочий ответ';
}

function getHomeworkPlaceholder(type: HomeworkType) {
  if (type === 'ACTION_PLAN') {
    return 'Опишите шаги, сроки, ответственных и ожидаемый результат...';
  }

  if (type === 'CHECKLIST') {
    return 'Коротко зафиксируйте выводы по выбранным пунктам и следующий шаг...';
  }

  return 'Ответ, заметки или план действий по уроку...';
}

function parseHomeworkAnswer(lesson: CourseViewerLesson): HomeworkDraft {
  const type = normalizeHomeworkType(lesson.homeworkType);
  const rawAnswer = lesson.progress?.answer;

  if (!rawAnswer) {
    return { text: '', selectedOptions: [] };
  }

  if (type !== 'CHECKLIST') {
    return {
      text: rawAnswer,
      selectedOptions: [],
    };
  }

  try {
    const parsed = JSON.parse(rawAnswer) as {
      text?: unknown;
      selectedOptions?: unknown;
    };

    return {
      text: typeof parsed.text === 'string' ? parsed.text : '',
      selectedOptions: Array.isArray(parsed.selectedOptions)
        ? parsed.selectedOptions.filter(
            (item): item is string => typeof item === 'string' && item.trim().length > 0
          )
        : [],
    };
  } catch {
    return {
      text: rawAnswer,
      selectedOptions: [],
    };
  }
}

function serializeHomeworkAnswer(lesson: CourseViewerLesson, draft: HomeworkDraft) {
  const type = normalizeHomeworkType(lesson.homeworkType);

  if (type === 'CHECKLIST') {
    if (draft.text.trim().length === 0 && draft.selectedOptions.length === 0) {
      return null;
    }

    return JSON.stringify({
      text: draft.text.trim(),
      selectedOptions: draft.selectedOptions,
    });
  }

  const normalized = draft.text.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseContentBlocks(content: string): ContentBlock[] {
  return content
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith('## ')) {
        return {
          type: 'heading',
          text: block.replace(/^##\s+/, '').trim(),
        } satisfies ContentBlock;
      }

      if (block.startsWith('> ')) {
        return {
          type: 'quote',
          text: block
            .split('\n')
            .map((line) => line.replace(/^>\s?/, '').trim())
            .join(' '),
        } satisfies ContentBlock;
      }

      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);

      if (lines.length > 0 && lines.every((line) => /^-\s+/.test(line))) {
        return {
          type: 'list',
          items: lines.map((line) => line.replace(/^-\s+/, '').trim()),
        } satisfies ContentBlock;
      }

      if (lines.length > 0 && lines.every((line) => /^\d+\.\s+/.test(line))) {
        return {
          type: 'ordered-list',
          items: lines.map((line) => line.replace(/^\d+\.\s+/, '').trim()),
        } satisfies ContentBlock;
      }

      return {
        type: 'paragraph',
        text: block,
      } satisfies ContentBlock;
    });
}

function normalizeVideoProvider(url: string | null, provider: string | null) {
  const normalizedProvider = provider?.trim().toLowerCase();

  if (normalizedProvider) {
    return normalizedProvider;
  }

  if (!url) {
    return null;
  }

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }

  if (url.includes('rutube.ru')) {
    return 'rutube';
  }

  if (url.includes('vimeo.com')) {
    return 'vimeo';
  }

  if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(url)) {
    return 'file';
  }

  return 'link';
}

function extractYouTubeId(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace(/^\/+/, '').split('/')[0] || null;
    }

    return parsed.searchParams.get('v');
  } catch {
    return null;
  }
}

function extractRutubeId(url: string) {
  const match = url.match(/rutube\.ru\/video\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

function extractVimeoId(url: string) {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] ?? null;
}

function getVideoPresentation(lesson: CourseViewerLesson): VideoPresentation | null {
  if (!lesson.videoUrl) {
    return null;
  }

  const provider = normalizeVideoProvider(lesson.videoUrl, lesson.videoProvider);

  if (provider === 'youtube') {
    const videoId = extractYouTubeId(lesson.videoUrl);
    if (!videoId) {
      return {
        kind: 'link',
        src: lesson.videoUrl,
        providerLabel: 'Внешняя ссылка',
      };
    }

    return {
      kind: 'iframe',
      src: `https://www.youtube.com/embed/${videoId}`,
      providerLabel: 'YouTube',
    };
  }

  if (provider === 'rutube') {
    const videoId = extractRutubeId(lesson.videoUrl);
    if (!videoId) {
      return {
        kind: 'link',
        src: lesson.videoUrl,
        providerLabel: 'Внешняя ссылка',
      };
    }

    return {
      kind: 'iframe',
      src: `https://rutube.ru/play/embed/${videoId}`,
      providerLabel: 'Rutube',
    };
  }

  if (provider === 'vimeo') {
    const videoId = extractVimeoId(lesson.videoUrl);
    if (!videoId) {
      return {
        kind: 'link',
        src: lesson.videoUrl,
        providerLabel: 'Внешняя ссылка',
      };
    }

    return {
      kind: 'iframe',
      src: `https://player.vimeo.com/video/${videoId}`,
      providerLabel: 'Vimeo',
    };
  }

  if (provider === 'file') {
    return {
      kind: 'video',
      src: lesson.videoUrl,
      providerLabel: 'Встроенное видео',
    };
  }

  return {
    kind: 'link',
    src: lesson.videoUrl,
    providerLabel: 'Внешняя ссылка',
  };
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 20.5 4.8 13.6A4.9 4.9 0 0 1 11.8 6.8L12 7l.2-.2a4.9 4.9 0 0 1 7 6.8L12 20.5Z" />
    </svg>
  );
}

function UserAvatarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="8.2" r="3.2" />
      <path d="M5.5 19c1.4-3.1 4-4.7 6.5-4.7s5.1 1.6 6.5 4.7" />
    </svg>
  );
}

function ChecklistIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M9 7.5h9" />
      <path d="M9 12h9" />
      <path d="M9 16.5h9" />
      <path d="m5.5 7.5 1.2 1.2 2-2.4" />
      <path d="m5.5 12 1.2 1.2 2-2.4" />
      <path d="m5.5 16.5 1.2 1.2 2-2.4" />
    </svg>
  );
}

function LessonContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <h3 key={`heading-${index}`} className="lesson-rich-content__heading">
              {block.text}
            </h3>
          );
        }

        if (block.type === 'list') {
          return (
            <ul key={`list-${index}`} className="lesson-rich-content__list">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ordered-list') {
          return (
            <ol key={`ordered-${index}`} className="lesson-rich-content__ordered-list">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          );
        }

        if (block.type === 'quote') {
          return (
            <blockquote key={`quote-${index}`} className="lesson-rich-content__quote">
              {block.text}
            </blockquote>
          );
        }

        return (
          <p key={`paragraph-${index}`} className="lesson-rich-content__paragraph">
            {block.text}
          </p>
        );
      })}
    </>
  );
}

function LessonContent({ content }: { content: string }) {
  const blocks = parseContentBlocks(content);

  return (
    <div className="lesson-content lesson-content--lms lesson-rich-content">
      <LessonContentBlocks blocks={blocks} />
    </div>
  );
}

function VideoBlock({ lesson }: { lesson: CourseViewerLesson }) {
  const presentation = getVideoPresentation(lesson);

  if (!presentation) {
    return (
      <div className="video-placeholder lesson-video lesson-video--fallback">
        <div className="video-placeholder__icon">
          <PlayIcon />
        </div>
        <div className="lesson-video__meta">
          <strong>Видео к уроку пока не добавлено</strong>
          <p>
            Этот урок можно пройти в текстовом формате: изучите материал, выполните
            практику и сохраните прогресс в блоке домашнего задания.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="lesson-video">
      <div className="lesson-video__media">
        {presentation.kind === 'iframe' ? (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="lesson-video__frame"
            referrerPolicy="strict-origin-when-cross-origin"
            src={presentation.src}
            title={`Видео урока: ${lesson.title}`}
          />
        ) : presentation.kind === 'video' ? (
          <video className="lesson-video__native" controls preload="metadata" src={presentation.src}>
            Ваш браузер не поддерживает встроенное видео.
          </video>
        ) : (
          <div className="video-placeholder lesson-video__link-fallback">
            <div className="video-placeholder__icon">
              <PlayIcon />
            </div>
            <div className="lesson-video__meta">
              <strong>Видео доступно по ссылке</strong>
              <p>Откройте материал во внешнем окне и затем вернитесь к уроку для практики.</p>
              <a
                className="secondary-button"
                href={presentation.src}
                rel="noreferrer"
                target="_blank"
              >
                Открыть видео
              </a>
            </div>
          </div>
        )}
      </div>

      {presentation.kind !== 'link' ? (
        <div className="lesson-video__meta">
          <div className="badge-row">
            <span className="badge badge-complete">Видео урока</span>
            <span className="badge badge-pending">{presentation.providerLabel}</span>
          </div>
          {lesson.videoUrl ? (
            <a
              className="lesson-video__source"
              href={lesson.videoUrl}
              rel="noreferrer"
              target="_blank"
            >
              Открыть источник в новой вкладке
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PaywallBlock({
  course,
  lesson,
  purchasePending,
  onCreateOrder,
}: {
  course: CourseViewerData;
  lesson: CourseViewerLesson;
  purchasePending: boolean;
  onCreateOrder: () => void;
}) {
  return (
    <div className="course-paywall">
      <div className="course-paywall__icon">
        <LockIcon />
      </div>
      <div className="course-paywall__copy">
        <span className="eyebrow">Полный доступ после подтверждения оплаты</span>
        <h3>{lesson.title}</h3>
        <p>
          Этот урок закрыт. До покупки доступны{' '}
          {formatPreviewLessons(course.access.previewLessonsCount)}, а после подтверждения оплаты
          откроются остальные модули, домашние задания и весь курс.
        </p>
      </div>
      <div className="badge-row course-paywall__badges">
        {course.access.tariff ? (
          <span className="badge badge-paid">
            {formatMoney(course.access.tariff.price)}
          </span>
        ) : null}
        <span className="badge badge-pending">
          {formatPreviewLessons(course.access.previewLessonsCount)}
        </span>
      </div>
      <div className="row-actions">
        {course.access.pendingOrder ? (
          <Link href={course.access.pendingOrder.checkoutUrl} className="primary-button">
            {getActiveOrderActionLabel(course.access.pendingOrder.status)}
          </Link>
        ) : (
          <button
            className="primary-button"
            disabled={purchasePending}
            onClick={onCreateOrder}
            type="button"
          >
            {purchasePending ? 'Открываем оплату...' : 'Получить доступ'}
          </button>
        )}
        <Link href="/lk" className="secondary-button">
          В кабинет
        </Link>
      </div>
    </div>
  );
}

function LessonHomeworkPanel({
  className,
  compact = false,
  secondaryActionLabel,
  showChecklistOptions = true,
  homeworkDraft,
  homeworkOptions,
  homeworkType,
  lesson,
  nextLesson,
  pendingLessonId,
  onCompletedToggle,
  onHomeworkOptionToggle,
  onHomeworkTextChange,
  onOpenNextLesson,
  onPersistProgress,
}: {
  className?: string;
  compact?: boolean;
  secondaryActionLabel?: string;
  showChecklistOptions?: boolean;
  homeworkDraft: HomeworkDraft;
  homeworkOptions: string[];
  homeworkType: HomeworkType;
  lesson: CourseViewerLesson;
  nextLesson: CourseViewerLesson | null;
  pendingLessonId: number | null;
  onCompletedToggle: (completed: boolean) => void;
  onHomeworkOptionToggle: (option: string) => void;
  onHomeworkTextChange: (text: string) => void;
  onOpenNextLesson: () => void;
  onPersistProgress: () => void;
}) {
  return (
    <div className={['homework-box', className].filter(Boolean).join(' ')}>
      <div className="hw-header">
        <div className="hw-header__copy">
          <span className="hw-label">Домашняя практика</span>
          <h3 className="hw-title">
            {lesson.homeworkTitle || 'Закрепление материала'}
          </h3>
        </div>
        <span className="muted-text">
          Последнее сохранение:{' '}
          {formatDateTime(lesson.progress?.updatedAt ?? lesson.progress?.lastViewedAt ?? null)}
        </span>
      </div>

      <div className="badge-row">
        <span className="badge badge-complete">{getHomeworkTypeLabel(homeworkType)}</span>
        {homeworkOptions.length > 0 ? (
          <span className="badge badge-pending">
            {homeworkOptions.length} пунктов практики
          </span>
        ) : null}
      </div>

      <div className="hw-task">
        {lesson.homeworkPrompt ||
          'Зафиксируйте ключевую мысль урока и сохраните рабочий вывод в прогрессе.'}
      </div>

      {showChecklistOptions && homeworkOptions.length > 0 ? (
        <div className="hw-options-grid hw-options-grid--checklist">
          {homeworkOptions.map((option) => {
            const checked = homeworkDraft.selectedOptions.includes(option);

            return (
              <label
                key={option}
                className={`hw-checkbox ${checked ? 'hw-checkbox--checked' : ''}`}
              >
                <input
                  checked={checked}
                  onChange={() => onHomeworkOptionToggle(option)}
                  type="checkbox"
                />
                <span className="checkmark">
                  <CheckIcon />
                </span>
                <span className="hw-checkbox__copy">{option}</span>
              </label>
            );
          })}
        </div>
      ) : null}

      {compact ? (
        <details className="hw-mobile-notes">
          <summary className="hw-mobile-notes__summary">Заметки по уроку</summary>
          <label className="field" style={{ gap: '0.55rem' }}>
            <span className="hw-textarea-label">Ответ по уроку</span>
            <textarea
              className="hw-input"
              onChange={(event) => onHomeworkTextChange(event.target.value)}
              placeholder={getHomeworkPlaceholder(homeworkType)}
              rows={4}
              value={homeworkDraft.text}
            />
          </label>
        </details>
      ) : (
        <label className="field" style={{ gap: '0.55rem' }}>
          <span className="hw-textarea-label">Ответ по уроку</span>
          <textarea
            className="hw-input"
            onChange={(event) => onHomeworkTextChange(event.target.value)}
            placeholder={getHomeworkPlaceholder(homeworkType)}
            rows={6}
            value={homeworkDraft.text}
          />
        </label>
      )}

      <div className="hw-options-grid hw-options-grid--single">
        <label className="hw-checkbox">
          <input
            checked={lesson.progress?.completed ?? false}
            disabled={pendingLessonId === lesson.id}
            onChange={(event) => onCompletedToggle(event.target.checked)}
            type="checkbox"
          />
          <span className="checkmark">
            <CheckIcon />
          </span>
          <span>Отметить урок завершенным</span>
        </label>
      </div>

      <div className="row-actions" style={{ marginTop: '1rem' }}>
        <button
          className="primary-button"
          disabled={pendingLessonId === lesson.id}
          onClick={onPersistProgress}
          type="button"
        >
          {pendingLessonId === lesson.id ? 'Сохраняем...' : 'Сохранить прогресс'}
        </button>
        {nextLesson ? (
          <button className="secondary-button" onClick={onOpenNextLesson} type="button">
            {secondaryActionLabel || 'Следующий урок'}
          </button>
        ) : (
          <Link className="secondary-button" href="/lk">
            Вернуться в кабинет
          </Link>
        )}
      </div>
    </div>
  );
}

export default function CoursePlayer({
  course,
  initialLessonSlug = null,
}: CoursePlayerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const requestedLessonSlug = initialLessonSlug;
  const initialCourseComplete = isCourseCompleted(course.lessons);
  const [courseState, setCourseState] = useState(course);
  const [lessons, setLessons] = useState(course.lessons);
  const [currentLessonId, setCurrentLessonId] = useState(() =>
    getNextLessonId(
      course.lessons,
      getRequestedLessonId(course.lessons, requestedLessonSlug)
    )
  );
  const [pendingLessonId, setPendingLessonId] = useState<number | null>(null);
  const [purchasePending, setPurchasePending] = useState(false);
  const [message, setMessage] = useState<{
    tone: 'error' | 'success';
    text: string;
  } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(initialCourseComplete);
  const [chatDraft, setChatDraft] = useState('');
  const [activeMobileCardIndex, setActiveMobileCardIndex] = useState(0);
  const [mobileCardDetailsOpen, setMobileCardDetailsOpen] = useState(false);
  const [mobileCardMotion, setMobileCardMotion] = useState<'forward' | 'backward' | null>(null);
  const [mobileCardReadProgress, setMobileCardReadProgress] = useState(0);
  const [mobileHeaderCollapsed, setMobileHeaderCollapsed] = useState(false);
  const [showLessonTip, setShowLessonTip] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'ai',
      text: 'Привет! Я помощник по курсу. Здесь можно собирать вопросы по уроку и фиксировать важные мысли по ходу обучения.',
    },
  ]);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const completionRef = useRef(initialCourseComplete);
  const mobileCardBodyRef = useRef<HTMLDivElement | null>(null);
  const mobileNavPeekTimeoutRef = useRef<number | null>(null);
  const mobileGestureRef = useRef<{
    bodyClientHeight: number;
    bodyScrollHeight: number;
    bodyScrollTop: number;
    startedInBody: boolean;
    startX: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    setCourseState(course);
    setLessons(course.lessons);
    setCurrentLessonId(
      getNextLessonId(
        course.lessons,
        getRequestedLessonId(course.lessons, requestedLessonSlug)
      )
    );
    setSyncError(null);
    setMessage(null);
    setSuccessOpen(isCourseCompleted(course.lessons));
    completionRef.current = isCourseCompleted(course.lessons);
  }, [course, requestedLessonSlug]);

  useEffect(() => {
    const requestedLessonId = getRequestedLessonId(lessons, requestedLessonSlug);

    if (!requestedLessonId) {
      return;
    }

    setCurrentLessonId((current) =>
      current === requestedLessonId ? current : requestedLessonId
    );
  }, [lessons, requestedLessonSlug]);

  useEffect(() => {
    let cancelled = false;

    async function syncCourseFromApi() {
      try {
        const response = await fetch(`/api/courses/${course.slug}`, {
          cache: 'no-store',
        });

        const payload = (await response.json().catch(() => null)) as
          | { error?: string; course?: CourseViewerData }
          | null;

        if (!response.ok || !payload?.course || cancelled) {
          if (!cancelled && response.status !== 401) {
            setSyncError(payload?.error || 'Не удалось обновить данные курса.');
          }
          return;
        }

        setCourseState(payload.course);
        setLessons(payload.course.lessons);
        setCurrentLessonId((current) =>
          getNextLessonId(payload.course?.lessons ?? [], current)
        );
        setSyncError(null);
      } catch {
        if (!cancelled) {
          setSyncError('Не удалось обновить данные курса.');
        }
      }
    }

    syncCourseFromApi();

    return () => {
      cancelled = true;
    };
  }, [course.slug]);

  useEffect(() => {
    const courseComplete = isCourseCompleted(lessons);

    if (courseComplete && !completionRef.current) {
      setSuccessOpen(true);
    }

    if (!courseComplete) {
      setSuccessOpen(false);
    }

    completionRef.current = courseComplete;
  }, [lessons]);

  useEffect(() => {
    setActiveMobileCardIndex(0);
    setMobileCardDetailsOpen(false);
    setMobileCardMotion(null);
    setMobileCardReadProgress(0);
    setMobileHeaderCollapsed(false);
  }, [currentLessonId]);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    const syncMobileLessonViewport = () => {
      const shouldLockLessonViewport =
        window.matchMedia('(max-width: 960px)').matches &&
        lessons.some((lesson) => lesson.id === currentLessonId);

      document.body.classList.toggle('mobile-lesson-screen', shouldLockLessonViewport);
      document.body.classList.toggle('mobile-lesson-nav-condensed', shouldLockLessonViewport);

      if (!shouldLockLessonViewport) {
        document.body.classList.remove('mobile-lesson-nav-peek');
      }
    };

    syncMobileLessonViewport();
    window.addEventListener('resize', syncMobileLessonViewport);

    return () => {
      window.removeEventListener('resize', syncMobileLessonViewport);
      document.body.classList.remove('mobile-lesson-screen');
      document.body.classList.remove('mobile-lesson-nav-condensed');
      document.body.classList.remove('mobile-lesson-nav-peek');
    };
  }, [currentLessonId, lessons]);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    const lessonOpenOnMobile =
      window.matchMedia('(max-width: 960px)').matches &&
      lessons.some((lesson) => lesson.id === currentLessonId);

    if (!lessonOpenOnMobile) {
      return;
    }

    const navElement = document.querySelector('.mobile-bottom-nav');

    if (!navElement) {
      return;
    }

    const revealNavLabels = () => {
      document.body.classList.add('mobile-lesson-nav-peek');

      if (mobileNavPeekTimeoutRef.current) {
        window.clearTimeout(mobileNavPeekTimeoutRef.current);
      }

      mobileNavPeekTimeoutRef.current = window.setTimeout(() => {
        document.body.classList.remove('mobile-lesson-nav-peek');
        mobileNavPeekTimeoutRef.current = null;
      }, 1400);
    };

    navElement.addEventListener('pointerdown', revealNavLabels);
    navElement.addEventListener('focusin', revealNavLabels);

    return () => {
      navElement.removeEventListener('pointerdown', revealNavLabels);
      navElement.removeEventListener('focusin', revealNavLabels);

      if (mobileNavPeekTimeoutRef.current) {
        window.clearTimeout(mobileNavPeekTimeoutRef.current);
        mobileNavPeekTimeoutRef.current = null;
      }

      document.body.classList.remove('mobile-lesson-nav-peek');
    };
  }, [currentLessonId, lessons]);

  useEffect(() => {
    const currentLesson = lessons.find((lesson) => lesson.id === currentLessonId);

    if (!pathname || !currentLesson || requestedLessonSlug === currentLesson.slug) {
      return;
    }

    const params = new URLSearchParams(
      typeof window === 'undefined' ? '' : window.location.search
    );
    params.set('lesson', currentLesson.slug);
    const nextQuery = params.toString();
    const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;

    router.replace(nextHref, { scroll: false });
  }, [currentLessonId, lessons, pathname, requestedLessonSlug, router]);

  useEffect(() => {
    if (!assistantOpen) {
      return;
    }

    chatBodyRef.current?.scrollTo({
      top: chatBodyRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [assistantOpen, chatMessages]);

  useEffect(() => {
    if (typeof document === 'undefined' || window.innerWidth <= 960) {
      return;
    }

    const targets = Array.from(document.querySelectorAll<HTMLElement>('.glow-target'));

    function handleMouseMove(event: MouseEvent) {
      for (const target of targets) {
        const rect = target.getBoundingClientRect();
        target.style.setProperty('--x', `${event.clientX - rect.left}px`);
        target.style.setProperty('--y', `${event.clientY - rect.top}px`);
      }
    }

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const currentLesson =
    lessons.find((lesson) => lesson.id === currentLessonId) ?? lessons[0] ?? null;
  const currentLessonIndex = currentLesson
    ? lessons.findIndex((lesson) => lesson.id === currentLesson.id)
    : -1;
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < lessons.length - 1
      ? lessons[currentLessonIndex + 1]
      : null;
  const completedCount = lessons.filter((lesson) => lesson.progress?.completed).length;
  const progressPercent =
    lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const previewCompletedCount = lessons.filter(
    (lesson) => lesson.isPreview && lesson.progress?.completed
  ).length;
  const courseFinished = isCourseCompleted(lessons);
  const currentHomeworkDraft = currentLesson
    ? parseHomeworkAnswer(currentLesson)
    : { text: '', selectedOptions: [] };
  const currentHomeworkType = currentLesson
    ? normalizeHomeworkType(currentLesson.homeworkType)
    : 'TEXT';
  const currentHomeworkOptions = currentLesson?.homeworkOptions ?? [];
  const currentLessonLocked = currentLesson?.isLocked ?? false;
  const assistantUiEnabled = false;
  const relatedCatalogRailEnabled = false;
  const courseCatalogHref = getCourseCatalogHref(courseState.slug);
  const showPreviewCourseBar = courseState.access.accessMode === 'PREVIEW' && !currentLesson;
  const courseShortTitle = courseState.title.split(' — ')[0]?.trim() || courseState.title;
  const currentContentBlocks = currentLesson?.content ? parseContentBlocks(currentLesson.content) : [];
  const summarySourceBlock =
    currentContentBlocks.find(
      (block) => block.type === 'paragraph' || block.type === 'quote'
    ) ?? null;
  const summarySourceIndex = summarySourceBlock
    ? currentContentBlocks.indexOf(summarySourceBlock)
    : -1;
  const exampleBlockIndex = currentContentBlocks.findIndex(
    (block) => block.type === 'list' || block.type === 'ordered-list'
  );
  const hintBlockIndex = currentContentBlocks.findIndex((block) => block.type === 'quote');
  const mobileSummaryText =
    currentLesson?.description?.trim() ||
    (summarySourceBlock && 'text' in summarySourceBlock ? summarySourceBlock.text : '') ||
    'Короткий конспект и практика по текущему уроку.';
  const mobileExampleBlock =
    exampleBlockIndex >= 0 ? currentContentBlocks[exampleBlockIndex] : null;
  const mobileHintText =
    hintBlockIndex >= 0 && currentContentBlocks[hintBlockIndex]?.type === 'quote'
      ? currentContentBlocks[hintBlockIndex].text
      : currentLessonLocked
        ? 'Урок откроется после подтверждения оплаты. Превью-уроки и прогресс сохраняются.'
        : currentLesson?.homeworkPrompt ||
          'Зафиксируйте ключевой вывод и сразу сохраните прогресс, чтобы вернуться к нему без потерь.';
  const mobileDetailBlocks = currentContentBlocks.filter((_, index) => {
    if (!currentLesson?.description && index === summarySourceIndex) {
      return false;
    }

    if (index === hintBlockIndex) {
      return false;
    }

    if (index === exampleBlockIndex) {
      return false;
    }

    return true;
  });
  const nextStepTitle = nextLesson
    ? `${nextLesson.position}. ${nextLesson.title}`
    : 'Курс идет к финалу';
  const nextStepCopy = nextLesson
    ? nextLesson.isLocked
      ? 'Следующий урок откроется после полного доступа.'
      : nextLesson.description ||
        'Переходите дальше, чтобы сохранить темп обучения.'
    : 'После этого шага можно вернуться в кабинет и пересмотреть пройденные материалы.';
  const lessonProgressLabel = currentLesson
    ? `Урок ${currentLesson.position} из ${lessons.length}`
    : `${lessons.length} уроков`;
  const checklistSourceBlock = currentContentBlocks.find(
    (block, index) =>
      index !== exampleBlockIndex &&
      (block.type === 'list' || block.type === 'ordered-list')
  );
  const introDetailBlocks = mobileDetailBlocks.slice(0, 2);
  const selectedChecklistCount = currentHomeworkDraft.selectedOptions.length;
  const checklistItems =
    currentHomeworkOptions.length > 0
      ? currentHomeworkOptions
      : checklistSourceBlock && 'items' in checklistSourceBlock
        ? checklistSourceBlock.items
        : [];
  const visualSupportBlocks =
    mobileExampleBlock || currentLesson?.videoUrl ? [] : mobileDetailBlocks.slice(0, 2);
  const mobileLessonCards =
    currentLesson && !currentLessonLocked
      ? [
          {
            id: 'intro',
            eyebrow: 'Карточка смысла',
            title: 'Что важно понять',
            summary: mobileSummaryText,
            detailBlocks: introDetailBlocks,
            teaserTitle: 'Пример из урока',
            teaserCopy: currentLesson.videoUrl
              ? 'Ниже карточка с материалом урока и рабочим примером.'
              : 'Ниже карточка с существующим фрагментом урока.',
          },
          {
            id: 'example',
            eyebrow: 'Карточка примера',
            title: currentLesson.videoUrl
              ? 'Материал урока'
              : 'Фрагмент из материалов урока',
            summary: currentLesson.videoUrl
              ? 'Смотрите пример и соотносите его с текущим уроком.'
              : 'Используем существующий материал урока как функциональный ориентир.',
            detailBlocks: [],
            teaserTitle: 'Чек-лист понимания',
            teaserCopy:
              checklistItems.length > 0
                ? 'Следом короткая карточка для проверки ключевых пунктов.'
                : 'Следом короткая карточка с опорными пунктами урока.',
          },
          {
            id: 'checklist',
            eyebrow: 'Карточка проверки',
            title: 'Проверьте ключевые пункты',
            summary:
              checklistItems.length > 0
                ? 'Отмечайте пункты по мере прохождения материала.'
                : 'Соберите опорные пункты урока перед практикой.',
            detailBlocks:
              checklistItems.length === 0 && checklistSourceBlock ? [checklistSourceBlock] : [],
            teaserTitle: currentLesson.homeworkTitle || 'Задание по уроку',
            teaserCopy:
              'Следующая карточка нужна, чтобы зафиксировать выводы и сохранить прогресс.',
          },
          {
            id: 'assignment',
            eyebrow: 'Карточка задания',
            title: currentLesson.homeworkTitle || 'Закрепление материала',
            summary:
              currentLesson.homeworkPrompt ||
              'Зафиксируйте рабочий вывод по уроку и сохраните прогресс.',
            detailBlocks: [],
            teaserTitle: nextLesson ? 'Финальная карточка урока' : 'Финал урока',
            teaserCopy: nextLesson
              ? 'Последняя карточка подведет итог и направит к следующему уроку.'
              : 'Последняя карточка подведет итог и вернет вас к курсу.',
          },
          {
            id: 'finish',
            eyebrow: 'Финальная карточка',
            title: nextLesson ? 'Следующий шаг в курсе' : 'Урок завершен',
            summary: nextStepCopy,
            detailBlocks: [],
            teaserTitle: nextLesson ? `Дальше: ${nextStepTitle}` : 'Курс продолжается',
            teaserCopy: nextLesson
              ? 'Следующий урок уже готов к открытию.'
              : 'Можно вернуться к курсу и пересмотреть материалы.',
          },
        ]
      : [];
  const activeMobileCard =
    mobileLessonCards[Math.min(activeMobileCardIndex, mobileLessonCards.length - 1)] ?? null;
  const mobileCardProgressPercent =
    mobileLessonCards.length > 0
      ? Math.round(((activeMobileCardIndex + 1) / mobileLessonCards.length) * 100)
      : 0;
  const mobileCardHasDetails = (activeMobileCard?.detailBlocks?.length ?? 0) > 0;
  const activeMobileCardIsFullyRead = mobileCardReadProgress >= 0.985;
  const mobileHeaderCompactLabel = currentLesson
    ? `Урок ${currentLesson.position}/${lessons.length}`
    : lessonProgressLabel;
  const mobileCardForwardLabel = !activeMobileCardIsFullyRead
    ? 'Дочитать'
    : activeMobileCardIndex < mobileLessonCards.length - 1
      ? 'Дальше'
      : nextLesson
        ? 'К уроку'
        : 'В ЛК';
  const mobileStatusItems = currentLesson
    ? [
        {
          icon: <CheckIcon />,
          key: 'completion',
          label: currentLesson.progress?.completed
            ? 'Урок завершен'
            : 'Урок в процессе',
          tone: currentLesson.progress?.completed ? 'complete' : 'active',
        },
        ...(currentLesson.isPreview
          ? [
              {
                icon: <PlayIcon />,
                key: 'preview',
                label: 'Превью',
                tone: 'preview',
              },
            ]
          : []),
        {
          icon: <ChecklistIcon />,
          key: 'homework',
          label: getHomeworkTypeLabel(currentHomeworkType),
          tone: 'homework',
        },
      ]
    : [];

  useEffect(() => {
    if (currentLessonLocked || mobileLessonCards.length === 0) {
      setMobileCardReadProgress(1);
      return;
    }

    const body = mobileCardBodyRef.current;

    if (!body) {
      return;
    }

    body.scrollTop = 0;
    setMobileCardReadProgress(0);

    const handleScroll = () => {
      syncMobileCardReadProgress();

      if (body.scrollTop > 18) {
        setMobileHeaderCollapsed(true);
      }
    };

    handleScroll();
    body.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      body.removeEventListener('scroll', handleScroll);
    };
  }, [activeMobileCardIndex, currentLessonLocked, mobileLessonCards.length]);

  useEffect(() => {
    if (!mobileCardMotion) {
      return;
    }

    const timeout = setTimeout(() => {
      setMobileCardMotion(null);
    }, 220);

    return () => clearTimeout(timeout);
  }, [mobileCardMotion]);

  useEffect(() => {
    if (typeof window === 'undefined' || currentLessonLocked || mobileLessonCards.length === 0) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      syncMobileCardReadProgress();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeMobileCardIndex, currentLessonLocked, mobileCardDetailsOpen, mobileLessonCards.length]);

  function updateLesson(
    lessonId: number,
    updater: (lesson: CourseViewerLesson) => CourseViewerLesson
  ) {
    setLessons((current) =>
      current.map((lesson) => (lesson.id === lessonId ? updater(lesson) : lesson))
    );
  }

  function patchCurrentLessonAnswer(nextAnswer: string | null) {
    if (!currentLesson || currentLessonLocked) {
      return;
    }

    updateLesson(currentLesson.id, (lesson) => ({
      ...lesson,
      progress: {
        completed: lesson.progress?.completed ?? false,
        answer: nextAnswer,
        lastViewedAt: lesson.progress?.lastViewedAt ?? null,
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  function openLesson(lessonId: number) {
    setCurrentLessonId(lessonId);
    setMessage(null);
    if (successOpen) {
      setSuccessOpen(false);
    }
  }

  function openNextLesson() {
    if (!nextLesson) {
      return;
    }

    openLesson(nextLesson.id);
  }

  function syncMobileCardReadProgress() {
    const body = mobileCardBodyRef.current;

    if (!body) {
      setMobileCardReadProgress(1);
      return true;
    }

    const readableDistance = Math.max(body.scrollHeight - body.clientHeight, 0);

    if (readableDistance <= 12) {
      setMobileCardReadProgress(1);
      return true;
    }

    const nextProgress = Math.min(1, body.scrollTop / readableDistance);
    setMobileCardReadProgress(nextProgress);

    return nextProgress >= 0.985;
  }

  function nudgeMobileCardBodyForward() {
    const body = mobileCardBodyRef.current;

    if (!body) {
      return false;
    }

    const remaining = body.scrollHeight - body.clientHeight - body.scrollTop;

    if (remaining <= 18) {
      setMobileCardReadProgress(1);
      return false;
    }

    body.scrollBy({
      top: Math.min(Math.max(body.clientHeight * 0.84, 160), remaining),
      behavior: 'smooth',
    });

    return true;
  }

  function openPreviousMobileCard() {
    setMobileCardDetailsOpen(false);
    setMobileCardMotion('backward');
    setActiveMobileCardIndex((current) => Math.max(current - 1, 0));
  }

  function openNextMobileCard() {
    setShowLessonTip(false);
    setMobileCardDetailsOpen(false);
    setMobileCardMotion('forward');
    setActiveMobileCardIndex((current) =>
      Math.min(current + 1, Math.max(mobileLessonCards.length - 1, 0))
    );
  }

  function toggleMobileCardDetails() {
    setShowLessonTip(false);
    setMobileCardDetailsOpen((current) => !current);
  }

  function handleMobileCardBackwardIntent(preferDetails: boolean) {
    setShowLessonTip(false);

    if (preferDetails && mobileCardHasDetails) {
      setMobileCardDetailsOpen((current) => !current);
      return;
    }

    if (activeMobileCardIndex > 0) {
      openPreviousMobileCard();
      return;
    }

    if (mobileCardHasDetails) {
      setMobileCardDetailsOpen((current) => !current);
    }
  }

  function handleMobileCardForwardIntent() {
    setShowLessonTip(false);

    if (!syncMobileCardReadProgress() && nudgeMobileCardBodyForward()) {
      return;
    }

    if (activeMobileCardIndex < mobileLessonCards.length - 1) {
      openNextMobileCard();
      return;
    }

    if (nextLesson) {
      openNextLesson();
    }
  }

  function handleMobileCardTouchStart(event: ReactTouchEvent<HTMLElement>) {
    if (mobileLessonCards.length === 0 || currentLessonLocked) {
      mobileGestureRef.current = null;
      return;
    }

    if (!(event.target instanceof Element)) {
      mobileGestureRef.current = null;
      return;
    }

    if (event.target.closest('button, a, input, textarea, label, summary')) {
      mobileGestureRef.current = null;
      return;
    }

    const touch = event.touches[0];
    const bodyElement = event.target.closest('.lesson-mobile-card__body') as HTMLDivElement | null;

    mobileGestureRef.current = {
      bodyClientHeight: bodyElement?.clientHeight ?? 0,
      bodyScrollHeight: bodyElement?.scrollHeight ?? 0,
      bodyScrollTop: bodyElement?.scrollTop ?? 0,
      startedInBody: Boolean(bodyElement),
      startX: touch.clientX,
      startY: touch.clientY,
    };
  }

  function handleMobileCardTouchEnd(event: ReactTouchEvent<HTMLElement>) {
    const gesture = mobileGestureRef.current;
    mobileGestureRef.current = null;

    if (!gesture || mobileLessonCards.length === 0 || currentLessonLocked) {
      return;
    }

    if (event.target instanceof Element) {
      if (event.target.closest('button, a, input, textarea, label, summary')) {
        return;
      }
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const threshold = 44;

    if (absX < threshold && absY < threshold) {
      return;
    }

    const verticalGesture = absY > absX;

    if (verticalGesture) {
      if (gesture.startedInBody) {
        const canScrollDown =
          gesture.bodyScrollTop + gesture.bodyClientHeight < gesture.bodyScrollHeight - 16;
        const canScrollUp = gesture.bodyScrollTop > 16;

        if (deltaY < -threshold && canScrollDown) {
          return;
        }

        if (deltaY > threshold && canScrollUp) {
          return;
        }
      }

      if (deltaY < -threshold) {
        handleMobileCardForwardIntent();
      } else if (deltaY > threshold) {
        handleMobileCardBackwardIntent(true);
      }

      return;
    }

    if (deltaX > threshold) {
      handleMobileCardForwardIntent();
      return;
    }

    if (deltaX < -threshold) {
      handleMobileCardBackwardIntent(false);
    }
  }

  function handleHomeworkTextChange(text: string) {
    if (!currentLesson || currentLessonLocked) {
      return;
    }

    patchCurrentLessonAnswer(
      serializeHomeworkAnswer(currentLesson, {
        ...currentHomeworkDraft,
        text,
      })
    );
  }

  function handleHomeworkOptionToggle(option: string) {
    if (!currentLesson || currentLessonLocked) {
      return;
    }

    const selectedOptions = currentHomeworkDraft.selectedOptions.includes(option)
      ? currentHomeworkDraft.selectedOptions.filter((item) => item !== option)
      : [...currentHomeworkDraft.selectedOptions, option];

    patchCurrentLessonAnswer(
      serializeHomeworkAnswer(currentLesson, {
        ...currentHomeworkDraft,
        selectedOptions,
      })
    );
  }

  function handleCompletedToggle(completed: boolean) {
    if (!currentLesson || currentLessonLocked) {
      return;
    }

    updateLesson(currentLesson.id, (lesson) => ({
      ...lesson,
      progress: {
        completed,
        answer: lesson.progress?.answer ?? null,
        lastViewedAt: lesson.progress?.lastViewedAt ?? null,
        updatedAt: lesson.progress?.updatedAt ?? new Date().toISOString(),
      },
    }));
  }

  async function persistProgress() {
    if (!currentLesson || currentLessonLocked) {
      return;
    }

    setPendingLessonId(currentLesson.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/lessons/${currentLesson.id}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completed: currentLesson.progress?.completed ?? false,
          answer: currentLesson.progress?.answer ?? '',
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            progress?: {
              completed: boolean;
              answer: string | null;
              lastViewedAt: string | null;
              updatedAt: string;
            };
          }
        | null;

      if (!response.ok || !payload?.progress) {
        throw new Error(payload?.error || 'Не удалось сохранить прогресс.');
      }

      updateLesson(currentLesson.id, (lesson) => ({
        ...lesson,
        progress: payload.progress ?? null,
      }));

      setMessage({
        tone: 'success',
        text: `Прогресс по уроку «${currentLesson.title}» сохранен.`,
      });
      setSyncError(null);
    } catch (progressError) {
      setMessage({
        tone: 'error',
        text:
          progressError instanceof Error
            ? progressError.message
            : 'Не удалось сохранить прогресс.',
      });
    } finally {
      setPendingLessonId(null);
    }
  }

  async function handleCreateOrder() {
    if (!courseState.access.tariff) {
      return;
    }

    setMessage(null);
    setPurchasePending(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tariffId: courseState.access.tariff.id,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; checkoutUrl?: string }
        | null;

      if (payload?.checkoutUrl) {
        router.push(payload.checkoutUrl);
        router.refresh();
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.error || 'Не удалось создать заказ.');
      }
    } catch (orderError) {
      setMessage({
        tone: 'error',
        text:
          orderError instanceof Error
            ? orderError.message
            : 'Не удалось создать заказ.',
      });
    } finally {
      setPurchasePending(false);
    }
  }

  function handleSendChat() {
    const trimmed = chatDraft.trim();

    if (!trimmed) {
      return;
    }

    const messageId = Date.now();

    setChatMessages((current) => [
      ...current,
      {
        id: messageId,
        role: 'user',
        text: trimmed,
      },
    ]);
    setChatDraft('');

    window.setTimeout(() => {
      setChatMessages((current) => [
        ...current,
        {
          id: messageId + 1,
          role: 'ai',
          text: 'Раздел вопросов пока работает в ознакомительном режиме. Зафиксируйте ключевой вопрос или мысль и вернитесь к материалу урока.',
        },
      ]);
    }, 550);
  }

  function renderActiveMobileCardBody() {
    if (!currentLesson || currentLessonLocked || !activeMobileCard) {
      return null;
    }

    if (activeMobileCard.id === 'intro') {
      return (
        <>
          <div className="lesson-mobile-card__copy">
            <span className="lesson-mobile-card__eyebrow">{activeMobileCard.eyebrow}</span>
            <h2 className="lesson-mobile-card__title">{currentLesson.title}</h2>
            <p className="lesson-mobile-card__summary">{activeMobileCard.summary}</p>
          </div>

          <div className="lesson-mobile-card__hint-panel">
            <span className="eyebrow">Важная подсказка</span>
            <p>{mobileHintText}</p>
          </div>

          {mobileCardDetailsOpen && activeMobileCard.detailBlocks.length > 0 ? (
            <div className="lesson-mobile-card__detail-panel">
              <LessonContentBlocks blocks={activeMobileCard.detailBlocks} />
            </div>
          ) : null}
        </>
      );
    }

    if (activeMobileCard.id === 'example') {
      return (
        <>
          <div className="lesson-mobile-card__copy">
            <span className="lesson-mobile-card__eyebrow">{activeMobileCard.eyebrow}</span>
            <h2 className="lesson-mobile-card__title">{activeMobileCard.title}</h2>
            <p className="lesson-mobile-card__summary">{activeMobileCard.summary}</p>
          </div>

          <div className="lesson-mobile-card__visual-shell">
            {currentLesson.videoUrl ? (
              <VideoBlock lesson={currentLesson} />
            ) : mobileExampleBlock ? (
              <div className="lesson-rich-content lesson-rich-content--embedded">
                <LessonContentBlocks blocks={[mobileExampleBlock]} />
              </div>
            ) : visualSupportBlocks.length > 0 ? (
              <div className="lesson-rich-content lesson-rich-content--embedded">
                <LessonContentBlocks blocks={visualSupportBlocks} />
              </div>
            ) : (
              <div className="video-placeholder lesson-video lesson-video--fallback">
                <div className="video-placeholder__icon">
                  <PlayIcon />
                </div>
                <div className="lesson-video__meta">
                  <strong>Рабочий фрагмент урока</strong>
                  <p>Опирайтесь на текущий материал урока и переходите к чек-листу ниже.</p>
                </div>
              </div>
            )}
          </div>
        </>
      );
    }

    if (activeMobileCard.id === 'checklist') {
      return (
        <>
          <div className="lesson-mobile-card__copy">
            <span className="lesson-mobile-card__eyebrow">{activeMobileCard.eyebrow}</span>
            <h2 className="lesson-mobile-card__title">{activeMobileCard.title}</h2>
            <p className="lesson-mobile-card__summary">{activeMobileCard.summary}</p>
          </div>

          <div className="lesson-mobile-card__checklist-summary">
            <strong>
              {currentHomeworkOptions.length > 0
                ? `${selectedChecklistCount}/${checklistItems.length} пунктов отмечено`
                : 'Опорные пункты урока'}
            </strong>
            <span>{currentHomeworkType === 'CHECKLIST' ? 'Практика по уроку' : 'Подготовка к заданию'}</span>
          </div>

          {currentHomeworkOptions.length > 0 ? (
            <div className="lesson-mobile-checklist">
              {checklistItems.map((item) => {
                const checked = currentHomeworkDraft.selectedOptions.includes(item);

                return (
                  <label
                    key={item}
                    className={`lesson-mobile-checklist__item ${
                      checked ? 'lesson-mobile-checklist__item--checked' : ''
                    }`}
                  >
                    <input
                      checked={checked}
                      onChange={() => handleHomeworkOptionToggle(item)}
                      type="checkbox"
                    />
                    <span className="checkmark">
                      <CheckIcon />
                    </span>
                    <span>{item}</span>
                  </label>
                );
              })}
            </div>
          ) : checklistItems.length > 0 ? (
            <div className="lesson-mobile-checklist">
              {checklistItems.map((item) => (
                <div key={item} className="lesson-mobile-checklist__item lesson-mobile-checklist__item--static">
                  <span className="checkmark">
                    <CheckIcon />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : activeMobileCard.detailBlocks.length > 0 ? (
            <div className="lesson-mobile-card__detail-panel">
              <LessonContentBlocks blocks={activeMobileCard.detailBlocks} />
            </div>
          ) : (
            <div className="lesson-mobile-card__hint-panel">
              <span className="eyebrow">Практика</span>
              <p>Следующая карточка откроет задание и сохранение прогресса по уроку.</p>
            </div>
          )}
        </>
      );
    }

    if (activeMobileCard.id === 'assignment') {
      return (
        <>
          <div className="lesson-mobile-card__copy">
            <span className="lesson-mobile-card__eyebrow">{activeMobileCard.eyebrow}</span>
            <h2 className="lesson-mobile-card__title">{activeMobileCard.title}</h2>
            <p className="lesson-mobile-card__summary">{activeMobileCard.summary}</p>
          </div>

          <LessonHomeworkPanel
            className="homework-box--mobile-card"
            compact
            homeworkDraft={currentHomeworkDraft}
            homeworkOptions={currentHomeworkOptions}
            homeworkType={currentHomeworkType}
            lesson={currentLesson}
            nextLesson={nextLesson}
            pendingLessonId={pendingLessonId}
            secondaryActionLabel="Дальше"
            showChecklistOptions={false}
            onCompletedToggle={handleCompletedToggle}
            onHomeworkOptionToggle={handleHomeworkOptionToggle}
            onHomeworkTextChange={handleHomeworkTextChange}
            onOpenNextLesson={handleMobileCardForwardIntent}
            onPersistProgress={persistProgress}
          />
        </>
      );
    }

    return (
      <>
        <div className="lesson-mobile-card__copy">
          <span className="lesson-mobile-card__eyebrow">{activeMobileCard.eyebrow}</span>
          <h2 className="lesson-mobile-card__title">{activeMobileCard.title}</h2>
          <p className="lesson-mobile-card__summary">{activeMobileCard.summary}</p>
        </div>

        <div className="lesson-mobile-card__finish-panel">
          <div>
            <span className="eyebrow">Следом в курсе</span>
            <strong>{nextStepTitle}</strong>
          </div>
          <p>{nextStepCopy}</p>
        </div>
      </>
    );
  }

  return (
    <main
      className={`page-shell course-player-page ${
        currentLesson ? 'course-player-page--lesson-active' : ''
      }`.trim()}
    >
      <div className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>Бизнес школа ДНК</span>
        </Link>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link className="ghost-button" href="/catalog">
            В каталог
          </Link>
          <Link className="secondary-button" href="/lk">
            Вернуться в кабинет
          </Link>
        </div>
      </div>

      <section className={`stack-grid ${currentLesson ? 'stack-grid--lesson-active' : ''}`.trim()}>
        <div className="section-header">
          <span className="title-main">Обучение</span>
          <span className="title-divider">/</span>
          <span className="title-course">Онлайн-курс</span>
        </div>

        <div className="course-stage__head">
          <div>
            <p className="course-stage__eyebrow">{courseState.title}</p>
            <p className="course-stage__copy">
              {courseState.description ||
                'Онлайн-курс с уроками, домашкой и сохранением прогресса внутри личного кабинета.'}
            </p>
          </div>
          <div className="badge-row" style={{ marginTop: 0 }}>
            <span
              className={
                courseState.access.productType === 'FREE'
                  ? 'badge badge-complete'
                  : 'badge badge-paid'
              }
            >
              {courseState.access.productType === 'FREE'
                ? 'Бесплатный курс'
                : 'Платный курс'}
            </span>
            {courseState.access.accessMode === 'PREVIEW' ? (
              <span className="badge badge-pending">
                {formatPreviewLessons(courseState.access.previewLessonsCount)}
              </span>
            ) : null}
            <span className="badge badge-complete">{progressPercent}% прогресса</span>
          </div>
        </div>

        {currentLesson ? (
          <section
            className={`course-player-mobile-header ${
              mobileHeaderCollapsed ? 'course-player-mobile-header--compact' : ''
            }`.trim()}
          >
            <div className="course-player-mobile-header__top">
              {mobileHeaderCollapsed ? (
                <button
                  className="course-player-mobile-header__compact-toggle"
                  onClick={() => setMobileHeaderCollapsed(false)}
                  type="button"
                >
                  <strong>{courseShortTitle}</strong>
                  <span className="course-player-mobile-header__compact-meta">
                    {mobileHeaderCompactLabel}
                  </span>
                </button>
              ) : (
                <div className="course-player-mobile-header__context">
                  <span className="eyebrow">{lessonProgressLabel}</span>
                  <strong>{courseShortTitle}</strong>
                </div>
              )}
              <div className="course-player-mobile-header__actions">
                <button
                  aria-label="Избранное появится позже"
                  className="course-player-mobile-header__icon-button"
                  disabled
                  type="button"
                >
                  <HeartIcon />
                </button>
                <Link
                  aria-label="Открыть профиль"
                  className="course-player-mobile-header__avatar"
                  href="/profile"
                >
                  <UserAvatarIcon />
                </Link>
              </div>
            </div>

            <div className="course-player-mobile-header__track" aria-label="Лента уроков">
              {lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  aria-current={lesson.id === currentLessonId ? 'step' : undefined}
                  className={`course-player-mobile-header__step ${
                    lesson.id === currentLessonId
                      ? 'course-player-mobile-header__step--active'
                      : ''
                  } ${
                    lesson.progress?.completed
                      ? 'course-player-mobile-header__step--completed'
                      : ''
                  } ${
                    lesson.isLocked ? 'course-player-mobile-header__step--locked' : ''
                  }`}
                  onClick={() => openLesson(lesson.id)}
                  type="button"
                >
                  <span>{lesson.position}</span>
                </button>
              ))}
            </div>

            <details className="course-player-mobile-header__meta">
              <summary className="course-player-mobile-header__meta-summary">
                <span>{progressPercent}% прогресса</span>
                <span>{lessonProgressLabel}</span>
              </summary>
              <div className="course-player-mobile-header__meta-body">
                <p>
                  {nextLesson
                    ? `Следом: ${nextLesson.position}. ${nextLesson.title}.`
                    : 'Это финальный шаг курса.'}
                </p>
                {courseState.access.accessMode === 'PREVIEW' ? (
                  <span className="badge badge-pending">
                    {previewCompletedCount}/{courseState.access.previewLessonsCount} урока открыто в превью
                  </span>
                ) : null}
                <div className="course-player-mobile-header__meta-links">
                  <Link className="ghost-button" href={courseCatalogHref}>
                    К курсу
                  </Link>
                  <Link className="ghost-button" href="/lk">
                    В ЛК
                  </Link>
                </div>
              </div>
            </details>

            {showLessonTip && currentLesson.position === 1 && !currentLessonLocked ? (
              <div className="course-player-mobile-tip" role="note">
                <p>Свайп вверх или вправо — следующая карточка. Вниз или влево — назад или подробнее.</p>
                <button onClick={() => setShowLessonTip(false)} type="button">
                  Понятно
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {currentLesson ? (
          <div className="course-player-mobile-toolbar">
            <div className="course-player-mobile-toolbar__summary">
              <span className="eyebrow">Сейчас в курсе</span>
              <strong>
                Урок {currentLesson.position}. {currentLesson.title}
              </strong>
              <p>
                Прогресс по курсу: {progressPercent}%.{' '}
                {nextLesson ? `Дальше: урок ${nextLesson.position}.` : 'Это последний урок курса.'}
              </p>
            </div>
            <div className="course-player-mobile-toolbar__actions">
              <Link className="secondary-button" href="/lk">
                К кабинету
              </Link>
              <Link className="ghost-button" href={courseCatalogHref}>
                О курсе
              </Link>
              {nextLesson ? (
                <button className="primary-button" onClick={openNextLesson} type="button">
                  Следующий урок
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <details className="course-mobile-outline" open>
          <summary className="course-mobile-outline__summary">
            <div>
              <span className="eyebrow">Навигация по курсу</span>
              <strong>Программа и прогресс</strong>
            </div>
            <span className="course-mobile-outline__progress">{progressPercent}%</span>
          </summary>
          <div className="course-mobile-outline__body">
            <div className="progress-box">
              <div className="progress-info">
                <span>Текущий урок</span>
                <span>
                  {currentLesson ? `${currentLesson.position}/${lessons.length}` : `${lessons.length} уроков`}
                </span>
              </div>
              <div className="progress-line">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            {courseState.access.accessMode === 'PREVIEW' ? (
              <div className="course-preview-summary">
                <span className="eyebrow">Ознакомительный доступ</span>
                <span className="badge badge-pending">
                  {previewCompletedCount}/{courseState.access.previewLessonsCount} урока открыто
                </span>
                <p className="muted-text">
                  Полный доступ открывается после подтверждения оплаты, а прогресс по первым урокам уже сохранен.
                </p>
              </div>
            ) : null}

            <div className="course-player-mobile-toolbar__actions">
              <Link className="secondary-button" href="/lk">
                К кабинету
              </Link>
              <Link className="ghost-button" href={courseCatalogHref}>
                Страница курса
              </Link>
              {nextLesson ? (
                <button className="primary-button" onClick={openNextLesson} type="button">
                  Следующий урок
                </button>
              ) : null}
            </div>

            <div className="lessons-list">
              {lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  className={`lesson-btn ${
                    lesson.id === currentLessonId ? 'active' : ''
                  } ${lesson.progress?.completed ? 'completed' : ''} ${
                    lesson.isLocked ? 'lesson-btn--locked' : ''
                  }`}
                  onClick={() => openLesson(lesson.id)}
                  type="button"
                >
                  <span className="lesson-btn__body">
                    <span className="lesson-btn__title">
                      {lesson.position}. {lesson.title}
                    </span>
                    <span className="lesson-btn__meta">
                      {lesson.isLocked
                        ? 'Откроется после подтверждения оплаты'
                        : lesson.isPreview && courseState.access.accessMode === 'PREVIEW'
                          ? 'Открыто до покупки'
                          : lesson.description ||
                            'Откройте урок, чтобы посмотреть содержание и практику.'}
                    </span>
                  </span>
                  <span className="check-icon">
                    {lesson.isLocked ? <LockIcon /> : <CheckIcon />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </details>

        <div className={`lms-wrapper ${currentLesson ? 'lms-wrapper--lesson-active' : ''}`.trim()}>
          <article
            className={`glass-panel lms-main glow-target ${
              currentLesson ? 'lms-main--lesson-active' : ''
            }`.trim()}
          >
            {courseFinished && !successOpen ? (
              <button
                className="success-mini-badge"
                onClick={() => setSuccessOpen(true)}
                type="button"
              >
                <CheckIcon />
                <span>Пройдено</span>
              </button>
            ) : null}

            {successOpen ? (
              <div className="success-screen">
                <div className="success-icon">
                  <CheckIcon />
                </div>
                <div className="success-title">Курс пройден</div>
                <p className="lms-desc">
                  Все уроки отмечены завершенными. Можно вернуться в кабинет или остаться
                  внутри курса и пересмотреть материалы.
                </p>
                <div className="row-actions" style={{ justifyContent: 'center' }}>
                  <Link href="/lk" className="success-btn">
                    Перейти в кабинет
                  </Link>
                  <button
                    className="secondary-button"
                    onClick={() => setSuccessOpen(false)}
                    type="button"
                  >
                    Остаться в курсе
                  </button>
                </div>
              </div>
            ) : null}

            <div
              className={`lms-scroll-area ${
                currentLesson ? 'lms-scroll-area--lesson-active' : ''
              }`.trim()}
              style={{ display: successOpen ? 'none' : undefined }}
            >
              {currentLesson ? (
                <>
                  <div
                    className={`course-player-lesson-mobile ${
                      currentLesson ? 'course-player-lesson-mobile--active' : ''
                    }`.trim()}
                  >
                    {currentLessonLocked ? (
                      <article className="lesson-mobile-card lesson-mobile-card--locked">
                        <div className="lesson-mobile-card__status">
                          <span className="badge badge-paid">Закрыто до оплаты</span>
                          {currentLesson.isPreview ? (
                            <span className="badge badge-pending">Превью</span>
                          ) : null}
                        </div>

                        <div className="lesson-mobile-card__body lesson-mobile-card__body--locked">
                          <div className="lesson-mobile-card__hero">
                            <span className="lesson-mobile-card__eyebrow">
                              Урок {currentLesson.position} из {lessons.length}
                            </span>
                            <h2 className="lesson-mobile-card__title">{currentLesson.title}</h2>
                            <p className="lesson-mobile-card__summary">{mobileHintText}</p>
                          </div>

                          <div className="lesson-mobile-card__section lesson-mobile-card__section--paywall">
                            <PaywallBlock
                              course={courseState}
                              lesson={currentLesson}
                              onCreateOrder={handleCreateOrder}
                              purchasePending={purchasePending}
                            />
                          </div>
                        </div>
                      </article>
                    ) : activeMobileCard ? (
                      <>
                        <article
                          key={`${currentLesson.id}-${activeMobileCard.id}`}
                          className={`lesson-mobile-card lesson-mobile-card--feed ${
                            mobileCardMotion === 'forward'
                              ? 'lesson-mobile-card--motion-forward'
                              : mobileCardMotion === 'backward'
                                ? 'lesson-mobile-card--motion-backward'
                                : ''
                          }`.trim()}
                          onTouchCancel={() => {
                            mobileGestureRef.current = null;
                          }}
                          onTouchEnd={handleMobileCardTouchEnd}
                          onTouchStart={handleMobileCardTouchStart}
                        >
                          <div className="lesson-mobile-card__status">
                            {mobileStatusItems.map((item) => (
                              <button
                                key={item.key}
                                aria-label={item.label}
                                className={`lesson-mobile-status-chip lesson-mobile-status-chip--${item.tone}`}
                                data-label={item.label}
                                type="button"
                              >
                                <span
                                  aria-hidden="true"
                                  className="lesson-mobile-status-chip__icon"
                                >
                                  {item.icon}
                                </span>
                                <span className="sr-only">{item.label}</span>
                              </button>
                            ))}
                          </div>

                          <div className="lesson-mobile-card__body" ref={mobileCardBodyRef}>
                            {renderActiveMobileCardBody()}
                          </div>

                          <div className="lesson-mobile-card__nav">
                            {mobileCardHasDetails ? (
                              <button
                                className="ghost-button"
                                onClick={toggleMobileCardDetails}
                                type="button"
                              >
                                {mobileCardDetailsOpen ? 'Свернуть' : 'Подробнее'}
                              </button>
                            ) : activeMobileCardIndex > 0 ? (
                              <button
                                className="ghost-button"
                                onClick={() => handleMobileCardBackwardIntent(false)}
                                type="button"
                              >
                                Назад
                              </button>
                            ) : (
                              <span className="lesson-mobile-card__nav-spacer" />
                            )}

                            {activeMobileCardIndex < mobileLessonCards.length - 1 ? (
                              <button
                                className="primary-button"
                                onClick={handleMobileCardForwardIntent}
                                type="button"
                              >
                                {mobileCardForwardLabel}
                              </button>
                            ) : nextLesson ? (
                              <button
                                className="primary-button"
                                onClick={handleMobileCardForwardIntent}
                                type="button"
                              >
                                {mobileCardForwardLabel}
                              </button>
                            ) : (
                              <Link className="primary-button" href="/lk">
                                В кабинет
                              </Link>
                            )}
                          </div>
                        </article>

                        <div
                          aria-label={`Карточка ${activeMobileCardIndex + 1} из ${mobileLessonCards.length}`}
                          className="lesson-mobile-progress-rail"
                        >
                          <span className="sr-only">
                            Карточка {activeMobileCardIndex + 1} из {mobileLessonCards.length}
                          </span>
                          <div className="lesson-mobile-progress-rail__track" aria-hidden="true">
                            <span
                              className="lesson-mobile-progress-rail__fill"
                              style={{ width: `${mobileCardProgressPercent}%` }}
                            />
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div className="course-player-lesson-desktop">
                  <div className="lms-tag">
                    Урок <span>{currentLesson.position}</span>
                  </div>
                  <h2 className="lms-title">{currentLesson.title}</h2>
                  {currentLesson.description ? (
                    <p className="lms-desc">{currentLesson.description}</p>
                  ) : null}

                  <div className="badge-row">
                    {currentLesson.isPreview ? (
                      <span className="badge badge-pending">Ознакомительный урок</span>
                    ) : null}
                    {currentLessonLocked ? (
                      <span className="badge badge-paid">Закрыт до оплаты</span>
                    ) : null}
                  </div>

                  {currentLessonLocked ? (
                    <PaywallBlock
                      course={courseState}
                      lesson={currentLesson}
                      onCreateOrder={handleCreateOrder}
                      purchasePending={purchasePending}
                    />
                  ) : (
                    <>
                      <VideoBlock lesson={currentLesson} />
                      {currentLesson.content ? (
                        <LessonContent content={currentLesson.content} />
                      ) : null}

                      <div className="homework-box">
                        <div className="hw-header">
                          <div className="hw-header__copy">
                            <span className="hw-label">Домашняя практика</span>
                            <h3 className="hw-title">
                              {currentLesson.homeworkTitle || 'Закрепление материала'}
                            </h3>
                          </div>
                          <span className="muted-text">
                            Последнее сохранение:{' '}
                            {formatDateTime(
                              currentLesson.progress?.updatedAt ??
                                currentLesson.progress?.lastViewedAt ??
                                null
                            )}
                          </span>
                        </div>

                        <div className="badge-row">
                          <span className="badge badge-complete">
                            {getHomeworkTypeLabel(currentHomeworkType)}
                          </span>
                          {currentHomeworkOptions.length > 0 ? (
                            <span className="badge badge-pending">
                              {currentHomeworkOptions.length} пунктов практики
                            </span>
                          ) : null}
                        </div>

                        <div className="hw-task">
                          {currentLesson.homeworkPrompt ||
                            'Зафиксируйте ключевую мысль урока и сохраните рабочий вывод в прогрессе.'}
                        </div>

                        {currentHomeworkOptions.length > 0 ? (
                          <div className="hw-options-grid hw-options-grid--checklist">
                            {currentHomeworkOptions.map((option) => {
                              const checked =
                                currentHomeworkDraft.selectedOptions.includes(option);

                              return (
                                <label
                                  key={option}
                                  className={`hw-checkbox ${
                                    checked ? 'hw-checkbox--checked' : ''
                                  }`}
                                >
                                  <input
                                    checked={checked}
                                    onChange={() => handleHomeworkOptionToggle(option)}
                                    type="checkbox"
                                  />
                                  <span className="checkmark">
                                    <CheckIcon />
                                  </span>
                                  <span className="hw-checkbox__copy">{option}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : null}

                        <label className="field" style={{ gap: '0.55rem' }}>
                          <span className="hw-textarea-label">Ответ по уроку</span>
                          <textarea
                            className="hw-input"
                            onChange={(event) =>
                              handleHomeworkTextChange(event.target.value)
                            }
                            placeholder={getHomeworkPlaceholder(currentHomeworkType)}
                            rows={6}
                            value={currentHomeworkDraft.text}
                          />
                        </label>

                        <div className="hw-options-grid hw-options-grid--single">
                          <label className="hw-checkbox">
                            <input
                              checked={currentLesson.progress?.completed ?? false}
                              disabled={pendingLessonId === currentLesson.id}
                              onChange={(event) =>
                                handleCompletedToggle(event.target.checked)
                              }
                              type="checkbox"
                            />
                            <span className="checkmark">
                              <CheckIcon />
                            </span>
                            <span>Отметить урок завершенным</span>
                          </label>
                        </div>

                        <div className="row-actions" style={{ marginTop: '1rem' }}>
                          <button
                            className="primary-button"
                            disabled={pendingLessonId === currentLesson.id}
                            onClick={persistProgress}
                            type="button"
                          >
                            {pendingLessonId === currentLesson.id
                              ? 'Сохраняем...'
                              : 'Сохранить прогресс'}
                          </button>
                          {nextLesson ? (
                            <button
                              className="secondary-button"
                              onClick={openNextLesson}
                              type="button"
                            >
                              Следующий урок
                            </button>
                          ) : (
                            <Link className="secondary-button" href="/lk">
                              Вернуться в кабинет
                            </Link>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  </div>

                  {message ? (
                    <p
                      className={`feedback ${
                        message.tone === 'success'
                          ? 'feedback-success'
                          : 'feedback-error'
                      }`}
                    >
                      {message.text}
                    </p>
                  ) : null}

                  {syncError ? <p className="feedback feedback-error">{syncError}</p> : null}
                </>
              ) : (
                <div className="course-player__empty">
                  <div className="lms-tag">Курс</div>
                  <h2 className="lms-title">Материалы курса пока не опубликованы.</h2>
                  <p className="lms-desc">
                    Как только уроки будут добавлены, они появятся в списке справа.
                  </p>
                </div>
              )}
            </div>
          </article>

          <aside className="glass-panel lms-sidebar glow-target">
            <div className="progress-box">
              <div className="progress-info">
                <span>Прогресс</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="progress-line">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            {courseState.access.accessMode === 'PREVIEW' ? (
              <div className="course-preview-summary">
                <span className="eyebrow">Ознакомительный доступ</span>
                <span className="badge badge-pending">
                  {previewCompletedCount}/{courseState.access.previewLessonsCount} урока открыто
                </span>
                  <p className="muted-text">
                    Сначала можно пройти первые уроки и оценить формат курса. После подтверждения
                    оплаты откроются остальные модули, практика и полный доступ в кабинете.
                    Проверка может занять немного времени.
                  </p>
                {courseState.access.tariff ? (
                  <div className="badge-row">
                    <span className="badge badge-paid">
                      {formatMoney(courseState.access.tariff.price)}
                    </span>
                    <span className="badge badge-pending">
                      Полный доступ после подтверждения оплаты
                    </span>
                  </div>
                ) : null}
                <div className="row-actions" style={{ marginTop: '0.9rem' }}>
                  {courseState.access.pendingOrder ? (
                    <Link
                      href={courseState.access.pendingOrder.checkoutUrl}
                      className="primary-button"
                    >
                      {getActiveOrderActionLabel(courseState.access.pendingOrder.status)}
                    </Link>
                  ) : (
                    <button
                      className="primary-button"
                      disabled={purchasePending}
                      onClick={handleCreateOrder}
                      type="button"
                    >
                      {purchasePending ? 'Открываем оплату...' : 'Получить доступ'}
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            <div className="lessons-list">
              {lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  className={`lesson-btn ${
                    lesson.id === currentLessonId ? 'active' : ''
                  } ${lesson.progress?.completed ? 'completed' : ''} ${
                    lesson.isLocked ? 'lesson-btn--locked' : ''
                  }`}
                  onClick={() => openLesson(lesson.id)}
                  type="button"
                >
                  <span className="lesson-btn__body">
                    <span className="lesson-btn__title">
                      {lesson.position}. {lesson.title}
                    </span>
                    <span className="lesson-btn__meta">
                      {lesson.isLocked
                        ? 'Откроется после подтверждения оплаты'
                        : lesson.isPreview && courseState.access.accessMode === 'PREVIEW'
                        ? 'Открыто до покупки'
                        : lesson.description ||
                          'Откройте урок, чтобы посмотреть содержание и практику.'}
                    </span>
                  </span>
                  <span className="check-icon">
                    {lesson.isLocked ? <LockIcon /> : <CheckIcon />}
                  </span>
                </button>
              ))}
            </div>

            {assistantUiEnabled ? (
              <button className="ai-btn" onClick={() => setAssistantOpen(true)} type="button">
              <ChatIcon />
              <span>Задать вопрос</span>
              </button>
            ) : null}
          </aside>
        </div>

        {showPreviewCourseBar ? (
          <div className="course-mobile-bar">
            <div className="course-mobile-bar__copy">
              <span>
                {courseState.access.pendingOrder
                  ? courseState.access.pendingOrder.status === 'PROCESSING'
                    ? 'Платеж на проверке'
                    : 'Открыта оплата'
                  : 'Открыт ознакомительный доступ'}
              </span>
              <strong>
                {courseState.access.pendingOrder
                  ? getActiveOrderActionLabel(courseState.access.pendingOrder.status)
                  : courseState.access.tariff
                  ? formatMoney(courseState.access.tariff.price)
                  : 'Полный доступ'}
              </strong>
            </div>
            {courseState.access.pendingOrder ? (
              <Link
                href={courseState.access.pendingOrder.checkoutUrl}
                className="primary-button"
              >
                {getActiveOrderActionLabel(courseState.access.pendingOrder.status)}
              </Link>
            ) : (
              <button
                className="primary-button"
                disabled={purchasePending}
                onClick={handleCreateOrder}
                type="button"
              >
                {purchasePending ? 'Открываем оплату...' : 'Получить доступ'}
              </button>
            )}
          </div>
        ) : null}

        {relatedCatalogRailEnabled ? (
          <div className="gallery-wrapper">
          <div className="gallery-track">
            {dnkFeaturedPrograms.map((program, index) => (
              <article key={program.title} className="gallery-course-card glow-target">
                <div className="gallery-course-meta">
                  <span>{8 + index * 2} уроков</span>
                  <span>ДНК</span>
                </div>
                <div className="gallery-course-title">{program.title}</div>
                <div className="gallery-course-footer">
                  <span className="gallery-course-price">{formatMoney(program.price)}</span>
                  <Link href="/#catalog" className="gallery-course-btn">
                    Смотреть
                  </Link>
                </div>
              </article>
            ))}
          </div>
          </div>
        ) : null}
      </section>

      {assistantUiEnabled && assistantOpen ? (
        <div
          className="ai-modal-overlay open"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setAssistantOpen(false);
            }
          }}
        >
          <div className="ai-chat-window">
            <div className="chat-header">
              <span>Помощник по курсу</span>
              <button className="close-chat" onClick={() => setAssistantOpen(false)} type="button">
                <CloseIcon />
              </button>
            </div>

            <div className="chat-body" ref={chatBodyRef}>
              {chatMessages.map((chatMessage) => (
                <div
                  key={chatMessage.id}
                  className={`chat-msg ${
                    chatMessage.role === 'ai' ? 'msg-ai' : 'msg-user'
                  }`}
                >
                  {chatMessage.text}
                </div>
              ))}
            </div>

            <div className="chat-footer">
              <input
                className="chat-input"
                onChange={(event) => setChatDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSendChat();
                  }
                }}
                placeholder="Введите вопрос..."
                value={chatDraft}
              />
              <button className="chat-send" onClick={handleSendChat} type="button">
                <ArrowUpIcon />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
