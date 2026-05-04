import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PermissionSchemaClass,
  PermissionSchema,
} from '@/roles/infrastructure/persistence/document/entities/permission.schema';
import { PermissionSeedService } from './permission-seed.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PermissionSchemaClass.name, schema: PermissionSchema },
    ]),
  ],
  providers: [PermissionSeedService],
  exports: [PermissionSeedService],
})
export class PermissionSeedModule {}
