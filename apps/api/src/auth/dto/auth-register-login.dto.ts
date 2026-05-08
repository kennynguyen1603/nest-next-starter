import {
  EmailField,
  PasswordField,
  StringField,
} from '@/decorators/field.decorators';

export class AuthRegisterLoginDto {
  @EmailField({ example: 'test1@example.com' })
  email!: string;

  @PasswordField()
  password!: string;

  @StringField({ example: 'John' })
  firstName!: string;

  @StringField({ example: 'Doe' })
  lastName!: string;
}
