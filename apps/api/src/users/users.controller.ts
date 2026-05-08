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
import { NullableType } from '@/utils/types/nullable.type';
import {
  OffsetPaginatedDto,
  OffsetPaginationResponse,
} from '@/common/dto/offset-pagination/paginated.dto';

import { User } from './domain/user';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

@Roles(RoleEnum.ADMIN)
@UseGuards(AuthGuard('jwt'), RbacGuard)
@ApiTags('Users')
@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
  findOne(@Param('id') id: User['id']): Promise<NullableType<User>> {
    return this.usersService.findById(id);
  }

  @ApiOkResponse({ type: User })
  @ApiAuth({ summary: 'Update user' })
  @SerializeOptions({ groups: ['admin'] })
  @Patch(':id')
  @ApiParam({ name: 'id', type: String, required: true })
  update(
    @Param('id') id: User['id'],
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User | null> {
    return this.usersService.update(id, updateUserDto);
  }

  @ApiAuth({ statusCode: HttpStatus.NO_CONTENT, summary: 'Delete user' })
  @Delete(':id')
  @ApiParam({ name: 'id', type: String, required: true })
  remove(@Param('id') id: User['id']): Promise<void> {
    return this.usersService.remove(id);
  }
}
