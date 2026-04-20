export type RouteAccessUser = {
  staffRole: string | null;
  roles: string[];
};

export type PlatformRole = 'USER' | 'TRAINER' | 'MANAGER' | 'ADMIN';
export type CapabilityScope = 'none' | 'own' | 'all';
export type AdminAccessLevel = 'none' | 'trainer' | 'manager' | 'admin';
export type CabinetViewMode = 'primary' | 'secondary';
export type AdminWorkspaceSectionId =
  | 'teams'
  | 'teamApplications'
  | 'trainings'
  | 'rentals';

export type RoleCapabilityRow = {
  id:
    | 'cabinetAccess'
    | 'adminAccess'
    | 'teams'
    | 'teamApplications'
    | 'trainings'
    | 'rentals'
    | 'usersAndRoles'
    | 'clients'
    | 'ownData'
    | 'ownBookings';
  label: string;
  value: string;
  detail: string;
  tone: 'neutral' | 'success' | 'muted';
};

export type AdminWorkspaceSection = {
  id: AdminWorkspaceSectionId;
  label: string;
  description: string;
};

export type RoleCapabilities = {
  role: PlatformRole;
  roleLabel: string;
  accessBadge: PlatformRole;
  isUser: boolean;
  isTrainer: boolean;
  isManager: boolean;
  isAdmin: boolean;
  canAccessCabinet: boolean;
  canAccessAdminWorkspace: boolean;
  adminAccessLevel: AdminAccessLevel;
  adminAccessLabel: string;
  primaryEntryPath: typeof DEFAULT_ENTRY_PATH | typeof ADMIN_WORKSPACE_PATH;
  cabinetViewMode: CabinetViewMode;
  teamManagementScope: CapabilityScope;
  teamApplicationReviewScope: CapabilityScope;
  trainingManagementScope: CapabilityScope;
  rentalManagementScope: CapabilityScope;
  userRoleManagementScope: CapabilityScope;
  clientVisibilityScope: CapabilityScope;
  canEditOwnData: boolean;
  canEditOwnBookings: boolean;
  cabinetDescription: string;
  adminDescription: string | null;
  allowedActions: string[];
  restrictedActions: string[];
  visibleAdminSections: AdminWorkspaceSectionId[];
};

export const DEFAULT_ENTRY_PATH = '/cabinet';
export const ADMIN_WORKSPACE_PATH = '/admin';

type RoleDefinition = Omit<
  RoleCapabilities,
  | 'isUser'
  | 'isTrainer'
  | 'isManager'
  | 'isAdmin'
  | 'canAccessCabinet'
  | 'canAccessAdminWorkspace'
  | 'primaryEntryPath'
  | 'cabinetViewMode'
>;

const adminWorkspaceSections: Record<AdminWorkspaceSectionId, AdminWorkspaceSection> =
  {
    teams: {
      id: 'teams',
      label: 'Команды',
      description: 'Командный контур и состав площадок по городам.',
    },
    teamApplications: {
      id: 'teamApplications',
      label: 'Заявки в команду',
      description: 'Входящий поток заявок и их текущие статусы.',
    },
    trainings: {
      id: 'trainings',
      label: 'Тренировки',
      description: 'Тренировочный календарь и нагрузка по staff-контуру.',
    },
    rentals: {
      id: 'rentals',
      label: 'Аренда',
      description: 'Слоты, ресурсы, площадки и бронирования аренды.',
    },
  };

