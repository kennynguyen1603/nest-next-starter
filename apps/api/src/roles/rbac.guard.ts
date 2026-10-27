import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PermissionEnum } from './permissions.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleEnum } from './roles.enum';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';

interface AccessRequirement {
  roles?: RoleEnum[];
  permissions?: PermissionEnum[];
}

// @Roles: OR logic (any match passes). @Permissions: AND logic (all must match).
// Class- and handler-level metadata are checked independently and BOTH must
// pass, so a handler can only narrow its controller's access, never widen it.
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirements = [context.getClass(), context.getHandler()]
      .map(
        (target): AccessRequirement => ({
          roles: this.reflector.get<RoleEnum[]>(ROLES_KEY, target),
          permissions: this.reflector.get<PermissionEnum[]>(
            PERMISSIONS_KEY,
            target,
          ),
        }),
      )
      .filter(({ roles, permissions }) => roles?.length || permissions?.length);

    if (!requirements.length) {
      return true;
    }

    const user = context
      .switchToHttp()
      .getRequest<{ user?: JwtPayloadType }>().user;

    if (!user) return false;

    return requirements.every((requirement) =>
      this.satisfies(user, requirement),
    );
  }

  private satisfies(
    user: JwtPayloadType,
    { roles, permissions }: AccessRequirement,
  ): boolean {
    const userRoles = user.roles ?? [];
    const userPermissions = user.permissions ?? [];

    if (roles?.length && !roles.some((role) => userRoles.includes(role))) {
      return false;
    }

    return (
      !permissions?.length ||
      permissions.every((permission) => userPermissions.includes(permission))
    );
  }
}
