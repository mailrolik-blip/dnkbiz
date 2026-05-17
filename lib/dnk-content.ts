import { accountingCoursePublicProfile } from '@/lib/course-content/1c-accounting-83.js';

export type ProgramItem = {
  title: string;
  price: number;
};

export const dnkFeaturedPrograms: ProgramItem[] = [
  { title: 'IT менеджмент', price: 25000 },
  { title: accountingCoursePublicProfile.title, price: 12000 },
  { title: 'Пожарная безопасность', price: 14000 },
  { title: 'Охрана труда', price: 5000 },
];
