import { Injectable } from '@nestjs/common';

import { NullableType } from '@/utils/types/nullable.type';
import { FilterUserDto, SortUserDto } from '@/users/dto/query-user.dto';
import { User } from '@/users/domain/user';
import { UserRepository } from '../../user.repository';
import { UserSchemaClass } from '../entities/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
import { UserMapper } from '../mappers/user.mapper';
import { IPaginationOptions } from '@/utils/types/pagination-options';
import { UserRoleSchemaClass } from '@/roles/infrastructure/persistence/document/entities/user-role.schema';
import { RoleSchemaClass } from '@/roles/infrastructure/persistence/document/entities/role.schema';
import { RoleEnum } from '@/roles/roles.enum';

@Injectable()
export class UsersDocumentRepository implements UserRepository {
  constructor(
    @InjectModel(UserSchemaClass.name)
    private readonly usersModel: Model<UserSchemaClass>,
    @InjectModel(UserRoleSchemaClass.name)
    private readonly userRoleModel: Model<UserRoleSchemaClass>,
    @InjectModel(RoleSchemaClass.name)
    private readonly roleModel: Model<RoleSchemaClass>,
  ) {}

  // Single-user role lookup (3 queries: user + user_role + role).
  // Acceptable for point lookups — no N+1 risk with a single user.
  private async populateRoles(userId: string): Promise<RoleSchemaClass[]> {
    const userRoles = await this.userRoleModel
      .find({ userId })
      .lean<{ roleId: RoleEnum }[]>();
    if (!userRoles.length) return [];
    const roleIds = userRoles.map((userRole) => userRole.roleId);
    return this.roleModel.find({ _id: { $in: roleIds } }).lean();
  }

  // Batch role lookup for multiple users — 2 queries regardless of user count.
  // Eliminates the N+1 pattern that would arise from calling populateRoles per user.
  private async batchPopulateRoles(
    userIds: string[],
  ): Promise<Map<string, RoleSchemaClass[]>> {
    if (!userIds.length) return new Map();

    const userRoleDocs = await this.userRoleModel
      .find({ userId: { $in: userIds } })
      .lean<{ userId: string; roleId: string }[]>();

    if (!userRoleDocs.length) return new Map();

    const uniqueRoleIds = [...new Set(userRoleDocs.map((ur) => ur.roleId))];
    const roles = await this.roleModel
      .find({ _id: { $in: uniqueRoleIds } })
      .lean<RoleSchemaClass[]>();

    const roleById = new Map(roles.map((r) => [String(r._id), r]));

    const result = new Map<string, RoleSchemaClass[]>();
    for (const ur of userRoleDocs) {
      const list = result.get(ur.userId) ?? [];
      const role = roleById.get(ur.roleId);
      if (role) list.push(role);
      result.set(ur.userId, list);
    }
    return result;
  }

