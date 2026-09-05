import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { CurrentUser } from '../authorization/current-user.decorator';
import { PERMISSIONS } from '../authorization/permission-catalog';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { CreateRoleDto, SetRolePermissionsDto, UpdateRoleDto } from './dto/role.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @RequirePermissions(PERMISSIONS.ROLE_VIEW)
  @Get()
  list(@CurrentUser() principal: AuthPrincipal) {
    return this.roles.list(principal);
  }

  @RequirePermissions(PERMISSIONS.ROLE_VIEW)
  @Get(':roleId')
  get(
    @CurrentUser() principal: AuthPrincipal,
    @Param('roleId', new ParseUUIDPipe()) roleId: string,
  ) {
    return this.roles.get(principal, roleId);
  }

  @RequirePermissions(PERMISSIONS.ROLE_CREATE)
  @Post()
  create(@CurrentUser() principal: AuthPrincipal, @Body() dto: CreateRoleDto) {
    return this.roles.create(principal, dto);
  }

  @RequirePermissions(PERMISSIONS.ROLE_UPDATE)
  @Patch(':roleId')
  update(
    @CurrentUser() principal: AuthPrincipal,
    @Param('roleId', new ParseUUIDPipe()) roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roles.update(principal, roleId, dto);
  }

  @RequirePermissions(PERMISSIONS.ROLE_ASSIGN_PERMISSION)
  @Put(':roleId/permissions')
  setPermissions(
    @CurrentUser() principal: AuthPrincipal,
    @Param('roleId', new ParseUUIDPipe()) roleId: string,
    @Body() dto: SetRolePermissionsDto,
  ) {
    return this.roles.setPermissions(principal, roleId, dto);
  }
}

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly roles: RolesService) {}

  @RequirePermissions(PERMISSIONS.PERMISSION_VIEW)
  @Get()
  list() {
    return this.roles.listPermissions();
  }
}
