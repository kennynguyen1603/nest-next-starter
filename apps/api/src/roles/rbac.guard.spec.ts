import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Permission, PermissionEnum } from './permissions.enum';
import { RoleEnum } from './roles.enum';
import { RbacGuard } from './rbac.guard';
import { Permissions } from './permissions.decorator';
import { Roles } from '../decorators/roles.decorator';

interface Meta {
  roles?: RoleEnum[];
  permissions?: PermissionEnum[];
}

// Applies the real decorators so the guard is exercised against genuine
// Reflect metadata instead of a mocked Reflector.
function decorated({ roles, permissions }: Meta = {}): () => void {
  const target = () => undefined;
  if (roles) Roles(...roles)(target);
  if (permissions) Permissions(...permissions)(target);
  return target;
}

function makeContext(
  user: object | undefined,
  { handler, cls }: { handler?: Meta; cls?: Meta } = {},
): ExecutionContext {
  const handlerTarget = decorated(handler);
  const classTarget = decorated(cls);
  return {
    getHandler: () => handlerTarget,
    getClass: () => classTarget,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RbacGuard', () => {
  let guard: RbacGuard;

  beforeEach(() => {
    guard = new RbacGuard(new Reflector());
  });

  describe('no restrictions on route', () => {
    it('allows access when no roles or permissions are required', () => {
      expect(guard.canActivate(makeContext(undefined))).toBe(true);
    });

    it('allows access when empty arrays are declared', () => {
      const ctx = makeContext(undefined, {
        handler: { roles: [], permissions: [] },
        cls: { roles: [], permissions: [] },
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('role-based access (OR logic)', () => {
    const handler = { roles: [RoleEnum.ADMIN] };

    it('denies access when role required but no user in request', () => {
      expect(guard.canActivate(makeContext(undefined, { handler }))).toBe(
        false,
      );
    });

    it('allows access when user has the required role', () => {
      const user = { roles: [RoleEnum.ADMIN], permissions: [] };
      expect(guard.canActivate(makeContext(user, { handler }))).toBe(true);
    });

    it('denies access when user lacks the required role', () => {
      const user = { roles: [RoleEnum.USER], permissions: [] };
      expect(guard.canActivate(makeContext(user, { handler }))).toBe(false);
    });

    it('uses OR logic — any one matching role grants access', () => {
      const user = { roles: [RoleEnum.MANAGER], permissions: [] };
      const ctx = makeContext(user, {
        handler: { roles: [RoleEnum.ADMIN, RoleEnum.MANAGER] },
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows access when user has multiple roles and one matches', () => {
      const user = { roles: [RoleEnum.USER, RoleEnum.ADMIN], permissions: [] };
      expect(guard.canActivate(makeContext(user, { handler }))).toBe(true);
    });

    it('denies access when the token carries no roles claim', () => {
      expect(guard.canActivate(makeContext({}, { handler }))).toBe(false);
    });
  });

  describe('permission-based access (AND logic)', () => {
    const handler = {
      permissions: [Permission.TASK_CREATE, Permission.TASK_READ],
    };

    it('denies access when permission required but no user in request', () => {
      expect(guard.canActivate(makeContext(undefined, { handler }))).toBe(
        false,
      );
    });

    it('allows access when user has all required permissions', () => {
      const user = {
        roles: [],
        permissions: [Permission.TASK_CREATE, Permission.TASK_READ],
      };
      expect(guard.canActivate(makeContext(user, { handler }))).toBe(true);
    });

    it('denies access when user is missing one required permission', () => {
      const user = { roles: [], permissions: [Permission.TASK_CREATE] };
      expect(guard.canActivate(makeContext(user, { handler }))).toBe(false);
    });

    it('denies access when user has no permissions at all', () => {
      const user = { roles: [], permissions: [] };
      expect(guard.canActivate(makeContext(user, { handler }))).toBe(false);
    });
  });

  describe('combined roles + permissions', () => {
    const handler = {
      roles: [RoleEnum.ADMIN],
      permissions: [Permission.TASK_CREATE],
    };

    it('allows access when both roles and permissions match', () => {
      const user = {
        roles: [RoleEnum.ADMIN],
        permissions: [Permission.TASK_CREATE],
      };
      expect(guard.canActivate(makeContext(user, { handler }))).toBe(true);
    });

    it('denies access when role matches but permission missing', () => {
      const user = { roles: [RoleEnum.ADMIN], permissions: [] };
      expect(guard.canActivate(makeContext(user, { handler }))).toBe(false);
    });

    it('denies access when permission matches but role missing', () => {
      const user = {
        roles: [RoleEnum.USER],
        permissions: [Permission.TASK_CREATE],
      };
      expect(guard.canActivate(makeContext(user, { handler }))).toBe(false);
    });
  });

  describe('class- and handler-level metadata', () => {
    const admin = { roles: [RoleEnum.ADMIN], permissions: [] };
    const plainUser = { roles: [RoleEnum.USER], permissions: [] };

    it('applies class-level roles to handlers without their own metadata', () => {
      const cls = { roles: [RoleEnum.ADMIN] };
      expect(guard.canActivate(makeContext(admin, { cls }))).toBe(true);
      expect(guard.canActivate(makeContext(plainUser, { cls }))).toBe(false);
    });

    it('does not let a handler widen access granted by the class', () => {
      const ctx = makeContext(plainUser, {
        cls: { roles: [RoleEnum.ADMIN] },
        handler: { roles: [RoleEnum.USER] },
      });
      expect(guard.canActivate(ctx)).toBe(false);
    });

    it('lets a handler narrow access granted by the class', () => {
      const cls = { roles: [RoleEnum.ADMIN, RoleEnum.MANAGER] };
      const handler = { roles: [RoleEnum.ADMIN] };
      const manager = { roles: [RoleEnum.MANAGER], permissions: [] };
      expect(guard.canActivate(makeContext(admin, { cls, handler }))).toBe(
        true,
      );
      expect(guard.canActivate(makeContext(manager, { cls, handler }))).toBe(
        false,
      );
    });

    it('requires class permissions and handler permissions together', () => {
      const cls = { permissions: [Permission.TASK_READ] };
      const handler = { permissions: [Permission.TASK_DELETE] };
      const onlyDelete = { roles: [], permissions: [Permission.TASK_DELETE] };
      const both = {
        roles: [],
        permissions: [Permission.TASK_READ, Permission.TASK_DELETE],
      };
      expect(guard.canActivate(makeContext(onlyDelete, { cls, handler }))).toBe(
        false,
      );
      expect(guard.canActivate(makeContext(both, { cls, handler }))).toBe(true);
    });
  });
});