  async create(data: User): Promise<User> {
    const persistenceModel = UserMapper.toPersistence(data);
    const createdUser = new this.usersModel(persistenceModel);
    const savedUser = await createdUser.save();

    let roles: RoleSchemaClass[] = [];
    if (data.roles?.length) {
      const names = data.roles.map((role) => role.name).filter(Boolean);
      roles = await this.roleModel
        .find({ name: { $in: names } }, { _id: 1, name: 1 })
        .lean<RoleSchemaClass[]>();
      if (roles.length) {
        await this.userRoleModel.insertMany(
          roles.map((role) => ({
            userId: savedUser._id.toString(),
            roleId: String(role._id),
          })),
        );
      }
    }

    return UserMapper.toDomain(savedUser, roles);
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    search,
    paginationOptions,
  }: {
    filterOptions?: FilterUserDto | null;
    sortOptions?: SortUserDto[] | null;
    search?: string | null;
    paginationOptions: IPaginationOptions;
  }): Promise<[User[], number]> {
    const where: QueryFilter<UserSchemaClass> = {};

    if (filterOptions?.roles?.length) {
      const names = filterOptions.roles
        .map((role) => role.name)
        .filter(Boolean);
      const foundRoles = await this.roleModel
        .find({ name: { $in: names } }, { _id: 1 })
        .lean<{ _id: unknown }[]>();
      const roleIds = foundRoles.map((foundRole) => String(foundRole._id));
      const userRoleDocs = await this.userRoleModel
        .find({ roleId: { $in: roleIds } })
        .lean<{ userId: string }[]>();
      where['_id'] = { $in: userRoleDocs.map((ur) => ur.userId) };
    }

    if (search) {
      const pattern = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      where.$or = [
        { email: pattern },
        { firstName: pattern },
        { lastName: pattern },
      ];
    }

    const sortQuery = sortOptions?.reduce(
      (acc, sort) => ({
        ...acc,
        [sort.orderBy === 'id' ? '_id' : sort.orderBy]:
          sort.order.toUpperCase() === 'ASC' ? 1 : -1,
      }),
      {},
    );

    const [userDocuments, total] = await Promise.all([
      this.usersModel
        .find(where)
        .sort(sortQuery)
        .skip((paginationOptions.page - 1) * paginationOptions.limit)
        .limit(paginationOptions.limit)
        .lean<UserSchemaClass[]>(),
      this.usersModel.countDocuments(where),
    ]);

    if (!userDocuments.length) return [[], total];

    // Batch-load all roles in 2 queries instead of 2N queries (N+1 eliminated)
    const rolesMap = await this.batchPopulateRoles(
      userDocuments.map((doc) => doc._id.toString()),
    );
    const data = userDocuments.map((doc) =>
      UserMapper.toDomain(doc, rolesMap.get(doc._id.toString()) ?? []),
    );
    return [data, total];
  }

  async findById(id: User['id']): Promise<NullableType<User>> {
    const userDocument = await this.usersModel
      .findById(id)
      .lean<UserSchemaClass>();
    if (!userDocument) return null;
    const roles = await this.populateRoles(userDocument._id.toString());
    return UserMapper.toDomain(userDocument, roles);
  }

  async findByIds(ids: User['id'][]): Promise<User[]> {
    if (!ids.length) return [];
    const userDocuments = await this.usersModel
      .find({ _id: { $in: ids.map((id) => id.toString()) } })
      .lean<UserSchemaClass[]>();
    if (!userDocuments.length) return [];

    // Batch-load roles in 2 queries instead of 2N queries (N+1 eliminated)
    const rolesMap = await this.batchPopulateRoles(
      userDocuments.map((doc) => doc._id.toString()),
    );
    return userDocuments.map((doc) =>
      UserMapper.toDomain(doc, rolesMap.get(doc._id.toString()) ?? []),
    );
  }

  async findByEmail(email: User['email']): Promise<NullableType<User>> {
    if (!email) return null;
    const userDocument = await this.usersModel
      .findOne({ email })
      .lean<UserSchemaClass>();
    if (!userDocument) return null;
    const roles = await this.populateRoles(userDocument._id.toString());
    return UserMapper.toDomain(userDocument, roles);
  }

  async findBySocialIdAndProvider({
    socialId,
    provider,
  }: {
    socialId: User['socialId'];
    provider: User['provider'];
  }): Promise<NullableType<User>> {
    if (!socialId || !provider) return null;
    const userDocument = await this.usersModel
      .findOne({ socialId, provider })
      .lean<UserSchemaClass>();
    if (!userDocument) return null;
    const roles = await this.populateRoles(userDocument._id.toString());
    return UserMapper.toDomain(userDocument, roles);
  }

  async update(id: User['id'], payload: Partial<User>): Promise<User | null> {
    const { id: _id, roles: newRoles, photo, ...fields } = payload;

    // Only set what was provided. undefined = untouched; null is kept — it
    // signals an explicit clear (e.g. photo).
    const $set: Record<string, unknown> = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined),
    );
    if (photo !== undefined) {
      $set.photo = photo ? { _id: photo.id, path: photo.path } : null;
    }

    const updatedUser = await this.usersModel
      .findOneAndUpdate(
        { _id: id.toString() },
        { $set },
        { returnDocument: 'after' },
      )
      .lean<UserSchemaClass>();
    if (!updatedUser) return null;

    if (newRoles !== undefined) {
      await this.userRoleModel.deleteMany({ userId: id.toString() });
      if (newRoles.length) {
        const names = newRoles.map((role) => role.name).filter(Boolean);
        const foundRoles = await this.roleModel
          .find({ name: { $in: names } }, { _id: 1 })
          .lean<{ _id: unknown }[]>();
        if (foundRoles.length) {
          await this.userRoleModel.insertMany(
            foundRoles.map((foundRole) => ({
              userId: id.toString(),
              roleId: String(foundRole._id),
            })),
          );
        }
      }
    }

    const roles = await this.populateRoles(updatedUser._id.toString());
    return UserMapper.toDomain(updatedUser, roles);
  }

  async findAllIds(): Promise<string[]> {
    const docs = await this.usersModel
      .find({}, { _id: 1 })
      .lean<{ _id: unknown }[]>();
    return docs.map((d) => String(d._id));
  }

  async remove(id: User['id']): Promise<void> {
    await Promise.all([
      this.userRoleModel.deleteMany({ userId: id.toString() }),
      this.usersModel.deleteOne({ _id: id.toString() }),
    ]);
  }
}
