import { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import prisma from '../../../lib/prisma';
import { publicUserSelect } from '../../../lib/selects';

// Валидация через Zod
const userSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(), // Пример проверки для телефона
  telegramId: z.string().regex(/^\d+$/).optional(), // Проверка на цифры
  passwordHash: z.string().min(8).optional(), // Пример для хешированного пароля
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const parsedData = userSchema.safeParse(req.body); // Проверка данных через Zod

      if (!parsedData.success) {
        return res.status(400).json({ error: parsedData.error.issues });
      }

      const { email, phone, telegramId, passwordHash } = parsedData.data;

      // Простой fallback для обязательных полей
      if (!email && !phone && !telegramId) {
        return res.status(400).json({
          error: 'At least one auth field (email, phone, or telegramId) is required'
        });
      }

      const user = await prisma.user.create({
        data: {
          email: email ?? null,
          phone: phone ?? null,
          telegramId: telegramId ?? null,
          passwordHash: passwordHash ?? null,
        },
        select: publicUserSelect,
      });

      return res.status(201).json(user);

    } catch (error) {
      console.error(error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return res.status(409).json({ error: 'User with these credentials already exists' });
      }

      return res.status(500).json({ error: 'Create user failed' });
    }
  }

  if (req.method === 'GET') {
    const users = await prisma.user.findMany({
      select: publicUserSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
    return res.status(200).json(users);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
