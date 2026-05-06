import { NestFactory } from '@nestjs/core';
import { RoleSeedService } from './role/role-seed.service';
import { PermissionSeedService } from './permission/permission-seed.service';
import { RolePermissionSeedService } from './role-permission/role-permission-seed.service';
import { UserSeedService } from './user/user-seed.service';
import { SeedModule } from './seed.module';

const runSeed = async () => {
  const app = await NestFactory.create(SeedModule);

  // order matters: roles → permissions → role_permissions → users
  await app.get(RoleSeedService).run();
  await app.get(PermissionSeedService).run();
  await app.get(RolePermissionSeedService).run();
  await app.get(UserSeedService).run();

  await app.close();
};

void runSeed();