const roleDefinitions: Record<PlatformRole, RoleDefinition> = {
  USER: {
    role: 'USER',
    roleLabel: 'Пользователь',
    accessBadge: 'USER',
    adminAccessLevel: 'none',
    adminAccessLabel: 'Staff workspace недоступен',
    teamManagementScope: 'none',
    teamApplicationReviewScope: 'none',
    trainingManagementScope: 'none',
    rentalManagementScope: 'none',
    userRoleManagementScope: 'none',
    clientVisibilityScope: 'own',
    canEditOwnData: true,
    canEditOwnBookings: true,
    cabinetDescription:
      'Основной кабинет пользователя: свои участники, записи на тренировки, заявки в команду и бронирования аренды.',
    adminDescription: null,
    allowedActions: [
      'Видит только свои данные, своих участников и собственные пользовательские сценарии.',
      'Редактирует только свои данные, свои заявки и свои бронирования в рамках user-flow.',
    ],
    restrictedActions: [
      'Не имеет доступа к /admin и staff-обзору платформы.',
      'Не управляет командами, staff-заявками, тренировками, арендой и ролями пользователей.',
    ],
    visibleAdminSections: [],
  },
  TRAINER: {
    role: 'TRAINER',
    roleLabel: 'Тренер',
    accessBadge: 'TRAINER',
    adminAccessLevel: 'trainer',
    adminAccessLabel: 'Тренерский staff-доступ',
    teamManagementScope: 'none',
    teamApplicationReviewScope: 'own',
    trainingManagementScope: 'own',
    rentalManagementScope: 'none',
    userRoleManagementScope: 'none',
    clientVisibilityScope: 'own',
    canEditOwnData: true,
    canEditOwnBookings: true,
    cabinetDescription:
      'Пользовательский кабинет остаётся доступным как вторичный self-service экран. Основная рабочая зона тренера находится в /admin.',
    adminDescription:
      'TRAINER использует /admin как ограниченный staff workspace: только свои тренировки и заявки по закреплённым командам.',
    allowedActions: [
      'Видит и сопровождает заявки только по своим coached teams.',
      'Работает только со своими тренировками и своим тренерским контуром.',
      'Открывает /cabinet только как secondary-view для проверки пользовательского сценария.',
    ],
    restrictedActions: [
      'Не управляет глобальным списком команд и арендой платформы.',
      'Не управляет ролями пользователей и staff-доступом.',
    ],
    visibleAdminSections: ['teamApplications', 'trainings'],
  },
  MANAGER: {
    role: 'MANAGER',
    roleLabel: 'Менеджер',
    accessBadge: 'MANAGER',
    adminAccessLevel: 'manager',
    adminAccessLabel: 'Manager-level staff-доступ',
    teamManagementScope: 'all',
    teamApplicationReviewScope: 'all',
    trainingManagementScope: 'all',
    rentalManagementScope: 'all',
    userRoleManagementScope: 'none',
    clientVisibilityScope: 'all',
    canEditOwnData: true,
    canEditOwnBookings: true,
    cabinetDescription:
      'Пользовательский кабинет доступен только как вторичный вид. Основной рабочий вход менеджера находится в /admin.',
    adminDescription:
      'MANAGER использует /admin как основной staff workspace для операционного обзора команд, заявок, тренировок и аренды.',
    allowedActions: [
      'Видит весь операционный staff-контур по командам, заявкам, тренировкам и аренде.',
      'Работает в /admin как в основной точке входа без переключения через user landing.',
      'Проверяет /cabinet только как вторичный пользовательский сценарий.',
    ],
    restrictedActions: [
      'Не управляет матрицей пользователей и ролей на уровне ADMIN.',
      'Системные admin-настройки и полный контроль ролей зарезервированы для ADMIN.',
    ],
    visibleAdminSections: ['teams', 'teamApplications', 'trainings', 'rentals'],
  },
  ADMIN: {
    role: 'ADMIN',
    roleLabel: 'Администратор',
    accessBadge: 'ADMIN',
    adminAccessLevel: 'admin',
    adminAccessLabel: 'Полный admin-доступ',
    teamManagementScope: 'all',
    teamApplicationReviewScope: 'all',
    trainingManagementScope: 'all',
    rentalManagementScope: 'all',
    userRoleManagementScope: 'all',
    clientVisibilityScope: 'all',
    canEditOwnData: true,
    canEditOwnBookings: true,
    cabinetDescription:
      'Пользовательский кабинет доступен как secondary-view. Основной административный вход находится в /admin.',
    adminDescription:
      'ADMIN использует /admin как основной workspace и видит весь текущий operational overview платформы с foundation под управление ролями.',
    allowedActions: [
      'Видит весь staff/admin обзор по командам, заявкам, тренировкам и аренде.',
      'Имеет foundation для будущего полного управления пользователями и ролями.',
      'Открывает /cabinet только для проверки пользовательских сценариев.',
    ],
    restrictedActions: [],
    visibleAdminSections: ['teams', 'teamApplications', 'trainings', 'rentals'],
  },
};

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function getSafeUrl(requestedPath: string | null | undefined) {
  if (typeof requestedPath !== 'string') {
    return null;
  }

  const trimmedPath = requestedPath.trim();

  if (!trimmedPath.startsWith('/') || trimmedPath.startsWith('//')) {
    return null;
  }

  try {
    return new URL(trimmedPath, 'http://gorilla.local');
  } catch {
    return null;
  }
}

