import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../authorization/current-user.decorator';
import { PERMISSIONS } from '../authorization/permission-catalog';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import type { AuthPrincipal } from '../authorization/auth-principal';
import {
  AdminSetPasswordDto,
  CreateUserDto,
  RoleAssignmentDto,
  SetUserStatusDto,
  UpdateUserDto,
  UserListQueryDto,
} from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @RequirePermissions(PERMISSIONS.USER_VIEW)
  @Get()
  list(@CurrentUser() principal: AuthPrincipal, @Query() query: UserListQueryDto) {
    return this.users.list(principal, query);
  }

  @RequirePermissions(PERMISSIONS.USER_VIEW)
  @Get(':userId')
  get(
    @CurrentUser() principal: AuthPrincipal,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.users.get(principal, userId);
  }

  @RequirePermissions(PERMISSIONS.USER_CREATE)
  @Post()
  create(@CurrentUser() principal: AuthPrincipal, @Body() dto: CreateUserDto) {
    return this.users.create(principal, dto);
  }

  @RequirePermissions(PERMISSIONS.USER_UPDATE)
  @Patch(':userId')
  update(
    @CurrentUser() principal: AuthPrincipal,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(principal, userId, dto);
  }

  @RequirePermissions(PERMISSIONS.USER_MANAGE_STATUS)
  @Patch(':userId/status')
  setStatus(
    @CurrentUser() principal: AuthPrincipal,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: SetUserStatusDto,
  ) {
    return this.users.setStatus(principal, userId, dto);
  }

  @RequirePermissions(PERMISSIONS.USER_ASSIGN_ROLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(':userId/roles')
  assignRole(
    @CurrentUser() principal: AuthPrincipal,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: RoleAssignmentDto,
  ) {
    return this.users.assignRole(principal, userId, dto.roleId);
  }

  @RequirePermissions(PERMISSIONS.USER_ASSIGN_ROLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':userId/roles/:roleId')
  removeRole(
    @CurrentUser() principal: AuthPrincipal,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('roleId', new ParseUUIDPipe()) roleId: string,
  ) {
    return this.users.removeRole(principal, userId, roleId);
  }

  @RequirePermissions(PERMISSIONS.USER_MANAGE_PASSWORD)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(':userId/password')
  setPassword(
    @CurrentUser() principal: AuthPrincipal,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: AdminSetPasswordDto,
  ) {
    return this.users.setPassword(principal, userId, dto);
  }
}
