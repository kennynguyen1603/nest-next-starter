import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PermissionSchemaClass } from '@/roles/infrastructure/persistence/document/entities/permission.schema';
import { Permission } from '@/roles/permissions.enum';

@Injectable()
export class PermissionSeedService {
  constructor(
    @InjectModel(PermissionSchemaClass.name)
    private readonly model: Model<PermissionSchemaClass>,
  ) {}

  async run() {
    for (const name of Object.values(Permission)) {
      const exists = await this.model.exists({ name });
      if (!exists) {
        await this.model.create({ name });
      }
    }
  }
}
