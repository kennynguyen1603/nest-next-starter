import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@/users/infrastructure/persistence/relational/entities/user.entity';
import { AdminRepository } from '../admin.repository';
import { AdminRelationalRepository } from './repositories/admin.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [
    {
      provide: AdminRepository,
      useClass: AdminRelationalRepository,
    },
  ],
  exports: [AdminRepository],
})
export class AdminRelationalPersistenceModule {}
