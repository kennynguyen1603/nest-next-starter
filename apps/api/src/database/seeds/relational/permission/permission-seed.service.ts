import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionEntity } from '@/roles/infrastructure/persistence/relational/entities/permission.entity';
import { PERMISSION_IDS } from '@/roles/permissions.enum';

@Injectable()
export class PermissionSeedService {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly repository: Repository<PermissionEntity>,
  ) {}

  async run() {
    for (const [name, id] of Object.entries(PERMISSION_IDS)) {
      const exists = await this.repository.count({ where: { id } });
      if (!exists) {
        await this.repository.save(this.repository.create({ id, name }));
      }
    }
  }
}
