import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { RoleEnum } from '@/roles/roles.enum';
import { UserStatus } from '@/users/user-status.enum';
import { UserSchemaClass } from '@/users/infrastructure/persistence/document/entities/user.schema';
import { UserRoleSchemaClass } from '@/roles/infrastructure/persistence/document/entities/user-role.schema';
import { RoleSchemaClass } from '@/roles/infrastructure/persistence/document/entities/role.schema';

@Injectable()
export class UserSeedService {
  constructor(
    @InjectModel(UserSchemaClass.name)
    private readonly userModel: Model<UserSchemaClass>,
    @InjectModel(UserRoleSchemaClass.name)
    private readonly userRoleModel: Model<UserRoleSchemaClass>,
    @InjectModel(RoleSchemaClass.name)
    private readonly roleModel: Model<RoleSchemaClass>,
  ) {}

  async run() {
    const adminRoleDoc = await this.roleModel
      .findOne({ name: RoleEnum.ADMIN }, { _id: 1 })
      .lean<{ _id: unknown }>();
    const userRoleDoc = await this.roleModel
      .findOne({ name: RoleEnum.USER }, { _id: 1 })
      .lean<{ _id: unknown }>();

    const admin = await this.userModel.findOne({ email: 'admin@example.com' });

    if (!admin && adminRoleDoc) {
      const salt = await bcrypt.genSalt();
      const password = await bcrypt.hash('secret', salt);

      const data = new this.userModel({
        email: 'admin@example.com',
        password,
        firstName: 'Super',
        lastName: 'Admin',
        status: UserStatus.ACTIVE,
      });
      const saved = await data.save();

      await this.userRoleModel.create({
        userId: saved._id.toString(),
        roleId: String(adminRoleDoc._id),
      });
    }

    const user = await this.userModel.findOne({
      email: 'john.doe@example.com',
    });

    if (!user && userRoleDoc) {
      const salt = await bcrypt.genSalt();
      const password = await bcrypt.hash('secret', salt);

      const data = new this.userModel({
        email: 'john.doe@example.com',
        password,
        firstName: 'John',
        lastName: 'Doe',
        status: UserStatus.ACTIVE,
      });
      const saved = await data.save();

      await this.userRoleModel.create({
        userId: saved._id.toString(),
        roleId: String(userRoleDoc._id),
      });
    }
  }
}
