import { EnumField } from '@/decorators/field.decorators';
import { RoleEnum } from '../roles.enum';

export class AssignRolesDto {
  @EnumField(() => RoleEnum, { each: true })
  roles!: RoleEnum[];
}
