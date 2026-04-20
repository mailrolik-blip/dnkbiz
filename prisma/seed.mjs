import { PrismaClient } from '@prisma/client';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

const ALLOWED_DEV_HOSTS = new Set(['localhost', '127.0.0.1', 'course-db', 'db']);
const EXPECTED_DATABASE_NAMES = new Set(['course_platform']);

function assertDevSeedAllowed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed is disabled in production.');
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for seed.');
  }

  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\/+/, '').split('/')[0];

  if (
    !ALLOWED_DEV_HOSTS.has(parsed.hostname.toLowerCase()) ||
    !EXPECTED_DATABASE_NAMES.has(databaseName)
  ) {
    throw new Error(
      `Refusing to seed non-dev database host "${parsed.hostname}" and database "${databaseName}".`
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
    name: 'Admin User',
    role: 'ADMIN',
  });

  const user = await upsertUser({
    email: 'user@example.com',
    password: 'User12345!',
    name: 'Test User',
    role: 'USER',
  });

  const course = await prisma.course.upsert({
    where: {
      slug: 'practical-course',
    },
    update: {
      title: 'Practical Course',
      description: 'A paid course used to validate auth, orders, enrollments, and lesson progress.',
      isPublished: true,
    },
    create: {
      title: 'Practical Course',
      slug: 'practical-course',
      description: 'A paid course used to validate auth, orders, enrollments, and lesson progress.',
      isPublished: true,
    },
  });

  const lessons = [
    {
      title: 'Welcome and setup',
      slug: 'welcome-and-setup',
      description: 'How the course is structured and how to work through it.',
      content:
        'Lesson 1\n\nStart with the overall roadmap. The goal is to finish every lesson in order and mark your progress as you go.',
      position: 1,
    },
    {
      title: 'Define your offer',
      slug: 'define-your-offer',
      description: 'Pick one clear paid offer and remove side quests.',
      content:
        'Lesson 2\n\nWrite a one-sentence offer, define the customer, and decide what outcome the course provides.',
      position: 2,
    },
    {
      title: 'Find the core promise',
      slug: 'find-the-core-promise',
      description: 'Turn your idea into one measurable transformation.',
      content:
        'Lesson 3\n\nEvery strong course promise is specific, believable, and easy to repeat in sales copy.',
      position: 3,
    },
    {
      title: 'Build the lesson map',
      slug: 'build-the-lesson-map',
      description: 'Split the promise into a simple lesson sequence.',
      content:
        'Lesson 4\n\nMap the course so every lesson resolves one problem and prepares the next lesson.',
      position: 4,
    },
    {
      title: 'Write the first draft',
      slug: 'write-the-first-draft',
      description: 'Use rough drafts instead of waiting for perfect content.',
      content:
        'Lesson 5\n\nFast first drafts beat overthinking. Get the material into the lesson editor and iterate from there.',
      position: 5,
    },
    {
      title: 'Add proof and examples',
      slug: 'add-proof-and-examples',
      description: 'Support each module with examples, templates, or exercises.',
      content:
        'Lesson 6\n\nGood examples reduce friction. Add specific use cases, examples, and checkpoints to each module.',
      position: 6,
    },
    {
      title: 'Finish and review',
      slug: 'finish-and-review',
      description: 'Review the course end-to-end and tighten weak parts.',
      content:
        'Lesson 7\n\nReview the whole experience, remove duplicated content, and keep only what helps the learner finish.',
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
      title: 'Full course access',
      price: 14900,
      interval: 'one-time',
      isActive: true,
      courseId: course.id,
    },
    create: {
      title: 'Full course access',
      slug: 'practical-course-access',
      price: 14900,
      interval: 'one-time',
      isActive: true,
      courseId: course.id,
    },
  });

  console.log('');
  console.log('SEED_SUMMARY');
  console.log(`Admin: ${admin.email} / Admin123! / id=${admin.id}`);
  console.log(`User: ${user.email} / User12345! / id=${user.id}`);
  console.log(`Course: ${course.title} / slug=${course.slug}`);
  console.log(`Lessons: ${lessons.length}`);
  console.log(`Tariff: ${tariff.title} / ${tariff.price} RUB / id=${tariff.id}`);
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
