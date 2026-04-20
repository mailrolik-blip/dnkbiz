/* eslint-disable @typescript-eslint/no-require-imports */
const { Telegraf } = require('telegraf');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set');
}

const bot = new Telegraf(token);

function formatDate(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

bot.start((ctx) => {
  return ctx.reply(
    'Привет. Я помогу зарегистрироваться и посмотреть доступные тренировки.'
  );
});

bot.command('register', async (ctx) => {
  const telegramId = String(ctx.from.id);

  try {
    const existingUser = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (existingUser) {
      return ctx.reply('Пользователь с этим Telegram уже зарегистрирован.');
    }

    await prisma.user.create({
      data: { telegramId },
    });

    return ctx.reply('Регистрация завершена.');
  } catch (error) {
    console.error('Telegram register failed:', error);
    return ctx.reply('Не удалось завершить регистрацию.');
  }
});

bot.command('trainings', async (ctx) => {
  try {
    const trainings = await prisma.schoolTraining.findMany({
      where: { isActive: true },
      orderBy: { startTime: 'asc' },
      take: 10,
    });

    if (trainings.length === 0) {
      return ctx.reply('Сейчас нет доступных тренировок.');
    }

    const lines = trainings.map(
      (training) =>
        `${training.trainingId}. ${training.name} | ${formatDate(training.startTime)} | ${training.location}`
    );

    return ctx.reply(
      `Ближайшие тренировки:\n${lines.join('\n')}\n\nДля бронирования: /book <trainingId> <participantId>`
    );
  } catch (error) {
    console.error('Telegram trainings failed:', error);
    return ctx.reply('Не удалось загрузить список тренировок.');
  }
});

bot.command('book', async (ctx) => {
  try {
    const telegramId = String(ctx.from.id);
    const parts = ctx.message.text.trim().split(/\s+/);
    const trainingRaw = parts[1];
    const participantRaw = parts[2];

    const trainingId = Number(trainingRaw);
    const requestedParticipantId = participantRaw ? Number(participantRaw) : null;

    if (!Number.isInteger(trainingId) || trainingId <= 0) {
      return ctx.reply('Укажи корректный trainingId: /book <trainingId> <participantId>');
    }

    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        profiles: true,
      },
    });

    if (!user) {
      return ctx.reply('Сначала зарегистрируйся через /register');
    }

    let participantId = requestedParticipantId;

    if (!participantId) {
      if (user.profiles.length !== 1) {
        const profilesList =
          user.profiles.length === 0
            ? 'У тебя пока нет связанных участников.'
            : user.profiles
                .map((profile) => `${profile.id}: ${profile.firstName || 'Без имени'} ${profile.lastName || ''}`.trim())
                .join('\n');

        return ctx.reply(
          `Нужно указать participantId: /book <trainingId> <participantId>\n${profilesList}`
        );
      }

      participantId = user.profiles[0].id;
    }

    const participant = user.profiles.find((profile) => profile.id === participantId);

    if (!participant) {
      return ctx.reply('Этот participantId не принадлежит твоему аккаунту.');
    }

    const training = await prisma.schoolTraining.findUnique({
      where: { trainingId },
    });

    if (!training) {
      return ctx.reply('Тренировка не найдена.');
    }

    if (!training.isActive) {
      return ctx.reply('Эта тренировка сейчас неактивна.');
    }

    const existingBooking = await prisma.trainingBooking.findUnique({
      where: {
        participantId_trainingId: {
          participantId,
          trainingId,
        },
      },
    });

    if (existingBooking?.status === 'booked') {
      return ctx.reply('Участник уже записан на эту тренировку.');
    }

    const activeBookingsCount = await prisma.trainingBooking.count({
      where: {
        trainingId,
        status: 'booked',
      },
    });

    if (activeBookingsCount >= training.capacity) {
      return ctx.reply('Свободных мест на тренировку больше нет.');
    }

    if (existingBooking?.status === 'cancelled') {
      await prisma.trainingBooking.update({
        where: { id: existingBooking.id },
        data: { status: 'booked' },
      });
    } else {
      await prisma.trainingBooking.create({
        data: {
          participantId,
          trainingId,
          status: 'booked',
        },
      });
    }

    return ctx.reply(`Запись подтверждена: ${training.name}`);
  } catch (error) {
    console.error('Telegram booking failed:', error);
    return ctx.reply('Не удалось забронировать тренировку.');
  }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

