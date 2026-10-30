import { StringField } from '@/decorators/field.decorators';

export class AuthTwitterLoginDto {
  @StringField({ example: 'VGhpcyBpcyBhbiBhdXRob3JpemF0aW9uIGNvZGU' })
  code!: string;

  @StringField({ example: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk' })
  codeVerifier!: string;

  @StringField({ example: 'http://localhost:3000/auth/twitter/callback' })
  redirectUri!: string;
}
