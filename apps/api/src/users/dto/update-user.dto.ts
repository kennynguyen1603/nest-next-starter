import {
  ClassFieldOptional,
  EmailFieldOptional,
  EnumFieldOptional,
  PasswordFieldOptional,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { FileDto } from '@/files/dto/file.dto';
import { RoleDto } from '@/roles/dto/role.dto';
import { UserStatus } from '@/users/user-status.enum';

export class UpdateUserDto {
  @EmailFieldOptional({ example: 'test1@example.com', nullable: true })
  email?: string | null;

  @PasswordFieldOptional()
  password?: string;

  @StringFieldOptional()
  provider?: string;

  @StringFieldOptional({ nullable: true })
  socialId?: string | null;

  @StringFieldOptional({ example: 'John', nullable: true })
  firstName?: string | null;

  @StringFieldOptional({ example: 'Doe', nullable: true })
  lastName?: string | null;

  @ClassFieldOptional(() => FileDto, { nullable: true })
  photo?: FileDto | null;

  @ClassFieldOptional(() => RoleDto, { each: true })
  roles?: RoleDto[];

  @EnumFieldOptional(() => UserStatus)
  status?: UserStatus;
}
