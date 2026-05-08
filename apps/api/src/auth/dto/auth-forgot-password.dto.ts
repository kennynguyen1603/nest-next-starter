import { EmailField } from '@/decorators/field.decorators';

export class AuthForgotPasswordDto {
  @EmailField({ example: 'test1@example.com' })
  email!: string;
}
