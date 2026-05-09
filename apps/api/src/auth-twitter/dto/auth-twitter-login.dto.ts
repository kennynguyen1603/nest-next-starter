import { StringField } from '@/decorators/field.decorators';

export class AuthTwitterLoginDto {
  @StringField({ example: 'AAAA...' })
  accessToken!: string;
}
