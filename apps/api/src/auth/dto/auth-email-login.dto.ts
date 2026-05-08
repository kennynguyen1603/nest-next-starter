import { EmailField, StringField } from '@/decorators/field.decorators';

export class AuthEmailLoginDto {
  @EmailField({ example: 'test1@example.com' })
  email!: string;

  @StringField()
  password!: string;
}
