import { SetMetadata } from '@nestjs/common';
import { PermissionEnum } from './permissions.enum';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Restricts a route to users whose role grants all of the specified permissions.
 *
 * Permissions are resolved at runtime via `ROLE_PERMISSIONS` map — no DB query.
 * Must be used together with `RbacGuard`.
 *
 * Prefer this over `@Roles` when the access rule is about *what* the user can do
 * rather than *who* the user is.
 *
 * @example
 * Single permission
 * @Permissions(PermissionEnum.READ_USERS)
 * @UseGuards(AuthGuard('jwt'), RbacGuard)
 * @Get()
 * findAll() {}
 *
 * Multiple permissions (AND logic – all must be granted)
 * @Permissions(PermissionEnum.READ_USERS, PermissionEnum.UPDATE_USER)
 * @UseGuards(AuthGuard('jwt'), RbacGuard)
 * @Patch(':id')
 * update() {}
 */
export const Permissions = (...permissions: PermissionEnum[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
