import type { CatalogCourseCard } from './lms-catalog';
import { getActiveOrderActionLabel } from './payments/constants';

export function formatCoursePrice(value: number | null) {
  if (value === null) {
    return 'Бесплатно';
  }

  return `${value.toLocaleString('ru-RU')} ₽`;
}

export function formatLessonCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} урок`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} урока`;
  }

  return `${count} уроков`;
}

export function formatPreviewLessons(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} ознакомительный урок`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} ознакомительных урока`;
  }

  return `${count} ознакомительных уроков`;
}

export function isStartedPreviewCourse(course: CatalogCourseCard) {
  return course.status === 'paid' && course.isStarted && !course.isOwned;
}

export function canOpenCourseRoute(
  course: Pick<CatalogCourseCard, 'status' | 'isOwned' | 'previewEnabled'>
) {
  return course.status === 'free' || course.isOwned || course.previewEnabled;
}

export function getCatalogCourseToneClass(course: CatalogCourseCard) {
  if (course.status === 'showcase') {
    return 'catalog-card--showcase';
  }

  if (course.pendingOrder) {
    return 'catalog-card--pending';
  }

  if (course.isOwned) {
    return 'catalog-card--owned';
  }

  if (course.status === 'free') {
    return 'catalog-card--free';
  }

  if (isStartedPreviewCourse(course)) {
    return 'catalog-card--preview';
  }

  return 'catalog-card--paid';
}

export function getCatalogCourseStatusClass(course: CatalogCourseCard) {
  if (course.status === 'showcase') {
    return 'badge badge-pending';
  }

  if (course.pendingOrder) {
    return 'badge badge-pending';
  }

  if (course.isOwned) {
    return 'badge badge-paid';
  }

  if (course.status === 'free') {
    return 'badge badge-complete';
  }

  if (isStartedPreviewCourse(course)) {
    return 'badge badge-pending';
  }

  return 'badge badge-paid';
}

export function getCatalogCourseStatusLabel(course: CatalogCourseCard) {
  if (course.status === 'showcase') {
    return 'Скоро';
  }

  if (course.pendingOrder) {
    return course.pendingOrder.status === 'PROCESSING'
      ? 'Платеж на проверке'
      : 'Ожидает оплаты';
  }

  if (course.isOwned) {
    return 'Доступ открыт';
  }

  if (course.status === 'free') {
    return course.isStarted ? 'Курс уже открыт' : 'Доступен сразу';
  }

  if (isStartedPreviewCourse(course)) {
    return 'Открыты бесплатные уроки';
  }

  if (course.previewEnabled && course.previewLessonsCount > 0) {
    return 'Есть бесплатные уроки';
  }

  return 'Доступ по подтверждению оплаты';
}

export function getCatalogCourseActionHint(course: CatalogCourseCard, hasUser: boolean) {
  if (course.status === 'showcase') {
    return 'Страница курса уже доступна';
  }

  if (course.pendingOrder) {
    return course.pendingOrder.status === 'PROCESSING'
      ? 'Оплата отправлена на подтверждение'
      : 'Заказ уже создан. Откройте экран оплаты, чтобы завершить покупку.';
  }

  if (course.isOwned) {
    return 'Курс уже доступен';
  }

  if (course.status === 'free') {
    if (!hasUser) {
      return 'Регистрация откроет курс сразу';
    }

    return course.isStarted ? 'Продолжить с сохраненного места' : 'Начать бесплатно';
  }

  if (isStartedPreviewCourse(course)) {
    return `Уже открыто: ${formatPreviewLessons(course.previewLessonsCount)}`;
  }

  if (!hasUser) {
    return course.previewEnabled && course.previewLessonsCount > 0
      ? 'Регистрация откроет бесплатные уроки'
      : 'Регистрация откроет страницу оплаты';
  }

  if (course.previewEnabled && course.previewLessonsCount > 0) {
    return `${formatPreviewLessons(course.previewLessonsCount)} доступны бесплатно`;
  }

  return 'Получить полный доступ';
}

export function getCatalogCourseNextStep(course: CatalogCourseCard, hasUser: boolean) {
  if (course.status === 'showcase') {
    return 'Страница курса уже доступна, но самостоятельное получение полного доступа для этой программы пока не открыто.';
  }

  if (course.status === 'free') {
    if (!hasUser) {
      return 'После бесплатной регистрации курс откроется сразу, без оплаты и без дополнительных шагов.';
    }

    return course.isStarted
      ? 'Курс уже есть в кабинете. Можно вернуться к урокам и продолжить обучение с сохраненного места.'
      : 'Курс доступен сразу после входа. Его можно начать без оплаты.';
  }

  if (course.isOwned) {
    return 'Полный доступ уже открыт. Можно перейти к урокам и продолжить обучение.';
  }

  if (course.pendingOrder) {
    return course.pendingOrder.status === 'PROCESSING'
      ? 'Оплата уже отправлена на подтверждение. Вернитесь на экран оплаты, чтобы проверить статус заказа. Полный доступ откроется после подтверждения оплаты.'
      : `Покупка уже начата. ${getActiveOrderActionLabel(
          course.pendingOrder.status
        )}, чтобы перейти к оплате и завершить заказ.`;
  }

  if (isStartedPreviewCourse(course)) {
    return `Вы уже открыли ${formatPreviewLessons(
      course.previewLessonsCount
    )}. Можно продолжить обучение или завершить покупку полного курса.`;
  }

  if (!hasUser) {
    return course.previewEnabled && course.previewLessonsCount > 0
      ? 'После регистрации можно открыть бесплатные уроки и затем получить полный доступ к курсу.'
      : 'После регистрации можно перейти к оплате и затем открыть курс в личном кабинете.';
  }

  if (course.previewEnabled && course.previewLessonsCount > 0) {
    return `До покупки доступны ${formatPreviewLessons(
      course.previewLessonsCount
    )}. Полный доступ откроется после подтверждения оплаты.`;
  }

  return 'Курс можно оплатить на странице заказа и открыть в кабинете после подтверждения оплаты.';
}
