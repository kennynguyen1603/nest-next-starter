import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionEntity } from '@/roles/infrastructure/persistence/relational/entities/permission.entity';
import { PermissionEnum, PERMISSION_NAMES } from '@/roles/permissions.enum';

@Injectable()
export class PermissionSeedService {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly repository: Repository<PermissionEntity>,
  ) {}

  async run() {
    const permissions = (
      Object.values(PermissionEnum).filter(
        (v) => typeof v === 'number',
      ) as PermissionEnum[]
    ).map((id) => ({ id, name: PERMISSION_NAMES[id] }));

    for (const permission of permissions) {
      const exists = await this.repository.count({
        where: { id: permission.id },
      });
      if (!exists) {
        await this.repository.save(this.repository.create(permission));
      }
    }
  }
}
