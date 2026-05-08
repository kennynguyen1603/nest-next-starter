import { Session } from '@/session/domain/session';
import { User } from '@/users/domain/user';
import { RoleEnum } from '@/roles/roles.enum';
import { PermissionEnum } from '@/roles/permissions.enum';

export type JwtPayloadType = Pick<User, 'id'> & {
  roles: RoleEnum[];
  permissions: PermissionEnum[];
  sessionId: Session['id'];
  iat: number;
  exp: number;
};
