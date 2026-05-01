import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ToLowerCase } from '@/decorators/transform.decorators';

export class AuthRegisterLoginDto {
  @ApiProperty({ example: 'test1@example.com', type: String })
  @ToLowerCase()
  @IsEmail()
  email: string;

  @ApiProperty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  lastName: string;
}
