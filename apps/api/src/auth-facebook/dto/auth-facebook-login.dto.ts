import { StringField } from '@/decorators/field.decorators';

export class AuthFacebookLoginDto {
  @StringField({ example: 'EAABsbCS...' })
  accessToken!: string;
}
