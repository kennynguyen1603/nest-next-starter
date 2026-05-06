import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DataSource, DataSourceOptions } from 'typeorm';
import { TypeOrmConfigService } from '../../typeorm-config.service';
import { RoleSeedModule } from './role/role-seed.module';
import { PermissionSeedModule } from './permission/permission-seed.module';
import { RolePermissionSeedModule } from './role-permission/role-permission-seed.module';
import { UserSeedModule } from './user/user-seed.module';
import databaseConfig from '@/config/database/database.config';
import appConfig from '@/config/app/app.config';

@Module({
  imports: [
    RoleSeedModule,
    PermissionSeedModule,
    RolePermissionSeedModule,
    UserSeedModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options?: DataSourceOptions) => {
        if (!options) {
          throw new Error('Invalid options passed to DataSource');
        }
        return new DataSource(options).initialize();
      },
    }),
  ],
})
export class SeedModule {}
