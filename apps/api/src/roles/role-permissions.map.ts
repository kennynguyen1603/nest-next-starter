import { Permission } from './permissions.enum';
import type { PermissionEnum } from './permissions.enum';
import { RoleEnum } from './roles.enum';

export const ROLE_PERMISSIONS: Record<RoleEnum, PermissionEnum[]> = {
  [RoleEnum.ADMIN]: [
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.TASK_ASSIGN,
    Permission.CHAT_SEND,
    Permission.CHAT_READ,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_INVITE,
  ],
  [RoleEnum.MANAGER]: [
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.TASK_ASSIGN,
    Permission.CHAT_SEND,
    Permission.CHAT_READ,
  ],
  [RoleEnum.USER]: [Permission.TASK_CREATE, Permission.CHAT_SEND],
};
