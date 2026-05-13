import 'server-only';

import { revalidatePath } from 'next/cache';

export function revalidateAdminPaths(courseSlug?: string) {
  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath('/catalog');
  revalidatePath('/lk');

  if (courseSlug) {
    revalidatePath(`/catalog/${courseSlug}`);
    revalidatePath(`/courses/${courseSlug}`);
  }
}
