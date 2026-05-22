import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

import { FileType } from '@/files/domain/file';
import { Role } from '@/roles/domain/role';
import { UserStatus } from '@/users/user-status.enum';

export class User {
  @ApiProperty({
    type: String,
  })
  @Expose()
  id!: string;

  @ApiProperty({
    type: String,
    example: 'john.doe@example.com',
  })
  @Expose({ groups: ['me', 'admin'] })
  email!: string | null;

  @Exclude({ toPlainOnly: true })
  password?: string;

  @ApiProperty({
    type: String,
    example: 'email',
  })
  @Expose({ groups: ['me', 'admin'] })
  provider!: string;

  @ApiProperty({
    type: String,
    example: '1234567890',
  })
  @Expose({ groups: ['me', 'admin'] })
  socialId?: string | null;

  @ApiProperty({
    type: String,
    example: 'John',
  })
  @Expose()
  firstName!: string | null;

  @ApiProperty({
    type: String,
    example: 'Doe',
  })
  @Expose()
  lastName!: string | null;

  @ApiProperty({
    type: () => FileType,
  })
  @Expose()
  photo?: FileType | null;

  @ApiProperty({
    type: () => Role,
    isArray: true,
  })
  @Expose()
  roles?: Role[];

  @ApiProperty({ enum: UserStatus })
  @Expose()
  status?: UserStatus;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  @ApiProperty({ nullable: true })
  @Expose()
  deletedAt?: Date;
}
