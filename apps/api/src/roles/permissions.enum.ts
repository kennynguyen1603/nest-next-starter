export enum PermissionEnum {
  TASK_CREATE = 1,
  TASK_READ = 2,
  TASK_UPDATE = 3,
  TASK_DELETE = 4,
  TASK_ASSIGN = 5,
  CHAT_SEND = 6,
  CHAT_READ = 7,
  PROJECT_CREATE = 8,
  PROJECT_INVITE = 9,
}

export const PERMISSION_NAMES: Record<PermissionEnum, string> = {
  [PermissionEnum.TASK_CREATE]: 'task.create',
  [PermissionEnum.TASK_READ]: 'task.read',
  [PermissionEnum.TASK_UPDATE]: 'task.update',
  [PermissionEnum.TASK_DELETE]: 'task.delete',
  [PermissionEnum.TASK_ASSIGN]: 'task.assign',
  [PermissionEnum.CHAT_SEND]: 'chat.send',
  [PermissionEnum.CHAT_READ]: 'chat.read',
  [PermissionEnum.PROJECT_CREATE]: 'project.create',
  [PermissionEnum.PROJECT_INVITE]: 'project.invite',
};
