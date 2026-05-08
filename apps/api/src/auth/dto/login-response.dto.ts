import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { User } from '@/users/domain/user';

export class LoginResponseDto {
  @ApiProperty()
  @Expose()
  token!: string;

  @ApiProperty()
  @Expose()
  tokenExpires!: number;

  @ApiProperty({ type: () => User })
  @Expose()
  user!: User;
}
