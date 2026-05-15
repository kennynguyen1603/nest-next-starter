import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Permission, PermissionEnum } from './permissions.enum';
import { RoleEnum } from './roles.enum';
import { RbacGuard } from './rbac.guard';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

function makeContext(user?: object): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RbacGuard', () => {
  let guard: RbacGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RbacGuard(reflector);
  });

  function mockMeta(roles?: RoleEnum[], permissions?: PermissionEnum[]) {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: unknown) => {
        if (key === ROLES_KEY) return roles;
        if (key === PERMISSIONS_KEY) return permissions;
        return undefined;
      });
  }

  describe('no restrictions on route', () => {
    it('allows access when no roles or permissions are required', () => {
      mockMeta(undefined, undefined);
      expect(guard.canActivate(makeContext())).toBe(true);
    });

    it('allows access when empty arrays are returned', () => {
      mockMeta([], []);
      expect(guard.canActivate(makeContext())).toBe(true);
    });
  });

  describe('role-based access (OR logic)', () => {
    it('denies access when role required but no user in request', () => {
      mockMeta([RoleEnum.ADMIN]);
      expect(guard.canActivate(makeContext(undefined))).toBe(false);
    });

    it('allows access when user has the required role', () => {
      mockMeta([RoleEnum.ADMIN]);
      const user = { roles: [RoleEnum.ADMIN], permissions: [] };
      expect(guard.canActivate(makeContext(user))).toBe(true);
    });

    it('denies access when user lacks the required role', () => {
      mockMeta([RoleEnum.ADMIN]);
      const user = { roles: [RoleEnum.USER], permissions: [] };
      expect(guard.canActivate(makeContext(user))).toBe(false);
    });

    it('uses OR logic — any one matching role grants access', () => {
      mockMeta([RoleEnum.ADMIN, RoleEnum.MANAGER]);
      const user = { roles: [RoleEnum.MANAGER], permissions: [] };
      expect(guard.canActivate(makeContext(user))).toBe(true);
    });

    it('allows access when user has multiple roles and one matches', () => {
      mockMeta([RoleEnum.ADMIN]);
      const user = { roles: [RoleEnum.USER, RoleEnum.ADMIN], permissions: [] };
      expect(guard.canActivate(makeContext(user))).toBe(true);
    });
  });

  describe('permission-based access (AND logic)', () => {
    it('denies access when permission required but no user in request', () => {
      mockMeta(undefined, [Permission.TASK_CREATE]);
      expect(guard.canActivate(makeContext(undefined))).toBe(false);
    });

    it('allows access when user has all required permissions', () => {
      mockMeta(undefined, [Permission.TASK_CREATE, Permission.TASK_READ]);
      const user = {
        roles: [],
        permissions: [Permission.TASK_CREATE, Permission.TASK_READ],
      };
      expect(guard.canActivate(makeContext(user))).toBe(true);
    });

    it('denies access when user is missing one required permission', () => {
      mockMeta(undefined, [Permission.TASK_CREATE, Permission.TASK_READ]);
      const user = { roles: [], permissions: [Permission.TASK_CREATE] };
      expect(guard.canActivate(makeContext(user))).toBe(false);
    });

    it('denies access when user has no permissions at all', () => {
      mockMeta(undefined, [Permission.TASK_CREATE]);
      const user = { roles: [], permissions: [] };
      expect(guard.canActivate(makeContext(user))).toBe(false);
    });

    it('uses AND logic — all permissions must be present', () => {
      mockMeta(undefined, [
        Permission.TASK_CREATE,
        Permission.TASK_READ,
        Permission.TASK_DELETE,
      ]);
      const user = {
        roles: [],
        permissions: [Permission.TASK_CREATE, Permission.TASK_READ],
      };
      expect(guard.canActivate(makeContext(user))).toBe(false);
    });
  });

  describe('combined roles + permissions', () => {
    it('allows access when both roles and permissions match', () => {
      mockMeta([RoleEnum.ADMIN], [Permission.TASK_CREATE]);
      const user = {
        roles: [RoleEnum.ADMIN],
        permissions: [Permission.TASK_CREATE],
      };
      expect(guard.canActivate(makeContext(user))).toBe(true);
    });

    it('denies access when role matches but permission missing', () => {
      mockMeta([RoleEnum.ADMIN], [Permission.TASK_CREATE]);
      const user = { roles: [RoleEnum.ADMIN], permissions: [] };
      expect(guard.canActivate(makeContext(user))).toBe(false);
    });

    it('denies access when permission matches but role missing', () => {
      mockMeta([RoleEnum.ADMIN], [Permission.TASK_CREATE]);
      const user = {
        roles: [RoleEnum.USER],
        permissions: [Permission.TASK_CREATE],
      };
      expect(guard.canActivate(makeContext(user))).toBe(false);
    });
  });
});
