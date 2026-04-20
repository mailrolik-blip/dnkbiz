import type { PrismaClient } from '@prisma/client';

import type { CurrentUser } from './current-user';
import { toCurrentUserSummary } from './current-user';
import { listRentalBookingsForUser } from './rental-bookings';
import { myTrainingBookingParticipantSelect } from './selects';
import { listTeamApplicationsForUser } from './team-applications';
import { listTrainingBookingsForUser } from './training-bookings';

export async function getDashboardForCurrentUser(
  prisma: PrismaClient,
  currentUser: CurrentUser
) {
  const now = new Date();
  const [participants, trainingBookings, teamApplications, rentalBookings] =
    await Promise.all([
      prisma.userProfile.findMany({
        where: {
          userId: currentUser.id,
        },
        select: myTrainingBookingParticipantSelect,
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
      }),
      listTrainingBookingsForUser(prisma, currentUser.id),
      listTeamApplicationsForUser(prisma, currentUser.id),
      listRentalBookingsForUser(prisma, currentUser.id),
    ]);

  return {
    currentUser: toCurrentUserSummary(currentUser),
    participants,
    trainingBookings: trainingBookings
      .filter(
        (booking) =>
          booking.status !== 'cancelled' &&
          booking.training.endTime.getTime() >= now.getTime()
      )
      .slice(0, 5),
    teamApplications: teamApplications
      .filter((application) => application.status !== 'CANCELLED')
      .slice(0, 5),
    rentalBookings: rentalBookings
      .filter(
        (booking) =>
          booking.status !== 'CANCELLED' &&
          booking.slot.endsAt.getTime() >= now.getTime()
      )
      .slice(0, 5),
  };
}
