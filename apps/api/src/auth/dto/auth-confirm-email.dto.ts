import { TokenField } from '@/decorators/field.decorators';

export class AuthConfirmEmailDto {
  @TokenField()
  hash!: string;
}