function getAppBasePath(requestedPath: string | null | undefined) {
  const url = getSafeUrl(requestedPath);

  if (!url) {
    return null;
  }

  const pathname = normalizePathname(url.pathname);

  if (pathname !== DEFAULT_ENTRY_PATH && pathname !== ADMIN_WORKSPACE_PATH) {
    return null;
  }

  return pathname;
}

export function getPlatformRole(
  currentUser: RouteAccessUser | null | undefined
): PlatformRole {
  const roles = new Set(currentUser?.roles ?? []);
  const staffRole = currentUser?.staffRole ?? null;

  if (staffRole === 'ADMIN') {
    return 'ADMIN';
  }

  if (staffRole === 'MANAGER') {
    return 'MANAGER';
  }

  if (roles.has('COACH') || roles.has('TRAINER')) {
    return 'TRAINER';
  }

  return 'USER';
}

export function getRoleCapabilities(
  currentUser: RouteAccessUser | null | undefined
): RoleCapabilities {
  const role = getPlatformRole(currentUser);
  const definition = roleDefinitions[role];
  const canAccessAdminWorkspace =
    Boolean(currentUser) && definition.adminAccessLevel !== 'none';
  const primaryEntryPath = canAccessAdminWorkspace
    ? ADMIN_WORKSPACE_PATH
    : DEFAULT_ENTRY_PATH;

  return {
    ...definition,
    isUser: role === 'USER',
    isTrainer: role === 'TRAINER',
    isManager: role === 'MANAGER',
    isAdmin: role === 'ADMIN',
    canAccessCabinet: Boolean(currentUser),
    canAccessAdminWorkspace,
    primaryEntryPath,
    cabinetViewMode: canAccessAdminWorkspace ? 'secondary' : 'primary',
  };
}

function getScopeValueLabel(scope: CapabilityScope) {
  switch (scope) {
    case 'own':
      return 'Только свои';
    case 'all':
      return 'Все данные';
    default:
      return 'Запрещено';
  }
}

function getScopeTone(scope: CapabilityScope): RoleCapabilityRow['tone'] {
  switch (scope) {
    case 'all':
      return 'success';
    case 'own':
      return 'neutral';
    default:
      return 'muted';
  }
}

