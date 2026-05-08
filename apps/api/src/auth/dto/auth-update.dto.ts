import {
  ClassFieldOptional,
  EmailFieldOptional,
  PasswordFieldOptional,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { FileDto } from '@/files/dto/file.dto';

export class AuthUpdateDto {
  @ClassFieldOptional(() => FileDto, { nullable: true })
  photo?: FileDto | null;

  @StringFieldOptional({ example: 'John' })
  firstName?: string;

  @StringFieldOptional({ example: 'Doe' })
  lastName?: string;

  @EmailFieldOptional({ example: 'new.email@example.com' })
  email?: string;

  @PasswordFieldOptional()
  password?: string;

  @StringFieldOptional()
  oldPassword?: string;
}
