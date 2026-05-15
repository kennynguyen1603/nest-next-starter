import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CreateUserDto } from './dto/create-user.dto';
import { NullableType } from '../utils/types/nullable.type';
import { FilterUserDto, SortUserDto, QueryUserDto } from './dto/query-user.dto';
import { UserRepository } from './infrastructure/persistence/user.repository';
import { User } from './domain/user';
import bcrypt from 'bcryptjs';
import { AuthProvidersEnum } from '@/auth/auth-providers.enum';
import { FilesService } from '@/files/files.service';
import { RoleEnum } from '@/roles/roles.enum';
import { RoleDto } from '@/roles/dto/role.dto';
import { FileType } from '@/files/domain/file';
import { Role } from '@/roles/domain/role';
import { UpdateUserDto } from './dto/update-user.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/offset-pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UserRepository,
    private readonly filesService: FilesService,
    private readonly i18n: I18nService,
    @InjectPinoLogger(UsersService.name)
    private readonly logger: PinoLogger,
  ) {}

  private t(key: string): string {
    return this.i18n.t(key, { lang: I18nContext.current()?.lang ?? 'en' });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Do not remove comment below.
    // <creating-property />

    let password: string | undefined = undefined;

    if (createUserDto.password) {
      const salt = await bcrypt.genSalt();
      password = await bcrypt.hash(createUserDto.password, salt);
    }

    let email: string | null = null;

    if (createUserDto.email) {
      const existingUser = await this.usersRepository.findByEmail(
        createUserDto.email,
      );
      if (existingUser) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { email: this.t('user.EMAIL_EXISTS') },
        });
      }
      email = createUserDto.email;
    }

    let photo: FileType | null | undefined = undefined;

    if (createUserDto.photo?.id) {
      const file = await this.filesService.findById(createUserDto.photo.id);
      if (!file) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { photo: this.t('user.INVALID_PHOTO') },
        });
      }
      photo = file;
    } else if (createUserDto.photo === null) {
      photo = null;
    }

    let roles: Role[] | undefined = undefined;

    if (createUserDto.roles?.length) {
      roles = this.resolveRoles(createUserDto.roles);
    }

    const user = await this.usersRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: email,
      password: password,
      photo: photo,
      roles: roles,
      status: createUserDto.status,
      provider: createUserDto.provider ?? AuthProvidersEnum.EMAIL,
      socialId: createUserDto.socialId,
    });
    this.logger.debug(
      { userId: user.id, provider: user.provider, status: user.status },
      'User created',
    );
    return user;
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    pageOptionsDto,
  }: {
    filterOptions?: FilterUserDto | null;
    sortOptions?: SortUserDto[] | null;
    pageOptionsDto: QueryUserDto;
  }): Promise<OffsetPaginatedDto<User>> {
    const [data, total] = await this.usersRepository.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions: {
        page: pageOptionsDto.page ?? 1,
        limit: pageOptionsDto.limit ?? 10,
      },
    });
    return new OffsetPaginatedDto<User>(
      data,
      new OffsetPaginationDto(total, pageOptionsDto),
    );
  }

  findById(id: User['id']): Promise<NullableType<User>> {
    return this.usersRepository.findById(id);
  }

  findByIds(ids: User['id'][]): Promise<User[]> {
    return this.usersRepository.findByIds(ids);
  }

  findByEmail(email: User['email']): Promise<NullableType<User>> {
    return this.usersRepository.findByEmail(email);
  }

  findBySocialIdAndProvider({
    socialId,
    provider,
  }: {
    socialId: User['socialId'];
    provider: User['provider'];
  }): Promise<NullableType<User>> {
    return this.usersRepository.findBySocialIdAndProvider({
      socialId,
      provider,
    });
  }

  async update(
    id: User['id'],
    updateUserDto: UpdateUserDto,
  ): Promise<User | null> {
    // Do not remove comment below.
    // <updating-property />

    let password: string | undefined = undefined;

    if (updateUserDto.password) {
      const existingUser = await this.usersRepository.findById(id);
      if (existingUser && existingUser.password !== updateUserDto.password) {
        const salt = await bcrypt.genSalt();
        password = await bcrypt.hash(updateUserDto.password, salt);
      }
    }

    let email: string | null | undefined = undefined;

    if (updateUserDto.email) {
      const existingUser = await this.usersRepository.findByEmail(
        updateUserDto.email,
      );
      if (existingUser && existingUser.id !== id) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { email: this.t('user.EMAIL_EXISTS') },
        });
      }
      email = updateUserDto.email;
    } else if (updateUserDto.email === null) {
      email = null;
    }

    let photo: FileType | null | undefined = undefined;

    if (updateUserDto.photo?.id) {
      const file = await this.filesService.findById(updateUserDto.photo.id);
      if (!file) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { photo: this.t('user.INVALID_PHOTO') },
        });
      }
      photo = file;
    } else if (updateUserDto.photo === null) {
      photo = null;
    }

    let roles: Role[] | undefined = undefined;

    if (updateUserDto.roles?.length) {
      roles = this.resolveRoles(updateUserDto.roles);
    }

    const updated = await this.usersRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName,
      email,
      password,
      photo,
      roles,
      status: updateUserDto.status,
      provider: updateUserDto.provider,
      socialId: updateUserDto.socialId,
    });
    this.logger.debug({ userId: id }, 'User updated');
    return updated;
  }

  async remove(id: User['id']): Promise<void> {
    await this.usersRepository.remove(id);
    this.logger.debug({ userId: id }, 'User removed');
  }

  private resolveRoles(roleDtos: RoleDto[]): Role[] {
    const validRoleNames = new Set<string>(Object.values(RoleEnum));
    const hasInvalidRole = roleDtos.some(
      (roleDto) => !validRoleNames.has(roleDto.name),
    );
    if (hasInvalidRole) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { roles: this.t('user.INVALID_ROLE') },
      });
    }
    return roleDtos.map((roleDto) => {
      const role = new Role();
      role.name = roleDto.name;
      return role;
    });
  }
}
