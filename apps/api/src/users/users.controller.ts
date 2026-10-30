import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  SerializeOptions,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { ApiAuth } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/roles.decorator';
import { RoleEnum } from '@/roles/roles.enum';
import { RbacGuard } from '@/roles/rbac.guard';
import { SessionService } from '@/session/session.service';
import {
  OffsetPaginatedDto,
  OffsetPaginationResponse,
} from '@/common/dto/offset-pagination/paginated.dto';

import { User } from './domain/user';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UserStatus } from './user-status.enum';

@Roles(RoleEnum.ADMIN)
@UseGuards(AuthGuard('jwt'), RbacGuard)
@ApiTags('Users')
@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
  ) {}

  @ApiCreatedResponse({ type: User })
  @ApiAuth({ statusCode: HttpStatus.CREATED, summary: 'Create user' })
  @SerializeOptions({ groups: ['admin'] })
  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @ApiOkResponse({ type: OffsetPaginationResponse(User) })
  @ApiAuth({ summary: 'List users with pagination' })
  @SerializeOptions({ groups: ['admin'] })
  @Get()
  findAll(@Query() query: QueryUserDto): Promise<OffsetPaginatedDto<User>> {
    return this.usersService.findManyWithPagination({
      filterOptions: query.filters,
      sortOptions: query.sort,
      pageOptionsDto: query,
    });
  }

  @ApiOkResponse({ type: User })
  @ApiAuth({ summary: 'Get user by ID' })
  @SerializeOptions({ groups: ['admin'] })
  @Get(':id')
  @ApiParam({ name: 'id', type: String, required: true })
  findOne(@Param('id') id: User['id']): Promise<User> {
    return this.usersService.findByIdOrFail(id);
  }

  @ApiOkResponse({ type: User })
  @ApiAuth({ summary: 'Update user' })
  @SerializeOptions({ groups: ['admin'] })
  @Patch(':id')
  @ApiParam({ name: 'id', type: String, required: true })
  async update(
    @Param('id') id: User['id'],
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.usersService.update(id, updateUserDto);

    // Credentials, roles and status are baked into issued tokens or gate
    // sign-in, so force the user to sign in again when an admin changes them.
    const mustRevokeSessions =
      !!updateUserDto.password ||
      !!updateUserDto.roles?.length ||
      (!!updateUserDto.status && updateUserDto.status !== UserStatus.ACTIVE);
    if (mustRevokeSessions) {
      await this.sessionService.deleteByUserId({ userId: id }, 'admin_revoked');
    }

    return user;
  }

  @ApiAuth({ statusCode: HttpStatus.NO_CONTENT, summary: 'Delete user' })
  @Delete(':id')
  @ApiParam({ name: 'id', type: String, required: true })
  async remove(@Param('id') id: User['id']): Promise<void> {
    await this.usersService.remove(id);
    await this.sessionService.deleteByUserId({ userId: id }, 'admin_revoked');
  }
}
