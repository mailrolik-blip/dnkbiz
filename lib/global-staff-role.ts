export const GLOBAL_STAFF_ROLES = ['MANAGER', 'ADMIN'] as const;

export type GlobalStaffRole = (typeof GLOBAL_STAFF_ROLES)[number];

const globalStaffRoleSet = new Set<string>(GLOBAL_STAFF_ROLES);

export const globalStaffRoleLabels: Record<GlobalStaffRole, string> = {
  MANAGER: 'Менеджер',
  ADMIN: 'Администратор',
};

export function hasGlobalStaffRole(
  staffRole: string | null | undefined
): staffRole is GlobalStaffRole {
  return typeof staffRole === 'string' && globalStaffRoleSet.has(staffRole);
}
