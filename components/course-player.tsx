'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { dnkFeaturedPrograms } from '@/lib/dnk-content';

type LessonItem = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  position: number;
  progress: {
    completed: boolean;
    answer: string | null;
    lastViewedAt: string | null;
    updatedAt: string;
  } | null;
};

type CourseData = {
  title: string;
  slug: string;
  description: string | null;
  lessons: LessonItem[];
};

type CoursePlayerProps = {
  course: CourseData;
};

type ChatMessage = {
  id: number;
  role: 'ai' | 'user';
  text: string;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return 'ещё не сохраняли';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatMoney(value: number) {
  return `${value.toLocaleString('ru-RU')} ₽`;
}

function isCourseCompleted(lessons: LessonItem[]) {
  return lessons.length > 0 && lessons.every((lesson) => lesson.progress?.completed);
}

function getNextLessonId(lessons: LessonItem[], currentLessonId?: number) {
  if (
    currentLessonId &&
    lessons.some((lesson) => lesson.id === currentLessonId)
  ) {
    return currentLessonId;
  }

  return (
    lessons.find((lesson) => !lesson.progress?.completed)?.id ??
    lessons[0]?.id ??
    0
  );
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

export default function CoursePlayer({ course }: CoursePlayerProps) {
  const initialCourseComplete = isCourseCompleted(course.lessons);
  const [courseState, setCourseState] = useState(course);
  const [lessons, setLessons] = useState(course.lessons);
  const [currentLessonId, setCurrentLessonId] = useState(() =>
    getNextLessonId(course.lessons)
  );
  const [pendingLessonId, setPendingLessonId] = useState<number | null>(null);
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
      text: 'Привет! Я AI-ассистент курса. Сейчас это demo-блок без реального backend-ответчика, но я покажу, как будет выглядеть диалог.',
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
          | { error?: string; course?: CourseData }
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

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>('.glow-target')
    );

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
  const courseFinished = isCourseCompleted(lessons);

  function updateLesson(
    lessonId: number,
    updater: (lesson: LessonItem) => LessonItem
  ) {
    setLessons((current) =>
      current.map((lesson) => (lesson.id === lessonId ? updater(lesson) : lesson))
    );
  }

  function openLesson(lessonId: number) {
    setCurrentLessonId(lessonId);
    setMessage(null);
    if (successOpen) {
      setSuccessOpen(false);
    }
  }

  function handleAnswerChange(answer: string) {
    if (!currentLesson) {
      return;
    }

    updateLesson(currentLesson.id, (lesson) => ({
      ...lesson,
      progress: {
        completed: lesson.progress?.completed ?? false,
        answer,
        lastViewedAt: lesson.progress?.lastViewedAt ?? null,
        updatedAt: lesson.progress?.updatedAt ?? new Date().toISOString(),
      },
    }));
  }

  function handleCompletedToggle(completed: boolean) {
    if (!currentLesson) {
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
    if (!currentLesson) {
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

      const nextProgress = payload.progress;

      updateLesson(currentLesson.id, (lesson) => ({
        ...lesson,
        progress: nextProgress,
      }));

      setMessage({
        tone: 'success',
        text: `Прогресс по уроку «${currentLesson.title}» сохранён.`,
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
          text: 'Это demo-ответ AI. В текущем MVP чат оставлен как визуальный блок из 03-block без реальной интеграции модели.',
        },
      ]);
    }, 550);
  }

  return (
    <main className="page-shell">
      <div className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>БИЗНЕС ШКОЛА ДНК</span>
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
                'Закрытый курс с живыми уроками, test checkout и сохранением прогресса по пользователю.'}
            </p>
          </div>
          <div className="badge-row" style={{ marginTop: 0 }}>
            <span className="badge badge-paid">
              {completedCount}/{lessons.length} пройдено
            </span>
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
                  Все уроки отмечены завершёнными. Можно вернуться в личный кабинет или
                  остаться в курсе и пересмотреть материалы.
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

                  <div className="video-placeholder">
                    <div className="video-placeholder__icon">
                      <PlayIcon />
                    </div>
                    <div>
                      <strong>Медиа-блок DNK сохранён</strong>
                      <p>
                        В текущем MVP это визуальный контейнер урока из 03-block, подключённый
                        к реальным lesson data и progress API.
                      </p>
                    </div>
                  </div>

                  {currentLesson.content ? (
                    <div className="lesson-content lesson-content--lms">
                      {currentLesson.content}
                    </div>
                  ) : null}

                  <div className="homework-box">
                    <div className="hw-header">
                      <span className="hw-label">Домашняя практика</span>
                      <span className="muted-text">
                        Последнее сохранение:{' '}
                        {formatDateTime(
                          currentLesson.progress?.updatedAt ??
                            currentLesson.progress?.lastViewedAt ??
                            null
                        )}
                      </span>
                    </div>

                    <div className="hw-task">
                      Зафиксируйте ключевую мысль урока или короткий рабочий ответ по
                      материалу. После этого сохраните прогресс и при необходимости отметьте
                      урок завершённым.
                    </div>

                    <textarea
                      className="hw-input"
                      onChange={(event) => handleAnswerChange(event.target.value)}
                      placeholder="Ответ, заметки или план действий по уроку..."
                      rows={5}
                      value={currentLesson.progress?.answer ?? ''}
                    />

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
                        <span>Отметить урок завершённым</span>
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

                    {syncError ? (
                      <p className="feedback feedback-error">{syncError}</p>
                    ) : null}
                  </div>
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

            <div className="lessons-list">
              {lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  className={`lesson-btn ${
                    lesson.id === currentLessonId ? 'active' : ''
                  } ${lesson.progress?.completed ? 'completed' : ''}`}
                  onClick={() => openLesson(lesson.id)}
                  type="button"
                >
                  <span>{lesson.position}. {lesson.title}</span>
                  <span className="check-icon">
                    <CheckIcon />
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
                  <Link href="/#programs" className="gallery-course-btn">
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
              <button
                className="close-chat"
                onClick={() => setAssistantOpen(false)}
                type="button"
              >
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
