import { StringFieldOptional, TokenField } from '@/decorators/field.decorators';

export class AuthGoogleLoginDto {
  @TokenField({ example: 'google.id.token' })
  idToken!: string;

  // Nonce the client passed to Google Sign-In. When sent, it must match the
  // `nonce` claim of the ID token, which prevents replaying a captured token.
  @StringFieldOptional({ maxLength: 512, example: 'random-nonce' })
  nonce?: string;
}
