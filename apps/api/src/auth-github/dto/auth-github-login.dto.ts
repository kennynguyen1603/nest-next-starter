import { StringField } from '@/decorators/field.decorators';

export class AuthGithubLoginDto {
  @StringField({ example: 'gho_xxx...' })
  accessToken!: string;
}
