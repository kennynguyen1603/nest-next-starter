import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';

import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { NullableType } from '@/utils/types/nullable.type';

import { Role } from './domain/role';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { RbacGuard } from './rbac.guard';
import { RoleEnum } from './roles.enum';
import { Roles } from './roles.decorator';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@Controller({ path: 'roles', version: '1' })
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiPublic({ summary: 'List all roles' })
  @ApiOkResponse({ type: Role, isArray: true })
  findAll(): Promise<Role[]> {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RbacGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiAuth({ type: Role, summary: 'Get role by id' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string): Promise<NullableType<Role>> {
    const role = await this.rolesService.findById(id);
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    return role;
  }

  @Put('users/:userId')
  @UseGuards(AuthGuard('jwt'), RbacGuard)
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAuth({
    summary: 'Assign roles to a user',
    statusCode: HttpStatus.NO_CONTENT,
  })
  @ApiParam({ name: 'userId', type: String })
  assignRoles(
    @Param('userId') userId: string,
    @Body() dto: AssignRolesDto,
  ): Promise<void> {
    return this.rolesService.assignRolesToUser(userId, dto.roles);
  }
}
