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
      ? 'Оплата в обработке'
      : 'Ожидает оплаты';
  }

  if (course.isOwned) {
    return 'Доступ к курсу';
  }

  if (course.status === 'free') {
    return course.isStarted ? 'Курс уже открыт' : 'Доступен сразу';
  }

  if (isStartedPreviewCourse(course)) {
    return 'Открыты первые уроки';
  }

  return 'Можно купить';
}

export function getCatalogCourseNextStep(course: CatalogCourseCard, hasUser: boolean) {
  if (course.status === 'showcase') {
    return 'Курс остается в каталоге как витрина и пока недоступен для покупки внутри LMS.';
  }

  if (course.status === 'free') {
    if (!hasUser) {
      return 'После регистрации курс откроется сразу, без оплаты и без дополнительных шагов.';
    }

    return course.isStarted
      ? 'Курс уже доступен в кабинете. Можно открыть его и продолжить обучение.'
      : 'Курс доступен сразу после входа. Его можно начать без оплаты.';
  }

  if (course.isOwned) {
    return 'Полный доступ уже открыт. Можно перейти к урокам и продолжить обучение.';
  }

  if (course.pendingOrder) {
    return course.pendingOrder.status === 'PROCESSING'
      ? 'Платеж уже запущен и сейчас находится в обработке. Вернитесь на экран оплаты, чтобы проверить текущий статус заказа.'
      : `Покупка уже начата. ${getActiveOrderActionLabel(
          course.pendingOrder.status
        )}, чтобы открыть полный доступ ко всем урокам курса.`;
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
    )}. Полный доступ откроется сразу после оплаты.`;
  }

  return 'Курс можно купить и открыть в кабинете после оплаты.';
}
