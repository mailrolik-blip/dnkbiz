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
    return 'Открыты первые уроки';
  }

  return 'Можно купить';
}

export function getCatalogCourseActionHint(course: CatalogCourseCard, hasUser: boolean) {
  if (course.status === 'showcase') {
    return 'В каталоге, без покупки';
  }

  if (course.pendingOrder) {
    return course.pendingOrder.status === 'PROCESSING'
      ? 'Платеж отправлен на ручную проверку'
      : 'Оплатите по QR СБП и нажмите «Я оплатил»';
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
    return `Открыто: ${formatPreviewLessons(course.previewLessonsCount)}`;
  }

  if (!hasUser) {
    return course.previewEnabled && course.previewLessonsCount > 0
      ? 'Регистрация откроет первые уроки'
      : 'Регистрация откроет покупку';
  }

  if (course.previewEnabled && course.previewLessonsCount > 0) {
    return `${formatPreviewLessons(course.previewLessonsCount)} до покупки`;
  }

  return 'Оформить доступ';
}

export function getCatalogCourseNextStep(course: CatalogCourseCard, hasUser: boolean) {
  if (course.status === 'showcase') {
    return 'Курс остается в каталоге как витрина. Самостоятельное оформление доступа для него пока не открыто.';
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
      ? 'Платеж уже отправлен на ручную проверку. Вернитесь на экран оплаты, чтобы проверить статус заказа. Полный доступ откроется после оплаты по QR СБП и ручной проверки.'
      : `Покупка уже начата. ${getActiveOrderActionLabel(
          course.pendingOrder.status
        )}, чтобы увидеть QR СБП, оплатить курс и отправить платеж на ручную проверку.`;
  }

  if (isStartedPreviewCourse(course)) {
    return `Вы уже открыли ${formatPreviewLessons(
      course.previewLessonsCount
    )}. Можно продолжить обучение или завершить покупку полного курса.`;
  }

  if (!hasUser) {
    return 'После регистрации можно открыть первые уроки и перейти к покупке полного курса.';
  }

  if (course.previewEnabled && course.previewLessonsCount > 0) {
    return `До покупки доступны ${formatPreviewLessons(
      course.previewLessonsCount
    )}. Полный доступ откроется после оплаты по QR СБП и ручной проверки.`;
  }

  return 'Курс можно купить и открыть в кабинете после оплаты по QR СБП и ручной проверки.';
}
