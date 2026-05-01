import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { ToLowerCase } from '@/decorators/transform.decorators';

export class AuthEmailLoginDto {
  @ApiProperty({ example: 'test1@example.com', type: String })
  @ToLowerCase()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  password: string;
}
