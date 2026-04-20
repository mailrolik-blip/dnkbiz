import { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../../lib/prisma';
import { teamSelect } from '../../../lib/selects';

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
      const cityId =
        req.body.cityId === undefined || req.body.cityId === null || req.body.cityId === ''
          ? null
          : toPositiveInt(req.body.cityId);

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      if (cityId === null && req.body.cityId) {
        return res.status(400).json({ error: 'cityId must be a positive integer' });
      }

      if (cityId) {
        const city = await prisma.city.findUnique({
          where: { id: cityId },
          select: { id: true },
        });

        if (!city) {
          return res.status(404).json({ error: 'City not found' });
        }
      }

      const team = await prisma.team.create({
        data: {
          name,
          ...(cityId
            ? {
                city: {
                  connect: { id: cityId },
                },
              }
            : {}),
        },
        select: teamSelect,
      });

      return res.status(201).json(team);
    } catch (error) {
      console.error(error);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        return res.status(400).json({ error: 'Invalid relation provided' });
      }

      return res.status(500).json({ error: 'Create team failed' });
    }
  }

  if (req.method === 'GET') {
    const teams = await prisma.team.findMany({
      select: teamSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json(teams);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/*
// pages/api/teams/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      console.log('BODY:', req.body);
      const { name, cityId } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name required' });
      }

      const team = await prisma.team.create({
        data: {
          name,
          cityId: cityId ? Number(cityId) : null,
        },
      });

      return res.status(201).json(team);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Create team failed' });
    }
  }

  if (req.method === 'GET') {
    const teams = await prisma.team.findMany();
    return res.json(teams);
  }

  return res.status(405).end();
}
*/
