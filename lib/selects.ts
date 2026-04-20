import type { Prisma, RentalBookingStatus } from '@prisma/client';

export const publicUserSelect = {
  id: true,
  email: true,
  phone: true,
  telegramId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const publicCitySelect = {
  id: true,
  name: true,
} satisfies Prisma.CitySelect;

export const currentUserProfileSelect = {
  id: true,
  profileType: true,
  firstName: true,
  lastName: true,
  birthDate: true,
  createdAt: true,
  updatedAt: true,
  city: {
    select: publicCitySelect,
  },
} satisfies Prisma.UserProfileSelect;

export const currentUserSelect = {
  id: true,
  email: true,
  phone: true,
  telegramId: true,
  staffRole: true,
  createdAt: true,
  updatedAt: true,
  profiles: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: 1,
    select: currentUserProfileSelect,
  },
  memberships: {
    where: {
      role: 'COACH',
    },
    select: {
      teamId: true,
    },
  },
} satisfies Prisma.UserSelect;

const participantRelationSelect = {
  id: true,
  userId: true,
  profileType: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserProfileSelect;

export const participantSummarySelect = {
  ...participantRelationSelect,
  birthDate: true,
  parentId: true,
  cityId: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: publicUserSelect,
  },
  city: {
    select: publicCitySelect,
  },
} satisfies Prisma.UserProfileSelect;

export const participantDetailSelect = {
  ...participantSummarySelect,
  parent: {
    select: participantRelationSelect,
  },
  children: {
    select: participantRelationSelect,
  },
} satisfies Prisma.UserProfileSelect;

export const teamSelect = {
  id: true,
  name: true,
  cityId: true,
  createdAt: true,
  updatedAt: true,
  city: {
    select: publicCitySelect,
  },
  _count: {
    select: {
      members: true,
    },
  },
} satisfies Prisma.TeamSelect;

export const adminTeamSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  city: {
    select: publicCitySelect,
  },
} satisfies Prisma.TeamSelect;

export const trainingSelect = {
  trainingId: true,
  name: true,
  description: true,
  trainingType: true,
  cityId: true,
  trainerId: true,
  startTime: true,
  endTime: true,
  location: true,
  capacity: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  city: {
    select: publicCitySelect,
  },
  trainer: {
    select: publicUserSelect,
  },
  _count: {
    select: {
      bookings: true,
    },
  },
} satisfies Prisma.SchoolTrainingSelect;

export const staffTrainingSelect = {
  trainingId: true,
  name: true,
  trainingType: true,
  capacity: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  city: {
    select: publicCitySelect,
  },
  trainer: {
    select: publicUserSelect,
  },
} satisfies Prisma.SchoolTrainingSelect;

export const trainingBookingInclude = {
  participant: {
    select: participantSummarySelect,
  },
  training: {
    select: trainingSelect,
  },
} satisfies Prisma.TrainingBookingInclude;

export const myTrainingBookingParticipantSelect = {
  id: true,
  profileType: true,
  firstName: true,
  lastName: true,
  birthDate: true,
  cityId: true,
  createdAt: true,
  updatedAt: true,
  city: {
    select: publicCitySelect,
  },
} satisfies Prisma.UserProfileSelect;

export const myTrainingBookingTrainingSelect = {
  trainingId: true,
  name: true,
  description: true,
  trainingType: true,
  cityId: true,
  trainerId: true,
  startTime: true,
  endTime: true,
  location: true,
  capacity: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  city: {
    select: publicCitySelect,
  },
} satisfies Prisma.SchoolTrainingSelect;

export const myTrainingBookingInclude = {
  participant: {
    select: myTrainingBookingParticipantSelect,
  },
  training: {
    select: myTrainingBookingTrainingSelect,
  },
} satisfies Prisma.TrainingBookingInclude;

export const teamApplicationParticipantSelect = {
  id: true,
  profileType: true,
  firstName: true,
  lastName: true,
  birthDate: true,
  cityId: true,
  createdAt: true,
  updatedAt: true,
  city: {
    select: publicCitySelect,
  },
} satisfies Prisma.UserProfileSelect;

export const teamApplicationTeamSelect = {
  id: true,
  name: true,
  cityId: true,
  createdAt: true,
  updatedAt: true,
  city: {
    select: publicCitySelect,
  },
} satisfies Prisma.TeamSelect;

export const myTeamApplicationSelect = {
  id: true,
  status: true,
  commentFromApplicant: true,
  createdAt: true,
  updatedAt: true,
  participant: {
    select: teamApplicationParticipantSelect,
  },
  team: {
    select: teamApplicationTeamSelect,
  },
} satisfies Prisma.TeamApplicationSelect;

export const staffTeamApplicationSelect = {
  id: true,
  status: true,
  commentFromApplicant: true,
  internalNote: true,
  createdAt: true,
  updatedAt: true,
  participant: {
    select: teamApplicationParticipantSelect,
  },
  team: {
    select: teamApplicationTeamSelect,
  },
} satisfies Prisma.TeamApplicationSelect;

