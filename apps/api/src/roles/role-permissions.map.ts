import { PermissionEnum } from './permissions.enum';
import { RoleEnum } from './roles.enum';

export const ROLE_PERMISSIONS: Record<RoleEnum, PermissionEnum[]> = {
  [RoleEnum.ADMIN]: [
    PermissionEnum.TASK_CREATE,
    PermissionEnum.TASK_READ,
    PermissionEnum.TASK_UPDATE,
    PermissionEnum.TASK_DELETE,
    PermissionEnum.TASK_ASSIGN,
    PermissionEnum.CHAT_SEND,
    PermissionEnum.CHAT_READ,
    PermissionEnum.PROJECT_CREATE,
    PermissionEnum.PROJECT_INVITE,
  ],
  [RoleEnum.MANAGER]: [
    PermissionEnum.TASK_CREATE,
    PermissionEnum.TASK_READ,
    PermissionEnum.TASK_UPDATE,
    PermissionEnum.TASK_DELETE,
    PermissionEnum.TASK_ASSIGN,
    PermissionEnum.CHAT_SEND,
    PermissionEnum.CHAT_READ,
  ],
  [RoleEnum.USER]: [PermissionEnum.TASK_CREATE, PermissionEnum.CHAT_SEND],
};
