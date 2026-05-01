/**
 * Defines all granular permissions in the system.
 *
 * Convention: `<action>:<resource>` (e.g. `read:users`, `delete:user`).
 *
 * To add a new permission:
 * 1. Add an entry here.
 * 2. Assign it to the appropriate role(s) in `role-permissions.map.ts`.
 */
export enum PermissionEnum {
  // User management – admin only
  READ_USERS = 'read:users',
  CREATE_USER = 'create:user',
  UPDATE_USER = 'update:user',
  DELETE_USER = 'delete:user',

  // Own profile – all authenticated users
  READ_OWN_PROFILE = 'read:own-profile',
  UPDATE_OWN_PROFILE = 'update:own-profile',
  DELETE_OWN_PROFILE = 'delete:own-profile',
}
