import {
  ClassFieldOptional,
  EmailField,
  EnumFieldOptional,
  PasswordFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { FileDto } from '@/files/dto/file.dto';
import { RoleDto } from '@/roles/dto/role.dto';
import { UserStatus } from '@/users/user-status.enum';

export class CreateUserDto {
  @EmailField({ example: 'test1@example.com' })
  email!: string | null;

  @PasswordFieldOptional()
  password?: string;

  @StringFieldOptional()
  provider?: string;

  @StringFieldOptional({ nullable: true })
  socialId?: string | null;

  @StringField({ example: 'John' })
  firstName!: string | null;

  @StringField({ example: 'Doe' })
  lastName!: string | null;

  @ClassFieldOptional(() => FileDto, { nullable: true })
  photo?: FileDto | null;

  @ClassFieldOptional(() => RoleDto, { each: true })
  roles?: RoleDto[];

  @EnumFieldOptional(() => UserStatus)
  status?: UserStatus;
}
