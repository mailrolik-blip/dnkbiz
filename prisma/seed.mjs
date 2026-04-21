import { PrismaClient } from '@prisma/client';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

const ALLOWED_DEV_HOSTS = new Set(['localhost', '127.0.0.1', 'course-db', 'db']);
const EXPECTED_DATABASE_NAMES = new Set(['course_platform']);

function assertDevSeedAllowed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed отключен в production.');
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('Для seed требуется DATABASE_URL.');
  }

  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\/+/, '').split('/')[0];

  if (
    !ALLOWED_DEV_HOSTS.has(parsed.hostname.toLowerCase()) ||
    !EXPECTED_DATABASE_NAMES.has(databaseName)
  ) {
    throw new Error(
      `Seed разрешён только для dev-базы. Текущий хост "${parsed.hostname}", база "${databaseName}".`
    );
  }
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${Buffer.from(derivedKey).toString('hex')}`;
}

async function upsertUser({ email, password, name, role }) {
  return prisma.user.upsert({
    where: {
      email,
    },
    update: {
      passwordHash: await hashPassword(password),
      name,
      role,
    },
    create: {
      email,
      passwordHash: await hashPassword(password),
      name,
      role,
    },
  });
}

async function main() {
  assertDevSeedAllowed();

  const admin = await upsertUser({
    email: 'admin@example.com',
    password: 'Admin123!',
    name: 'Администратор DNK',
    role: 'ADMIN',
  });

  const user = await upsertUser({
    email: 'user@example.com',
    password: 'User12345!',
    name: 'Тестовый ученик',
    role: 'USER',
  });

  const course = await prisma.course.upsert({
    where: {
      slug: 'practical-course',
    },
    update: {
      title: 'Платформа ДНК: стартовый курс',
      description:
        'Стартовая программа ДНК для проверки регистрации, заказов, открытия доступа и сохранения прогресса по урокам.',
      isPublished: true,
    },
    create: {
      title: 'Платформа ДНК: стартовый курс',
      slug: 'practical-course',
      description:
        'Стартовая программа ДНК для проверки регистрации, заказов, открытия доступа и сохранения прогресса по урокам.',
      isPublished: true,
    },
  });

  const lessons = [
    {
      title: 'Добро пожаловать на платформу',
      slug: 'welcome-and-setup',
      description: 'Как устроено обучение, личный кабинет и работа с материалами курса.',
      content:
        'Урок 1\n\nЭто вводный модуль платформы ДНК. Здесь вы знакомитесь с логикой кабинета, доступом к курсу и базовым сценарием прохождения программы.',
      position: 1,
    },
    {
      title: 'Как устроен личный кабинет',
      slug: 'define-your-offer',
      description: 'Разбираем, где находятся ваши курсы, заказы и активные тарифы.',
      content:
        'Урок 2\n\nВ личном кабинете пользователь видит свои оплаченные программы, историю заказов и доступные тарифы. Это основная точка входа после авторизации.',
      position: 2,
    },
    {
      title: 'Оформление доступа к программе',
      slug: 'find-the-core-promise',
      description: 'Что происходит после выбора тарифа и создания заказа.',
      content:
        'Урок 3\n\nПосле создания заказа система фиксирует статус PENDING. Когда администратор переводит заказ в PAID, пользователю автоматически открывается доступ к курсу.',
      position: 3,
    },
    {
      title: 'Структура учебного модуля',
      slug: 'build-the-lesson-map',
      description: 'Как построен экран урока и навигация внутри программы.',
      content:
        'Урок 4\n\nЭкран курса включает список уроков, основную область материала, блок заметок и индикатор прогресса. Пользователь проходит программу по шагам.',
      position: 4,
    },
    {
      title: 'Сохранение прогресса',
      slug: 'write-the-first-draft',
      description: 'Как отмечать уроки завершёнными и сохранять ответы.',
      content:
        'Урок 5\n\nПосле прохождения урока можно сохранить заметку и отметить материал завершённым. Данные записываются в таблицу прогресса и привязаны к текущему пользователю.',
      position: 5,
    },
    {
      title: 'Практика и заметки',
      slug: 'add-proof-and-examples',
      description: 'Используем текстовый ответ как рабочее поле для практики по уроку.',
      content:
        'Урок 6\n\nБлок домашней практики нужен для коротких выводов, ответов и фиксации действий. Он уже подключён к реальному API сохранения прогресса.',
      position: 6,
    },
    {
      title: 'Завершение курса',
      slug: 'finish-and-review',
      description: 'Подводим итог и проверяем, что весь контур обучения работает целиком.',
      content:
        'Урок 7\n\nКогда все уроки отмечены завершёнными, курс показывает экран успеха. Пользователь может вернуться в кабинет или продолжить просмотр материалов.',
      position: 7,
    },
  ];

  for (const lesson of lessons) {
    await prisma.lesson.upsert({
      where: {
        courseId_slug: {
          courseId: course.id,
          slug: lesson.slug,
        },
      },
      update: {
        title: lesson.title,
        description: lesson.description,
        content: lesson.content,
        position: lesson.position,
        isPublished: true,
      },
      create: {
        courseId: course.id,
        title: lesson.title,
        slug: lesson.slug,
        description: lesson.description,
        content: lesson.content,
        position: lesson.position,
        isPublished: true,
      },
    });
  }

  const tariff = await prisma.tariff.upsert({
    where: {
      slug: 'practical-course-access',
    },
    update: {
      title: 'Доступ к стартовому курсу',
      price: 14900,
      interval: 'one-time',
      isActive: true,
      courseId: course.id,
    },
    create: {
      title: 'Доступ к стартовому курсу',
      slug: 'practical-course-access',
      price: 14900,
      interval: 'one-time',
      isActive: true,
      courseId: course.id,
    },
  });

  console.log('');
  console.log('SEED_SUMMARY');
  console.log(`Админ: ${admin.email} / Admin123! / id=${admin.id}`);
  console.log(`Пользователь: ${user.email} / User12345! / id=${user.id}`);
  console.log(`Курс: ${course.title} / slug=${course.slug}`);
  console.log(`Уроков: ${lessons.length}`);
  console.log(`Тариф: ${tariff.title} / ${tariff.price} RUB / id=${tariff.id}`);
  console.log('');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
