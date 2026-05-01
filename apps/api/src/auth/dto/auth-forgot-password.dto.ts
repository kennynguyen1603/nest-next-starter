import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { ToLowerCase } from '@/decorators/transform.decorators';

export class AuthForgotPasswordDto {
  @ApiProperty({ example: 'test1@example.com', type: String })
  @ToLowerCase()
  @IsEmail()
  email: string;
}
