import { TokenField } from '@/decorators/field.decorators';

export class AuthGoogleLoginDto {
  @TokenField({ example: 'google.id.token' })
  idToken!: string;
}
