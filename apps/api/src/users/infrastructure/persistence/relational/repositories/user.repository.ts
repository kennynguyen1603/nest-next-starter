import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { FindOptionsWhere, Repository, In } from 'typeorm';

import { User } from '@/users/domain/user';
import { UserRepository } from '../../user.repository';
import { UserMapper } from '../mappers/user.mapper';
import { UserEntity } from '../entities/user.entity';
import { RoleEntity } from '@/roles/infrastructure/persistence/relational/entities/role.entity';
import { NullableType } from '@/utils/types/nullable.type';
import { IPaginationOptions } from '@/utils/types/pagination-options';
import { FilterUserDto, SortUserDto } from '@/users/dto/query-user.dto';

@Injectable()
export class UsersRelationalRepository implements UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  // All point-lookup queries: single query via QB (no eager double-query)
  private withRelations() {
    return this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.photo', 'photo')
      .leftJoinAndSelect('user.roles', 'roles');
  }

  async create(data: User): Promise<User> {
    const persistenceModel = UserMapper.toPersistence(data);
    if (data.roles?.length) {
      const names = data.roles.map((r) => r.name).filter(Boolean) as string[];
      persistenceModel.roles = names.length
        ? await this.roleRepository.find({ where: { name: In(names) } })
        : [];
    }
    const newEntity = await this.usersRepository.save(
      this.usersRepository.create(persistenceModel),
    );
    return UserMapper.toDomain(newEntity);
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterUserDto | null;
    sortOptions?: SortUserDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<[User[], number]> {
    const where: FindOptionsWhere<UserEntity> = {};
    if (filterOptions?.roles?.length) {
      where.roles = filterOptions.roles.map((role) => ({ name: role.name }));
    }

    // Use findAndCount with explicit relations for correct ManyToMany pagination.
    // (getManyAndCount() + leftJoinAndSelect on ManyToMany can under-count pages)
    const [entities, total] = await this.usersRepository.findAndCount({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      where,
      order: sortOptions?.reduce(
        (acc, sort) => ({ ...acc, [sort.orderBy]: sort.order }),
        {},
      ),
      relations: { roles: true, photo: true },
    });

    return [entities.map((user) => UserMapper.toDomain(user)), total];
  }

  async findById(id: User['id']): Promise<NullableType<User>> {
    const entity = await this.withRelations()
      .where('user.id = :id', { id })
      .getOne();
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByIds(ids: User['id'][]): Promise<User[]> {
    if (!ids.length) return [];
    const entities = await this.withRelations()
      .where('user.id IN (:...ids)', { ids })
      .getMany();
    return entities.map((entity) => UserMapper.toDomain(entity));
  }

  async findByEmail(email: User['email']): Promise<NullableType<User>> {
    if (!email) return null;
    const entity = await this.withRelations()
      .where('user.email = :email', { email })
      .getOne();
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findBySocialIdAndProvider({
    socialId,
    provider,
  }: {
    socialId: User['socialId'];
    provider: User['provider'];
  }): Promise<NullableType<User>> {
    if (!socialId || !provider) return null;
    const entity = await this.withRelations()
      .where('user.socialId = :socialId AND user.provider = :provider', {
        socialId,
        provider,
      })
      .getOne();
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async update(id: User['id'], payload: Partial<User>): Promise<User> {
    const entity = await this.withRelations()
      .where('user.id = :id', { id })
      .getOne();

    if (!entity) {
      throw new Error('User not found');
    }

    // Compute merged persistence model for value extraction
    const merged = UserMapper.toPersistence({
      ...UserMapper.toDomain(entity),
      ...payload,
    });

    // Build scalar-only update payload.
    // Using repo.update() instead of save() avoids TypeORM's automatic
    // ManyToMany junction-table sync (2 extra SELECT queries) and the
    // post-save eager-photo reload SELECT.
    const scalarUpdate: Record<string, unknown> = {};
    if (payload.email !== undefined) scalarUpdate.email = merged.email;
    if (payload.password !== undefined) scalarUpdate.password = merged.password;
    if (payload.provider !== undefined) scalarUpdate.provider = merged.provider;
    if (payload.socialId !== undefined) scalarUpdate.socialId = merged.socialId;
    if (payload.firstName !== undefined)
      scalarUpdate.firstName = merged.firstName;
    if (payload.lastName !== undefined) scalarUpdate.lastName = merged.lastName;
    if (payload.status !== undefined) scalarUpdate.status = merged.status;
    if (payload.photo !== undefined) scalarUpdate.photo = merged.photo ?? null;

    if (Object.keys(scalarUpdate).length > 0) {
      await this.usersRepository.update(
        { id },
        scalarUpdate as Parameters<typeof this.usersRepository.update>[1],
      );
    }

    // Handle role changes via direct junction-table manipulation.
    // Bypasses TypeORM's save() cascade which always re-reads the junction table.
    if (payload.roles !== undefined) {
      const roleNames = (payload.roles ?? [])
        .map((r) => r.name)
        .filter(Boolean) as string[];
      const newRoles = roleNames.length
        ? await this.roleRepository.find({ where: { name: In(roleNames) } })
        : [];

      await this.usersRepository.manager
        .createQueryBuilder()
        .delete()
        .from('user_role')
        .where('"user_id" = :userId', { userId: id })
        .execute();

      if (newRoles.length) {
        await this.usersRepository.manager
          .createQueryBuilder()
          .insert()
          .into('user_role')
          .values(newRoles.map((role) => ({ user_id: id, role_id: role.id })))
          .execute();
      }

      entity.roles = newRoles;
    }

    // Apply scalar changes to the in-memory entity for the return value
    entity.email = merged.email;
    entity.password = merged.password;
    entity.provider = merged.provider;
    entity.socialId = merged.socialId;
    entity.firstName = merged.firstName;
    entity.lastName = merged.lastName;
    entity.photo = merged.photo;
    entity.status = merged.status;
    entity.updatedAt = new Date();

    return UserMapper.toDomain(entity);
  }

  async findAllIds(): Promise<string[]> {
    const entities = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.id')
      .getMany();
    return entities.map((u) => u.id);
  }

  async remove(id: User['id']): Promise<void> {
    await this.usersRepository.softDelete(id);
  }
}
