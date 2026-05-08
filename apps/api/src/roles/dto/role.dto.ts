import { EnumField } from '@/decorators/field.decorators';
import { RoleEnum } from '../roles.enum';

export class RoleDto {
  @EnumField(() => RoleEnum)
  name!: RoleEnum;
}