export const adminTeamApplicationSelect = {
  id: true,
  status: true,
  commentFromApplicant: true,
  internalNote: true,
  createdAt: true,
  updatedAt: true,
  participant: {
    select: teamApplicationParticipantSelect,
  },
  team: {
    select: adminTeamSelect,
  },
  reviewedBy: {
    select: publicUserSelect,
  },
} satisfies Prisma.TeamApplicationSelect;

export const staffTeamMemberParticipantSelect = {
  id: true,
  profileType: true,
  firstName: true,
  lastName: true,
  birthDate: true,
  cityId: true,
  createdAt: true,
  updatedAt: true,
  city: {
    select: publicCitySelect,
  },
} satisfies Prisma.UserProfileSelect;

export const staffTeamMemberSelect = {
  id: true,
  status: true,
  positionCode: true,
  jerseyNumber: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
  team: {
    select: teamApplicationTeamSelect,
  },
  participant: {
    select: staffTeamMemberParticipantSelect,
  },
} satisfies Prisma.TeamMemberSelect;

export const rentalResourceSummarySelect = {
  id: true,
  name: true,
  resourceType: true,
} satisfies Prisma.RentalResourceSelect;

export const rentalFacilitySummarySelect = {
  id: true,
  name: true,
} satisfies Prisma.RentalFacilitySelect;

export const staffRentalFacilitySelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  city: {
    select: publicCitySelect,
  },
} satisfies Prisma.RentalFacilitySelect;

export const staffRentalResourceFacilitySelect = {
  id: true,
  name: true,
  city: {
    select: publicCitySelect,
  },
} satisfies Prisma.RentalFacilitySelect;

export const staffRentalResourceSelect = {
  id: true,
  name: true,
  resourceType: true,
  createdAt: true,
  updatedAt: true,
  facility: {
    select: staffRentalResourceFacilitySelect,
  },
} satisfies Prisma.RentalResourceSelect;

export const publicRentalSlotSelect = {
  id: true,
  startsAt: true,
  endsAt: true,
  status: true,
  resource: {
    select: {
      ...rentalResourceSummarySelect,
      facility: {
        select: {
          ...rentalFacilitySummarySelect,
          city: {
            select: publicCitySelect,
          },
        },
      },
    },
  },
} satisfies Prisma.RentalSlotSelect;

export const myRentalBookingSelect = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  participant: {
    select: myTrainingBookingParticipantSelect,
  },
  slot: {
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      resource: {
        select: {
          ...rentalResourceSummarySelect,
          facility: {
            select: {
              ...rentalFacilitySummarySelect,
              city: {
                select: publicCitySelect,
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.RentalBookingSelect;

export const staffRentalBookingParticipantSelect = {
  id: true,
  profileType: true,
  firstName: true,
  lastName: true,
  birthDate: true,
  cityId: true,
  createdAt: true,
  updatedAt: true,
  city: {
    select: publicCitySelect,
  },
} satisfies Prisma.UserProfileSelect;

const activeRentalBookingStatuses: RentalBookingStatus[] = [
  'PENDING_CONFIRMATION',
  'CONFIRMED',
];

export const staffRentalSlotActiveBookingSummarySelect = {
  id: true,
  participantId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: publicUserSelect,
  },
  participant: {
    select: staffRentalBookingParticipantSelect,
  },
} satisfies Prisma.RentalBookingSelect;

export const staffRentalSlotSelect = {
  id: true,
  status: true,
  startsAt: true,
  endsAt: true,
  isPublic: true,
  resource: {
    select: {
      ...rentalResourceSummarySelect,
      facility: {
        select: {
          ...rentalFacilitySummarySelect,
          city: {
            select: publicCitySelect,
          },
        },
      },
    },
  },
  bookings: {
    where: {
      status: {
        in: activeRentalBookingStatuses,
      },
    },
    orderBy: [
      {
        createdAt: 'desc',
      },
      {
        id: 'desc',
      },
    ],
    take: 1,
    select: staffRentalSlotActiveBookingSummarySelect,
  },
} satisfies Prisma.RentalSlotSelect;

export const staffRentalBookingSelect = {
  id: true,
  status: true,
  participantId: true,
  noteFromUser: true,
  managerNote: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: publicUserSelect,
  },
  participant: {
    select: staffRentalBookingParticipantSelect,
  },
  slot: {
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      isPublic: true,
      resource: {
        select: {
          ...rentalResourceSummarySelect,
          facility: {
            select: {
              ...rentalFacilitySummarySelect,
              city: {
                select: publicCitySelect,
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.RentalBookingSelect;

export const teamApplicationInclude = {
  participant: {
    select: teamApplicationParticipantSelect,
  },
  team: {
    select: teamApplicationTeamSelect,
  },
} satisfies Prisma.TeamApplicationInclude;
