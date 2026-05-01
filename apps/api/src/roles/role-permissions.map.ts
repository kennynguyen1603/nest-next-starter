import { PermissionEnum } from './permissions.enum';
import { RoleEnum } from './roles.enum';

/**
 * Maps each role to the set of permissions it grants.
 *
 * This is the single source of truth for the RBAC policy.
 * `RbacGuard` resolves permissions at runtime through this map —
 * no database query is needed.
 *
 * ---
 * **To add a new role:** add an entry keyed by the new `RoleEnum` value.
 *
 * **To add a new permission to an existing role:** append the `PermissionEnum`
 * value to the corresponding array.
 *
 * Example
 * Grant a new MODERATOR role with limited write access:
 * [RoleEnum.MODERATOR]: [
 *   PermissionEnum.READ_USERS,
 *   PermissionEnum.UPDATE_USER,
 *   PermissionEnum.READ_OWN_PROFILE,
 *   PermissionEnum.UPDATE_OWN_PROFILE,
 * ]
 */
export const ROLE_PERMISSIONS: Record<RoleEnum, PermissionEnum[]> = {
  [RoleEnum.ADMIN]: Object.values(PermissionEnum),
  [RoleEnum.USER]: [
    PermissionEnum.READ_OWN_PROFILE,
    PermissionEnum.UPDATE_OWN_PROFILE,
    PermissionEnum.DELETE_OWN_PROFILE,
  ],
};
