import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolePermissionEntity } from '@/roles/infrastructure/persistence/relational/entities/role-permission.entity';
import { RoleEntity } from '@/roles/infrastructure/persistence/relational/entities/role.entity';
import { RolePermissionSeedService } from './role-permission-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([RolePermissionEntity, RoleEntity])],
  providers: [RolePermissionSeedService],
  exports: [RolePermissionSeedService],
})
export class RolePermissionSeedModule {}
