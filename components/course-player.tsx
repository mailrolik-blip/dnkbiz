'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import type { CourseViewerData, CourseViewerLesson } from '@/lib/course-access';
import { dnkFeaturedPrograms } from '@/lib/dnk-content';
import { getActiveOrderActionLabel } from '@/lib/payments/constants';
import { formatPreviewLessons } from '@/lib/purchase-ux';

type CoursePlayerProps = {
  course: CourseViewerData;
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

function LessonContent({ content }: { content: string }) {
  const blocks = parseContentBlocks(content);

  return (
    <div className="lesson-content lesson-content--lms lesson-rich-content">
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
        <span className="eyebrow">Полный доступ после оплаты</span>
        <h3>{lesson.title}</h3>
        <p>
          Этот урок закрыт. До покупки доступны{' '}
          {formatPreviewLessons(course.access.previewLessonsCount)}, а после оплаты откроются
          остальные модули, домашние задания и полный маршрут курса внутри LMS.
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
            {purchasePending ? 'Открываем оплату...' : 'Купить курс'}
          </button>
        )}
        <Link href="/lk" className="secondary-button">
          В кабинет
        </Link>
      </div>
    </div>
  );
}

export default function CoursePlayer({ course }: CoursePlayerProps) {
  const router = useRouter();
  const initialCourseComplete = isCourseCompleted(course.lessons);
  const [courseState, setCourseState] = useState(course);
  const [lessons, setLessons] = useState(course.lessons);
  const [currentLessonId, setCurrentLessonId] = useState(() =>
    getNextLessonId(course.lessons)
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'ai',
      text: 'Привет! Я AI-ассистент курса. Сейчас это demo-блок без реальной AI-интеграции, но он показывает, как будет выглядеть помощник внутри платформы.',
    },
  ]);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const completionRef = useRef(initialCourseComplete);

  useEffect(() => {
    setCourseState(course);
    setLessons(course.lessons);
    setCurrentLessonId(getNextLessonId(course.lessons));
    setSyncError(null);
    setMessage(null);
    setSuccessOpen(isCourseCompleted(course.lessons));
    completionRef.current = isCourseCompleted(course.lessons);
  }, [course]);

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
          text: 'Это demo-ответ AI. В текущем MVP чат остается визуальным блоком из 03-block без реальной интеграции модели.',
        },
      ]);
    }, 550);
  }

  return (
    <main className="page-shell">
      <div className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>Бизнес школа ДНК</span>
        </Link>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link className="secondary-button" href="/lk">
            Вернуться в кабинет
          </Link>
        </div>
      </div>

      <section className="stack-grid">
        <div className="section-header">
          <span className="title-main">Обучение</span>
          <span className="title-divider">/</span>
          <span className="title-course">Платформа</span>
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

        <div className="lms-wrapper">
          <article className="glass-panel lms-main glow-target">
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
              className="lms-scroll-area"
              style={{ display: successOpen ? 'none' : undefined }}
            >
              {currentLesson ? (
                <>
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
                        </div>
                      </div>
                    </>
                  )}

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
                    Как только уроки будут добавлены, они появятся в LMS-области справа.
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
                  Сначала можно пройти первые уроки и оценить формат курса. После покупки
                  откроются остальные модули, практика и полный доступ в кабинете.
                </p>
                {courseState.access.tariff ? (
                  <div className="badge-row">
                    <span className="badge badge-paid">
                      {formatMoney(courseState.access.tariff.price)}
                    </span>
                    <span className="badge badge-pending">Полный доступ после оплаты</span>
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
                      {purchasePending ? 'Открываем оплату...' : 'Купить курс'}
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
                        ? 'Откроется после оплаты'
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

            <button className="ai-btn" onClick={() => setAssistantOpen(true)} type="button">
              <ChatIcon />
              <span>Задать вопрос</span>
            </button>
          </aside>
        </div>

        {courseState.access.accessMode === 'PREVIEW' ? (
          <div className="course-mobile-bar">
            <div className="course-mobile-bar__copy">
              <span>
                {courseState.access.pendingOrder
                  ? 'Покупка уже начата'
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
                {purchasePending ? 'Открываем оплату...' : 'Купить курс'}
              </button>
            )}
          </div>
        ) : null}

        <div className="gallery-wrapper">
          <div className="gallery-track">
            {dnkFeaturedPrograms.map((program, index) => (
              <article key={program.title} className="gallery-course-card glow-target">
                <div className="gallery-course-meta">
                  <span>{8 + index * 2} уроков</span>
                  <span>DNK</span>
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
      </section>

      {assistantOpen ? (
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
              <span>AI Ассистент</span>
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
