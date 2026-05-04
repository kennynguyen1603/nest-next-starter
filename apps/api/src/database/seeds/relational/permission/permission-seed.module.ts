import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from '@/roles/infrastructure/persistence/relational/entities/permission.entity';
import { PermissionSeedService } from './permission-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([PermissionEntity])],
  providers: [PermissionSeedService],
  exports: [PermissionSeedService],
})
export class PermissionSeedModule {}
