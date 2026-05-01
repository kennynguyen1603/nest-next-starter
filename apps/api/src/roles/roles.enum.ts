/**
 * Defines all roles in the system.
 *
 * Each value is stored as a string in the database (primary key of the `role` table).
 *
 * To add a new role:
 * 1. Add an entry here.
 * 2. Add its permissions in `role-permissions.map.ts`.
 */
export enum RoleEnum {
  ADMIN = 'admin',
  USER = 'user',
}
