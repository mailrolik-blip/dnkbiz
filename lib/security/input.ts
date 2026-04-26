const EMAIL_MAX_LENGTH = 254;
const NAME_MAX_LENGTH = 120;
const PASSWORD_MAX_LENGTH = 128;
const PASSWORD_MIN_LENGTH = 8;
const LESSON_ANSWER_MAX_LENGTH = 10_000;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function normalizeName(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

export function isValidEmail(email: string) {
  return email.length > 0 && email.length <= EMAIL_MAX_LENGTH && emailPattern.test(email);
}

export function isValidPasswordLength(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH;
}

export function isValidLoginPasswordLength(password: string) {
  return password.length > 0 && password.length <= PASSWORD_MAX_LENGTH;
}

export function isValidName(name: string | null) {
  return name === null || name.length <= NAME_MAX_LENGTH;
}

export function normalizeLessonAnswer(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function isValidLessonAnswer(answer: string | null | undefined) {
  return answer === undefined || answer === null || answer.length <= LESSON_ANSWER_MAX_LENGTH;
}

export const securityInputLimits = {
  emailMaxLength: EMAIL_MAX_LENGTH,
  nameMaxLength: NAME_MAX_LENGTH,
  passwordMaxLength: PASSWORD_MAX_LENGTH,
  passwordMinLength: PASSWORD_MIN_LENGTH,
  lessonAnswerMaxLength: LESSON_ANSWER_MAX_LENGTH,
} as const;
