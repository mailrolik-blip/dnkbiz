'use client';

import Link from 'next/link';
import { useState } from 'react';

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

type CoursePlayerProps = {
  course: {
    title: string;
    slug: string;
    description: string | null;
    lessons: LessonItem[];
  };
};

function formatDateTime(value: string | null) {
  if (!value) {
    return 'not viewed yet';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function CoursePlayer({ course }: CoursePlayerProps) {
  const [lessons, setLessons] = useState(course.lessons);
  const [pendingLessonId, setPendingLessonId] = useState<number | null>(null);
  const [message, setMessage] = useState<{
    tone: 'error' | 'success';
    text: string;
  } | null>(null);

  const completedCount = lessons.filter((lesson) => lesson.progress?.completed).length;

  function updateLesson(
    lessonId: number,
    updater: (lesson: LessonItem) => LessonItem
  ) {
    setLessons((current) =>
      current.map((lesson) => (lesson.id === lessonId ? updater(lesson) : lesson))
    );
  }

  function handleAnswerChange(lessonId: number, answer: string) {
    updateLesson(lessonId, (lesson) => ({
      ...lesson,
      progress: {
        completed: lesson.progress?.completed ?? false,
        answer,
        lastViewedAt: lesson.progress?.lastViewedAt ?? null,
        updatedAt: lesson.progress?.updatedAt ?? new Date().toISOString(),
      },
    }));
  }

  async function persistProgress(
    lessonId: number,
    body: { completed?: boolean; answer?: string | null }
  ) {
    setPendingLessonId(lessonId);
    setMessage(null);

    try {
      const response = await fetch(`/api/lessons/${lessonId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
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
        throw new Error(payload?.error || 'Failed to save progress.');
      }

      updateLesson(lessonId, (lesson) => ({
        ...lesson,
        progress: payload.progress ?? null,
      }));

      setMessage({
        tone: 'success',
        text: `Lesson ${lessonId} progress saved.`,
      });
    } catch (progressError) {
      setMessage({
        tone: 'error',
        text:
          progressError instanceof Error
            ? progressError.message
            : 'Failed to save progress.',
      });
    } finally {
      setPendingLessonId(null);
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
          <Link className="secondary-button" href="/lk">
            Back to dashboard
          </Link>
        </div>
      </div>

      <section className="stack-grid">
        <article className="panel">
          <span className="eyebrow">Protected course page</span>
          <div className="panel-head" style={{ marginTop: '0.9rem' }}>
            <div>
              <h1>{course.title}</h1>
              <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
                {course.description || 'Only enrolled users can access this route.'}
              </p>
            </div>
            <div className="badge-row" style={{ marginTop: 0 }}>
              <span className="badge badge-complete">
                {completedCount}/{lessons.length} completed
              </span>
            </div>
          </div>

          {message ? (
            <p
              className={`feedback ${
                message.tone === 'success' ? 'feedback-success' : 'feedback-error'
              }`}
            >
              {message.text}
            </p>
          ) : null}
        </article>

        <div className="lesson-grid">
          {lessons.map((lesson) => (
            <article key={lesson.id} className="lesson-card">
              <details open={lesson.position === 1}>
                <summary>
                  <span className="eyebrow">Lesson {lesson.position}</span>
                  <h2 style={{ marginTop: '0.8rem' }}>{lesson.title}</h2>
                  <div className="lesson-meta">
                    <span>{lesson.slug}</span>
                    <span>
                      {lesson.progress?.completed ? 'completed' : 'not completed'}
                    </span>
                    <span>last viewed {formatDateTime(lesson.progress?.lastViewedAt ?? null)}</span>
                  </div>
                </summary>

                {lesson.description ? (
                  <p className="muted-text" style={{ marginTop: '0.9rem' }}>
                    {lesson.description}
                  </p>
                ) : null}

                {lesson.content ? (
                  <div className="lesson-content">{lesson.content}</div>
                ) : null}

                <label className="checkbox-row">
                  <input
                    checked={lesson.progress?.completed ?? false}
                    disabled={pendingLessonId === lesson.id}
                    onChange={(event) =>
                      persistProgress(lesson.id, { completed: event.target.checked })
                    }
                    type="checkbox"
                  />
                  <span>Mark lesson as completed</span>
                </label>

                <div className="field" style={{ marginTop: '1rem' }}>
                  <label htmlFor={`answer-${lesson.id}`}>Your lesson notes</label>
                  <textarea
                    id={`answer-${lesson.id}`}
                    onChange={(event) =>
                      handleAnswerChange(lesson.id, event.target.value)
                    }
                    rows={5}
                    value={lesson.progress?.answer ?? ''}
                  />
                </div>

                <div className="row-actions">
                  <button
                    className="primary-button"
                    disabled={pendingLessonId === lesson.id}
                    onClick={() =>
                      persistProgress(lesson.id, {
                        answer: lesson.progress?.answer ?? '',
                      })
                    }
                    type="button"
                  >
                    {pendingLessonId === lesson.id ? 'Saving...' : 'Save progress'}
                  </button>
                </div>
              </details>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
