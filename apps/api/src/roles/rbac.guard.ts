import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PermissionEnum } from './permissions.enum';
import { ROLES_KEY } from './roles.decorator';
import { RoleEnum } from './roles.enum';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';

// @Roles: OR logic (any match passes). @Permissions: AND logic (all must match).
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

    const user = context
      .switchToHttp()
      .getRequest<{ user?: JwtPayloadType }>().user;

    if (!user) return false;

    const userRoles = (user.roles ?? []) as RoleEnum[];
    const userPermissions = (user.permissions ?? []) as PermissionEnum[];

    if (roles?.length && !roles.some((role) => userRoles.includes(role))) {
      return false;
    }

    if (
      permissions?.length &&
      !permissions.every((permission) => userPermissions.includes(permission))
    ) {
      return false;
    }

    return true;
  }
}