export function getRoleCapabilityRows(
  capabilities: RoleCapabilities
): RoleCapabilityRow[] {
  return [
    {
      id: 'cabinetAccess',
      label: 'Доступ к /cabinet',
      value:
        capabilities.cabinetViewMode === 'primary'
          ? 'Основной вход'
          : 'Вторичный вид',
      detail: capabilities.cabinetDescription,
      tone:
        capabilities.cabinetViewMode === 'primary' ? 'success' : 'neutral',
    },
    {
      id: 'adminAccess',
      label: 'Доступ к /admin',
      value: capabilities.canAccessAdminWorkspace
        ? capabilities.adminAccessLabel
        : 'Нет доступа',
      detail:
        capabilities.adminDescription ??
        'Staff workspace недоступен для этой роли.',
      tone: capabilities.canAccessAdminWorkspace ? 'success' : 'muted',
    },
    {
      id: 'teams',
      label: 'Управление командами',
      value: getScopeValueLabel(capabilities.teamManagementScope),
      detail:
        capabilities.teamManagementScope === 'all'
          ? 'Разрешён глобальный командный контур платформы.'
          : capabilities.teamManagementScope === 'own'
            ? 'Доступен только свой командный контур.'
            : 'Глобальное управление командами этой роли недоступно.',
      tone: getScopeTone(capabilities.teamManagementScope),
    },
    {
      id: 'teamApplications',
      label: 'Разбор заявок в команду',
      value: getScopeValueLabel(capabilities.teamApplicationReviewScope),
      detail:
        capabilities.teamApplicationReviewScope === 'all'
          ? 'Видны и доступны к обработке все staff-заявки.'
          : capabilities.teamApplicationReviewScope === 'own'
            ? 'Видны только заявки по закреплённым тренерским командам.'
            : 'Рассмотрение staff-заявок недоступно.',
      tone: getScopeTone(capabilities.teamApplicationReviewScope),
    },
    {
      id: 'trainings',
      label: 'Управление тренировками',
      value: getScopeValueLabel(capabilities.trainingManagementScope),
      detail:
        capabilities.trainingManagementScope === 'all'
          ? 'Доступен весь тренировочный контур платформы.'
          : capabilities.trainingManagementScope === 'own'
            ? 'Доступны только свои тренировки.'
            : 'Управление тренировками недоступно.',
      tone: getScopeTone(capabilities.trainingManagementScope),
    },
    {
      id: 'rentals',
      label: 'Управление арендой',
      value: getScopeValueLabel(capabilities.rentalManagementScope),
      detail:
        capabilities.rentalManagementScope === 'all'
          ? 'Доступны staff-сводка и управление арендами.'
          : capabilities.rentalManagementScope === 'own'
            ? 'Доступен только свой арендный контур.'
            : 'Staff-управление арендой недоступно.',
      tone: getScopeTone(capabilities.rentalManagementScope),
    },
    {
      id: 'usersAndRoles',
      label: 'Пользователи и роли',
      value: getScopeValueLabel(capabilities.userRoleManagementScope),
      detail:
        capabilities.userRoleManagementScope === 'all'
          ? 'Foundation под полный контроль пользователей и ролей открыт.'
          : 'Управление ролями и staff-доступом этой роли недоступно.',
      tone: getScopeTone(capabilities.userRoleManagementScope),
    },
    {
      id: 'clients',
      label: 'Клиенты / участники',
      value: getScopeValueLabel(capabilities.clientVisibilityScope),
      detail:
        capabilities.clientVisibilityScope === 'all'
          ? 'Виден весь клиентский контур платформы.'
          : capabilities.clientVisibilityScope === 'own'
            ? 'Видны только свои участники и свой клиентский контур.'
            : 'Доступ к клиентскому staff-контуру отсутствует.',
      tone: getScopeTone(capabilities.clientVisibilityScope),
    },
    {
      id: 'ownData',
      label: 'Редактирование своих данных',
      value: capabilities.canEditOwnData ? 'Разрешено' : 'Запрещено',
      detail: capabilities.canEditOwnData
        ? 'Можно редактировать только собственные пользовательские данные.'
        : 'Редактирование собственных данных отключено.',
      tone: capabilities.canEditOwnData ? 'success' : 'muted',
    },
    {
      id: 'ownBookings',
      label: 'Свои бронирования и заявки',
      value: capabilities.canEditOwnBookings ? 'Разрешено' : 'Запрещено',
      detail: capabilities.canEditOwnBookings
        ? 'Можно работать только со своими бронированиями, заявками и user-self-service сценариями.'
        : 'Собственные бронирования и заявки недоступны для изменения.',
      tone: capabilities.canEditOwnBookings ? 'success' : 'muted',
    },
  ];
}

export function getVisibleAdminSections(capabilities: RoleCapabilities) {
  return capabilities.visibleAdminSections.map(
    (sectionId) => adminWorkspaceSections[sectionId]
  );
}

export function sanitizeRequestedAppPath(requestedPath: string | null | undefined) {
  const url = getSafeUrl(requestedPath);

  if (!url) {
    return null;
  }

  const pathname = normalizePathname(url.pathname);

  if (pathname !== DEFAULT_ENTRY_PATH && pathname !== ADMIN_WORKSPACE_PATH) {
    return null;
  }

  return `${pathname}${url.search}${url.hash}`;
}

export function getPrimaryAppPath(
  currentUser: RouteAccessUser | null | undefined
) {
  return getRoleCapabilities(currentUser).primaryEntryPath;
}

export function canAccessAppPath(
  currentUser: RouteAccessUser | null | undefined,
  requestedPath: string | null | undefined
) {
  const capabilities = getRoleCapabilities(currentUser);
  const basePath = getAppBasePath(requestedPath);

  if (!basePath) {
    return false;
  }

  if (basePath === ADMIN_WORKSPACE_PATH) {
    return capabilities.canAccessAdminWorkspace;
  }

  if (basePath === DEFAULT_ENTRY_PATH) {
    return capabilities.canAccessCabinet;
  }

  return false;
}

export function resolveAuthorizedAppPath(
  currentUser: RouteAccessUser | null | undefined,
  requestedPath: string | null | undefined
) {
  const primaryEntryPath = getPrimaryAppPath(currentUser);
  const safePath = sanitizeRequestedAppPath(requestedPath);

  if (!safePath) {
    return primaryEntryPath;
  }

  if (!canAccessAppPath(currentUser, safePath)) {
    return primaryEntryPath;
  }

  return safePath;
}
