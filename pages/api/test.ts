// pages/api/test.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Создание пользователя
    const [users, participants, trainings, bookings] = await Promise.all([
      prisma.user.count(),
      prisma.userProfile.count(),
      prisma.schoolTraining.count(),
      prisma.trainingBooking.count(),
    ]);

    return res.status(200).json({
      ok: true,
      stats: {
        users,
        participants,
        trainings,
        bookings,
      },
    });
  } catch {
    return res.status(500).json({ error: 'Database health check failed' });
  }
};

export default handler;
