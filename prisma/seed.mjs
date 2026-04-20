import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEV_MARKER = 'dev-seed';
const ALLOWED_DEV_HOSTS = new Set(['localhost', '127.0.0.1', 'postgres-db', 'db']);
const EXPECTED_DATABASE_NAMES = new Set(['hockey_platform']);

function assertDevSeedAllowed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Dev seed is disabled in production.');
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for dev seed.');
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch (error) {
    throw new Error(`DATABASE_URL is invalid: ${error instanceof Error ? error.message : 'unknown error'}`);
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const databaseName = parsedUrl.pathname.replace(/^\/+/, '').split('/')[0];

  if (!ALLOWED_DEV_HOSTS.has(hostname) || !EXPECTED_DATABASE_NAMES.has(databaseName)) {
    throw new Error(
      `Refusing to run dev seed for non-dev database host "${hostname}" and database "${databaseName}".`
    );
  }
}

function fixedUtcDate(year, month, day, hour, minute = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
}

async function upsertCity(name) {
  return prisma.city.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function upsertUser({ email, telegramId, staffRole }) {
  return prisma.user.upsert({
    where: { email },
    update: {
      telegramId,
      staffRole,
    },
    create: {
      email,
      telegramId,
      staffRole,
    },
  });
}

async function ensureProfile({
  userId,
  profileType,
  firstName,
  lastName,
  birthDate,
  cityId,
}) {
  const existingProfile = await prisma.userProfile.findFirst({
    where: {
      userId,
      profileType,
      firstName,
      lastName,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  if (existingProfile) {
    return prisma.userProfile.update({
      where: { id: existingProfile.id },
      data: {
        birthDate,
        cityId,
      },
    });
  }

  return prisma.userProfile.create({
    data: {
      userId,
      profileType,
      firstName,
      lastName,
      birthDate,
      cityId,
    },
  });
}

async function upsertTeam({ name, slug, description, cityId }) {
  return prisma.team.upsert({
    where: { slug },
    update: {
      name,
      description,
      cityId,
    },
    create: {
      name,
      slug,
      description,
      cityId,
    },
  });
}

async function upsertCoachMembership({ userId, teamId, positionCode, jerseyNumber }) {
  return prisma.teamMember.upsert({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
    update: {
      role: 'COACH',
      status: 'ACTIVE',
      positionCode,
      jerseyNumber,
    },
    create: {
      userId,
      teamId,
      role: 'COACH',
      status: 'ACTIVE',
      positionCode,
      jerseyNumber,
    },
  });
}

async function upsertParticipantMembership({
  participantId,
  teamId,
  positionCode,
  jerseyNumber,
}) {
  return prisma.teamMember.upsert({
    where: {
      participantId_teamId: {
        participantId,
        teamId,
      },
    },
    update: {
      role: 'PLAYER',
      status: 'ACTIVE',
      positionCode,
      jerseyNumber,
    },
    create: {
      participantId,
      teamId,
      role: 'PLAYER',
      status: 'ACTIVE',
      positionCode,
      jerseyNumber,
    },
  });
}

async function ensureTraining({
  name,
  description,
  trainingType,
  cityId,
  trainerId,
  startTime,
  endTime,
  location,
  capacity,
  isActive,
}) {
  const existingTraining = await prisma.schoolTraining.findFirst({
    where: {
      name,
      cityId,
      location,
    },
    orderBy: [{ createdAt: 'asc' }, { trainingId: 'asc' }],
  });

  if (existingTraining) {
    return prisma.schoolTraining.update({
      where: { trainingId: existingTraining.trainingId },
      data: {
        description,
        trainingType,
        trainerId,
        startTime,
        endTime,
        capacity,
        isActive,
      },
    });
  }

  return prisma.schoolTraining.create({
    data: {
      name,
      description,
      trainingType,
      cityId,
      trainerId,
      startTime,
      endTime,
      location,
      capacity,
      isActive,
    },
  });
}

async function ensureTrainingBooking({ participantId, trainingId }) {
  const existingBooking = await prisma.trainingBooking.findUnique({
    where: {
      participantId_trainingId: {
        participantId,
        trainingId,
      },
    },
  });

  if (existingBooking) {
    return prisma.trainingBooking.update({
      where: { id: existingBooking.id },
      data: {
        status: 'booked',
      },
    });
  }

  return prisma.trainingBooking.create({
    data: {
      participantId,
      trainingId,
      status: 'booked',
    },
  });
}

async function ensureTeamApplication({
  participantId,
  teamId,
  status,
  commentFromApplicant,
  internalNote,
  reviewedById,
}) {
  const existingApplication = await prisma.teamApplication.findFirst({
    where: {
      participantId,
      teamId,
      commentFromApplicant,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  if (existingApplication) {
    return prisma.teamApplication.update({
      where: { id: existingApplication.id },
      data: {
        status,
        internalNote,
        reviewedById,
      },
    });
  }

  return prisma.teamApplication.create({
    data: {
      participantId,
      teamId,
      status,
      commentFromApplicant,
      internalNote,
      reviewedById,
    },
  });
}

async function ensureRentalFacility({ name, cityId }) {
  const existingFacility = await prisma.rentalFacility.findFirst({
    where: {
      name,
      cityId,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  if (existingFacility) {
    return prisma.rentalFacility.update({
      where: { id: existingFacility.id },
      data: {
        cityId,
      },
    });
  }

  return prisma.rentalFacility.create({
    data: {
      name,
      cityId,
    },
  });
}

async function ensureRentalResource({ facilityId, name, resourceType }) {
  const existingResource = await prisma.rentalResource.findFirst({
    where: {
      facilityId,
      name,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  if (existingResource) {
    return prisma.rentalResource.update({
      where: { id: existingResource.id },
      data: {
        resourceType,
      },
    });
  }

  return prisma.rentalResource.create({
    data: {
      facilityId,
      name,
      resourceType,
    },
  });
}

async function ensureRentalSlot({
  resourceId,
  startsAt,
  endsAt,
  status,
  isPublic,
}) {
  const existingSlot = await prisma.rentalSlot.findFirst({
    where: {
      resourceId,
      startsAt,
      endsAt,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  if (existingSlot) {
    return prisma.rentalSlot.update({
      where: { id: existingSlot.id },
      data: {
        status,
        isPublic,
      },
    });
  }

  return prisma.rentalSlot.create({
    data: {
      resourceId,
      startsAt,
      endsAt,
      status,
      isPublic,
    },
  });
}

async function ensureRentalBooking({
  slotId,
  userId,
  participantId,
  status,
  noteFromUser,
  managerNote,
}) {
  const existingBooking = await prisma.rentalBooking.findFirst({
    where: {
      slotId,
      userId,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  if (existingBooking) {
    return prisma.rentalBooking.update({
      where: { id: existingBooking.id },
      data: {
        participantId,
        status,
        noteFromUser,
        managerNote,
      },
    });
  }

  return prisma.rentalBooking.create({
    data: {
      slotId,
      userId,
      participantId,
      status,
      noteFromUser,
      managerNote,
    },
  });
}

function printSummary(summary) {
  console.log('');
  console.log('DEV_SEED_SUMMARY');
  console.log(`ADMIN userId: ${summary.users.admin.id}`);
  console.log(`MANAGER userId: ${summary.users.manager.id}`);
  console.log(`USER userId: ${summary.users.user.id}`);
  console.log(`USER participantId: ${summary.participant.id}`);
  console.log(`Cities: ${summary.cities.map((city) => `${city.id}:${city.name}`).join(', ')}`);
  console.log(`Teams: ${summary.teams.map((team) => `${team.id}:${team.name}`).join(', ')}`);
  console.log(
    `Trainings: ${summary.trainings
      .map((training) => `${training.trainingId}:${training.name}`)
      .join(', ')}`
  );
  console.log(
    `Rental facility/resource: ${summary.rental.facility.id}:${summary.rental.facility.name} / ${summary.rental.resource.id}:${summary.rental.resource.name}`
  );
  console.log(
    `Rental slots: ${summary.rental.slots
      .map((slot) => `${slot.id}:${slot.status}:${slot.startsAt.toISOString()}`)
      .join(', ')}`
  );
  console.log(
    `Training booking: ${summary.trainingBooking.id} for training ${summary.trainingBooking.trainingId}`
  );
  console.log(
    `Team application: ${summary.teamApplication.id} -> team ${summary.teamApplication.teamId}`
  );
  console.log(`Rental booking: ${summary.rental.booking.id} -> slot ${summary.rental.booking.slotId}`);
  console.log('');
}

async function main() {
  assertDevSeedAllowed();

  const moscow = await upsertCity('Москва');
  const nizhnyNovgorod = await upsertCity('Нижний Новгород');

  const adminUser = await upsertUser({
    email: 'admin.dev@gorilla.local',
    telegramId: 'gorilla_admin_dev',
    staffRole: 'ADMIN',
  });
  const managerUser = await upsertUser({
    email: 'manager.dev@gorilla.local',
    telegramId: 'gorilla_manager_dev',
    staffRole: 'MANAGER',
  });
  const regularUser = await upsertUser({
    email: 'user.dev@gorilla.local',
    telegramId: 'gorilla_user_dev',
    staffRole: null,
  });

  await ensureProfile({
    userId: adminUser.id,
    profileType: 'ADULT',
    firstName: 'Анна',
    lastName: 'Админ',
    birthDate: fixedUtcDate(1990, 5, 12, 12),
    cityId: moscow.id,
  });
  await ensureProfile({
    userId: managerUser.id,
    profileType: 'ADULT',
    firstName: 'Максим',
    lastName: 'Менеджер',
    birthDate: fixedUtcDate(1992, 8, 4, 12),
    cityId: moscow.id,
  });
  await ensureProfile({
    userId: regularUser.id,
    profileType: 'PARENT',
    firstName: 'Ольга',
    lastName: 'Родитель',
    birthDate: fixedUtcDate(1988, 11, 20, 12),
    cityId: moscow.id,
  });

  const participant = await ensureProfile({
    userId: regularUser.id,
    profileType: 'CHILD',
    firstName: 'Иван',
    lastName: 'Игрок',
    birthDate: fixedUtcDate(2014, 2, 15, 12),
    cityId: moscow.id,
  });

  const moscowTeam = await upsertTeam({
    name: 'Команда клуба Москва (dev)',
    slug: 'team-moscow-dev-seed',
    description: `Минимальная dev-команда для проверки user/staff flows (${DEV_MARKER}).`,
    cityId: moscow.id,
  });
  const nizhnyTeam = await upsertTeam({
    name: 'Команда клуба Нижний Новгород (dev)',
    slug: 'team-nizhny-dev-seed',
    description: `Минимальная dev-команда для проверки user/staff flows (${DEV_MARKER}).`,
    cityId: nizhnyNovgorod.id,
  });

  await upsertCoachMembership({
    userId: managerUser.id,
    teamId: moscowTeam.id,
    positionCode: 'HC',
    jerseyNumber: null,
  });
  await upsertParticipantMembership({
    participantId: participant.id,
    teamId: moscowTeam.id,
    positionCode: 'FWD',
    jerseyNumber: 17,
  });

  const moscowTraining = await ensureTraining({
    name: 'Тренировка Москва (dev)',
    description: `Активная тренировка для проверки записи в кабинет и staff dashboard (${DEV_MARKER}).`,
    trainingType: 'group',
    cityId: moscow.id,
    trainerId: managerUser.id,
    startTime: fixedUtcDate(2030, 1, 15, 15, 0),
    endTime: fixedUtcDate(2030, 1, 15, 16, 30),
    location: 'ЛДС Москва, лёд A',
    capacity: 20,
    isActive: true,
  });
  const nizhnyTraining = await ensureTraining({
    name: 'Тренировка Нижний Новгород (dev)',
    description: `Вторая активная тренировка для проверки доступного каталога (${DEV_MARKER}).`,
    trainingType: 'group',
    cityId: nizhnyNovgorod.id,
    trainerId: managerUser.id,
    startTime: fixedUtcDate(2030, 1, 16, 14, 0),
    endTime: fixedUtcDate(2030, 1, 16, 15, 30),
    location: 'ФОК Нижний, лёд B',
    capacity: 18,
    isActive: true,
  });

  const trainingBooking = await ensureTrainingBooking({
    participantId: participant.id,
    trainingId: moscowTraining.trainingId,
  });

  const teamApplication = await ensureTeamApplication({
    participantId: participant.id,
    teamId: nizhnyTeam.id,
    status: 'PENDING',
    commentFromApplicant: `Хочу попасть на просмотр в команду Нижнего Новгорода (${DEV_MARKER}).`,
    internalNote: null,
    reviewedById: null,
  });

  const rentalFacility = await ensureRentalFacility({
    name: 'Ледовая арена Москва (dev)',
    cityId: moscow.id,
  });
  const rentalResource = await ensureRentalResource({
    facilityId: rentalFacility.id,
    name: 'Лёд A (dev)',
    resourceType: 'ice-rink',
  });

  const availableRentalSlotOne = await ensureRentalSlot({
    resourceId: rentalResource.id,
    startsAt: fixedUtcDate(2030, 1, 17, 10, 0),
    endsAt: fixedUtcDate(2030, 1, 17, 11, 0),
    status: 'AVAILABLE',
    isPublic: true,
  });
  const availableRentalSlotTwo = await ensureRentalSlot({
    resourceId: rentalResource.id,
    startsAt: fixedUtcDate(2030, 1, 18, 12, 0),
    endsAt: fixedUtcDate(2030, 1, 18, 13, 0),
    status: 'AVAILABLE',
    isPublic: true,
  });
  const bookedRentalSlot = await ensureRentalSlot({
    resourceId: rentalResource.id,
    startsAt: fixedUtcDate(2030, 1, 19, 14, 0),
    endsAt: fixedUtcDate(2030, 1, 19, 15, 0),
    status: 'BOOKED',
    isPublic: true,
  });

  const rentalBooking = await ensureRentalBooking({
    slotId: bookedRentalSlot.id,
    userId: regularUser.id,
    participantId: participant.id,
    status: 'PENDING_CONFIRMATION',
    noteFromUser: `Нужна тестовая бронь для проверки rental flow (${DEV_MARKER}).`,
    managerNote: `Создано сидом для ручной проверки (${DEV_MARKER}).`,
  });

  printSummary({
    cities: [moscow, nizhnyNovgorod],
    users: {
      admin: adminUser,
      manager: managerUser,
      user: regularUser,
    },
    participant,
    teams: [moscowTeam, nizhnyTeam],
    trainings: [moscowTraining, nizhnyTraining],
    trainingBooking,
    teamApplication,
    rental: {
      facility: rentalFacility,
      resource: rentalResource,
      slots: [availableRentalSlotOne, availableRentalSlotTwo, bookedRentalSlot],
      booking: rentalBooking,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
