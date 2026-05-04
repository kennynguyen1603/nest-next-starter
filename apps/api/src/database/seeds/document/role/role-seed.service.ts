import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoleSchemaClass } from '@/roles/infrastructure/persistence/document/entities/role.schema';
import { RoleEnum } from '@/roles/roles.enum';

@Injectable()
export class RoleSeedService {
  constructor(
    @InjectModel(RoleSchemaClass.name)
    private readonly model: Model<RoleSchemaClass>,
  ) {}

  async run() {
    for (const name of Object.values(RoleEnum)) {
      const exists = await this.model.exists({ name });
      if (!exists) {
        await this.model.create({ name });
      }
    }
  }
}
