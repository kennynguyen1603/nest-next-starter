export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'assign'
  | 'send'
  | 'invite';

export type PermissionEntity = 'task' | 'chat' | 'project';

export type PermissionEnum = `${PermissionAction}:${PermissionEntity}`;

export const Permission = {
  TASK_CREATE: 'create:task',
  TASK_READ: 'read:task',
  TASK_UPDATE: 'update:task',
  TASK_DELETE: 'delete:task',
  TASK_ASSIGN: 'assign:task',
  CHAT_SEND: 'send:chat',
  CHAT_READ: 'read:chat',
  PROJECT_CREATE: 'create:project',
  PROJECT_INVITE: 'invite:project',
} as const satisfies Record<string, PermissionEnum>;

// Numeric IDs for relational DB storage — order must stay stable
export const PERMISSION_IDS: Record<string, number> = {
  [Permission.TASK_CREATE]: 1,
  [Permission.TASK_READ]: 2,
  [Permission.TASK_UPDATE]: 3,
  [Permission.TASK_DELETE]: 4,
  [Permission.TASK_ASSIGN]: 5,
  [Permission.CHAT_SEND]: 6,
  [Permission.CHAT_READ]: 7,
  [Permission.PROJECT_CREATE]: 8,
  [Permission.PROJECT_INVITE]: 9,
} as const;
