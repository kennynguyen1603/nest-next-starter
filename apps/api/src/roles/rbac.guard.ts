import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PermissionEnum } from './permissions.enum';
import { ROLE_PERMISSIONS } from './role-permissions.map';
import { ROLES_KEY } from './roles.decorator';
import { RoleEnum } from './roles.enum';

/**
 * Unified RBAC guard that enforces both role and permission checks in a single pass.
 *
 * **Evaluation order:**
 * 1. No `@Roles` and no `@Permissions` on the route → allow (public endpoint).
 * 2. User is not authenticated (`request.user` absent) → deny.
 * 3. `@Roles` is present → deny unless `user.role.id` is in the list (OR logic).
 * 4. `@Permissions` is present → deny unless `user.role` has **all** required
 *    permissions according to `ROLE_PERMISSIONS` (AND logic).
 *
 * When both decorators are present, both checks must pass.
 *
 * **Registration:** declare as a provider in the module or globally via `APP_GUARD`.
 *
 * @example
 * Role check – allow only admins
 * @Roles(RoleEnum.ADMIN)
 * @UseGuards(AuthGuard('jwt'), RbacGuard)
 * @Delete(':id')
 * remove() {}
 *
 * Permission check – allow any role that has READ_USERS + UPDATE_USER
 * @Permissions(PermissionEnum.READ_USERS, PermissionEnum.UPDATE_USER)
 * @UseGuards(AuthGuard('jwt'), RbacGuard)
 * @Patch(':id')
 * update() {}
 *
 * // Combined (AND): must be ADMIN AND have DELETE_USER permission
 * @Roles(RoleEnum.ADMIN)
 * @Permissions(PermissionEnum.DELETE_USER)
 * @UseGuards(AuthGuard('jwt'), RbacGuard)
 * @Delete(':id')
 * remove() {}
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<RoleEnum[]>(ROLES_KEY, [
      context.getClass(),
      context.getHandler(),
    ]);
    const permissions = this.reflector.getAllAndOverride<PermissionEnum[]>(
      PERMISSIONS_KEY,
      [context.getClass(), context.getHandler()],
    );

    if (!roles?.length && !permissions?.length) {
      return true;
    }

    const userRole = context
      .switchToHttp()
      .getRequest<{ user?: { role?: { id?: RoleEnum } } }>().user?.role?.id;

    if (!userRole) return false;

    if (roles?.length && !roles.includes(userRole)) {
      return false;
    }

    if (permissions?.length) {
      const userPermissions = ROLE_PERMISSIONS[userRole] ?? [];
      if (!permissions.every((p) => userPermissions.includes(p))) {
        return false;
      }
    }

    return true;
  }
}
