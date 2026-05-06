import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { RoleEnum } from '@/roles/roles.enum';
import { UserStatus } from '@/users/user-status.enum';
import { UserEntity } from '@/users/infrastructure/persistence/relational/entities/user.entity';
import { RoleEntity } from '@/roles/infrastructure/persistence/relational/entities/role.entity';

@Injectable()
export class UserSeedService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async run() {
    const adminRole = await this.roleRepository.findOne({
      where: { name: RoleEnum.ADMIN },
    });
    const userRole = await this.roleRepository.findOne({
      where: { name: RoleEnum.USER },
    });

    const countAdmin = await this.repository.count({
      where: { email: 'admin@example.com' },
    });

    if (!countAdmin && adminRole) {
      const salt = await bcrypt.genSalt();
      const password = await bcrypt.hash('secret', salt);

      await this.repository.save(
        this.repository.create({
          firstName: 'Super',
          lastName: 'Admin',
          email: 'admin@example.com',
          password,
          roles: [adminRole],
          status: UserStatus.ACTIVE,
        }),
      );
    }

    const countUser = await this.repository.count({
      where: { email: 'john.doe@example.com' },
    });

    if (!countUser && userRole) {
      const salt = await bcrypt.genSalt();
      const password = await bcrypt.hash('secret', salt);

      await this.repository.save(
        this.repository.create({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          password,
          roles: [userRole],
          status: UserStatus.ACTIVE,
        }),
      );
    }
  }
}
