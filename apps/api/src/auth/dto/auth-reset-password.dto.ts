import { PasswordField, TokenField } from '@/decorators/field.decorators';

export class AuthResetPasswordDto {
  @PasswordField()
  password!: string;

  @TokenField()
  hash!: string;
}
