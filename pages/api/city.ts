// pages/api/city.ts
import { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../lib/prisma';
import { publicCitySelect } from '../../lib/selects';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    // Создание нового города
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

    if (!name) {
      return res.status(400).json({ error: 'City name is required' });
    }

    try {
      const newCity = await prisma.city.create({
        data: { name },
        select: publicCitySelect,
      });
      return res.status(201).json(newCity);
    } catch (error) {
      console.error(error);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return res.status(409).json({ error: 'City already exists' });
      }

      return res.status(500).json({ error: 'Error creating city' });
    }
  }

  if (req.method === 'GET') {
    // Получение всех городов
    try {
      const cities = await prisma.city.findMany({
        select: publicCitySelect,
        orderBy: {
          name: 'asc',
        },
      });
      return res.status(200).json(cities);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error retrieving cities' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