/*
const { Telegraf } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const prismaClient = new PrismaClient();
const bot = new Telegraf('8676091088:AAH2SPQlx0vGci2wPqB2sv0Mn9_SZ2j7q2Y');

// Приветственное сообщение при старте
bot.start((ctx) => {
  ctx.reply('Привет! Я помогу тебе с бронированиями. Для начала зарегистрируйся!');
});

// Команда для регистрации нового пользователя
bot.command('/register', async (ctx) => {
  const telegramId = ctx.from.id.toString();

  // Проверка, существует ли уже пользователь
  const existingUser = await prismaClient.user.findUnique({
    where: { telegramId: telegramId },
  });

  if (existingUser) {
    return ctx.reply('Ты уже зарегистрирован!');
  }

  // Если пользователь не найден, создаем нового
  try {
    await prismaClient.user.create({
      data: {
        telegramId: telegramId,
        // можешь добавить другие поля, если нужно
      },
    });
    ctx.reply('Ты успешно зарегистрирован!');
  } catch (error) {
    console.error('Ошибка при регистрации пользователя:', error);
    ctx.reply('Произошла ошибка при регистрации. Попробуй снова позже.');
  }
});

// Команда для получения доступных тренировок
bot.command('trainings', async (ctx) => {
  try {
    console.log('Fetching trainings...');
    const trainings = await prismaClient.schoolTraining.findMany();
    console.log('Trainings fetched:', trainings);

    if (trainings.length === 0) {
      return ctx.reply('На данный момент нет доступных тренировок.');
    }

    let response = 'Доступные тренировки:\n';
    trainings.forEach((training, index) => {
      // Предполагаю, что в базе данных поле называется `start_time`
      response += `${index + 1}. ${training.name} - ${training.start_time}\n`;
    });

    ctx.reply(response);
  } catch (error) {
    console.error('Error fetching trainings:', error);
    ctx.reply('Произошла ошибка при получении списка тренировок.');
  }
});

// Команда для бронирования тренировки
bot.command('book', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await prismaClient.user.findUnique({
    where: { telegramId: telegramId },
  });

  if (!user) {
    return ctx.reply('Сначала зарегистрируйся с помощью команды /register');
  }

  const trainingId = ctx.message.text.split(' ')[1]; // Получаем ID тренировки из сообщения

  if (!trainingId) {
    return ctx.reply('Пожалуйста, укажи ID тренировки для бронирования.');
  }

  // Проверяем, существует ли тренировка
  const training = await prismaClient.schoolTraining.findUnique({
    where: { training_id: parseInt(trainingId) },  // предполагается, что это правильное имя поля
  });

  if (!training) {
    return ctx.reply('Тренировка не найдена.');
  }

  // Находим слот для тренировки
  const slot = await prismaClient.schoolTrainingSlots.findFirst({
    where: { trainingId: training.training_id, availableSlots: { gt: 0 } },
  });

  if (!slot) {
    return ctx.reply('Нет доступных мест на эту тренировку.');
  }

  try {
    // Создаем бронирование
    await prismaClient.schoolBookings.create({
      data: {
        userId: user.id,
        slotId: slot.id,
        bookingStatus: 'booked',
        createdAt: new Date(),
      },
    });

    // Обновляем количество забронированных слотов
    await prismaClient.schoolTrainingSlots.update({
      where: { id: slot.id },
      data: { reservedSlots: { increment: 1 } },
    });

    ctx.reply(`Тренировка забронирована на ${training.name}.`);
  } catch (error) {
    console.error('Ошибка при бронировании тренировки:', error);
    ctx.reply('Произошла ошибка при бронировании тренировки. Попробуй снова позже.');
  }
});

// Стартуем бота
bot.launch();
*/
