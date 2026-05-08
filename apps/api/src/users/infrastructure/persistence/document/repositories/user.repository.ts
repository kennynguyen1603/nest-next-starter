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

  private async populateRoles(userId: string): Promise<RoleSchemaClass[]> {
    const userRoles = await this.userRoleModel
      .find({ userId })
      .lean<{ roleId: RoleEnum }[]>();
    if (!userRoles.length) return [];
    const roleIds = userRoles.map((userRole) => userRole.roleId);
    return this.roleModel.find({ _id: { $in: roleIds } }).lean();
  }

  async create(data: User): Promise<User> {
    const persistenceModel = UserMapper.toPersistence(data);
    const createdUser = new this.usersModel(persistenceModel);
    const savedUser = await createdUser.save();

    if (data.roles?.length) {
      const names = data.roles.map((role) => role.name).filter(Boolean);
      const foundRoles = await this.roleModel
        .find({ name: { $in: names } }, { _id: 1 })
        .lean<{ _id: unknown }[]>();
      if (foundRoles.length) {
        await this.userRoleModel.insertMany(
          foundRoles.map((foundRole) => ({
            userId: savedUser._id.toString(),
            roleId: String(foundRole._id),
          })),
        );
      }
    }

    const roles = await this.populateRoles(savedUser._id.toString());
    return UserMapper.toDomain(savedUser, roles);
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
      const userIds = userRoleDocs.map((userRole) => userRole.userId);
      where['_id'] = { $in: userIds };
    }

    const sortQuery = sortOptions?.reduce(
      (accumulator, sort) => ({
        ...accumulator,
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
        .limit(paginationOptions.limit),
      this.usersModel.countDocuments(where),
    ]);

    const data = await Promise.all(
      userDocuments.map(async (userDocument) => {
        const roles = await this.populateRoles(userDocument._id.toString());
        return UserMapper.toDomain(userDocument, roles);
      }),
    );

    return [data, total];
  }

  async findById(id: User['id']): Promise<NullableType<User>> {
    const userDocument = await this.usersModel.findById(id);
    if (!userDocument) return null;
    const roles = await this.populateRoles(userDocument._id.toString());
    return UserMapper.toDomain(userDocument, roles);
  }

  async findByIds(ids: User['id'][]): Promise<User[]> {
    const userDocuments = await this.usersModel.find({
      _id: { $in: ids.map((id) => id.toString()) },
    });
    return Promise.all(
      userDocuments.map(async (userDocument) => {
        const roles = await this.populateRoles(userDocument._id.toString());
        return UserMapper.toDomain(userDocument, roles);
      }),
    );
  }

  async findByEmail(email: User['email']): Promise<NullableType<User>> {
    if (!email) return null;
    const userDocument = await this.usersModel.findOne({ email });
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
    const userDocument = await this.usersModel.findOne({ socialId, provider });
    if (!userDocument) return null;
    const roles = await this.populateRoles(userDocument._id.toString());
    return UserMapper.toDomain(userDocument, roles);
  }

  async update(id: User['id'], payload: Partial<User>): Promise<User | null> {
    const clonedPayload = { ...payload };
    delete clonedPayload.id;

    const filter = { _id: id.toString() };
    const existingUser = await this.usersModel.findOne(filter);
    if (!existingUser) return null;

    const updatedUser = await this.usersModel.findOneAndUpdate(
      filter,
      UserMapper.toPersistence({
        ...UserMapper.toDomain(existingUser),
        ...clonedPayload,
      }),
      { returnDocument: 'after' },
    );
    if (!updatedUser) return null;

    if (clonedPayload.roles !== undefined) {
      await this.userRoleModel.deleteMany({ userId: id.toString() });
      if (clonedPayload.roles.length) {
        const names = clonedPayload.roles
          .map((role) => role.name)
          .filter(Boolean);
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

  async remove(id: User['id']): Promise<void> {
    await this.userRoleModel.deleteMany({ userId: id.toString() });
    await this.usersModel.deleteOne({ _id: id.toString() });
  }
}
