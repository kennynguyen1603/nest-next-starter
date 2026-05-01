import { SetMetadata } from '@nestjs/common';
import { RoleEnum } from './roles.enum';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to users whose role matches one of the given values.
 *
 * Must be used together with `RbacGuard`.
 * For fine-grained control, prefer `@Permissions` instead.
 *
 * Example
 * Single role
 * @Roles(RoleEnum.ADMIN)
 * @UseGuards(AuthGuard('jwt'), RbacGuard)
 * @Get('admin-only')
 * getAdminData() {}
 *
 * Multiple roles (OR logic – any of the roles is sufficient)
 * @Roles(RoleEnum.ADMIN, RoleEnum.USER)
 * @UseGuards(AuthGuard('jwt'), RbacGuard)
 * @Get('authenticated')
 * getSharedData() {}
 */
export const Roles = (...roles: RoleEnum[]) => SetMetadata(ROLES_KEY, roles);
