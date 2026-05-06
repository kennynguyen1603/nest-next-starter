import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepository } from '../user.repository';
import { UsersRelationalRepository } from './repositories/user.repository';
import { UserEntity } from './entities/user.entity';
import { UserRoleEntity } from '@/roles/infrastructure/persistence/relational/entities/user-role.entity';
import { RoleEntity } from '@/roles/infrastructure/persistence/relational/entities/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserRoleEntity, RoleEntity])],
  providers: [
    {
      provide: UserRepository,
      useClass: UsersRelationalRepository,
    },
  ],
  exports: [UserRepository],
})
export class RelationalUserPersistenceModule {}
