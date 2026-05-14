export default function LoadingCoursePage() {
  return (
    <main className="page-shell">
      <section className="stack-grid">
        <div className="section-header">
          <span className="title-main">Обучение</span>
          <span className="title-divider">/</span>
          <span className="title-course">Платформа</span>
        </div>

        <div className="lms-wrapper">
          <article className="glass-panel lms-main">
            <div className="lms-scroll-area">
              <div className="lms-tag">Загрузка</div>
              <h2 className="lms-title">Открываем курс...</h2>
              <p className="lms-desc">
                Получаем уроки, текущий прогресс и структуру курса.
              </p>
            </div>
          </article>

          <aside className="glass-panel lms-sidebar">
            <div className="progress-box">
              <div className="progress-info">
                <span>Прогресс</span>
                <span>...</span>
              </div>
              <div className="progress-line">
                <div className="progress-fill" style={{ width: '20%' }} />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
