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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import type { AuthPrincipal } from '../authorization/auth-principal';
import type { ActiveBranchContext } from '../authorization/authenticated-request';
import { CurrentUser } from '../authorization/current-user.decorator';
import { PERMISSIONS } from '../authorization/permission-catalog';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { ActiveBranch } from './active-branch.decorator';
import { ActiveBranchGuard } from './active-branch.guard';
import { BranchesService } from './branches.service';
import {
  BranchAccessDto,
  BranchListQueryDto,
  CreateBranchDto,
  SetLocationStatusDto,
  UpdateBranchDto,
} from './dto/branch.dto';

@ApiTags('branches')
@ApiBearerAuth()
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @ApiHeader({ name: 'x-branch-id', required: true })
  @UseGuards(ActiveBranchGuard)
  @Get('active-context')
  activeContext(@ActiveBranch() branch: ActiveBranchContext) {
    return branch;
  }

  @RequirePermissions(PERMISSIONS.BRANCH_VIEW)
  @Get()
  list(@CurrentUser() principal: AuthPrincipal, @Query() query: BranchListQueryDto) {
    return this.branches.list(principal, query);
  }

  @RequirePermissions(PERMISSIONS.BRANCH_VIEW)
  @Get(':branchId')
  get(
    @CurrentUser() principal: AuthPrincipal,
    @Param('branchId', new ParseUUIDPipe()) branchId: string,
  ) {
    return this.branches.get(principal, branchId);
  }

  @RequirePermissions(PERMISSIONS.BRANCH_CREATE)
  @Post()
  create(@CurrentUser() principal: AuthPrincipal, @Body() dto: CreateBranchDto) {
    return this.branches.create(principal, dto);
  }

  @RequirePermissions(PERMISSIONS.BRANCH_EDIT)
  @Patch(':branchId')
  update(
    @CurrentUser() principal: AuthPrincipal,
    @Param('branchId', new ParseUUIDPipe()) branchId: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branches.update(principal, branchId, dto);
  }

  @RequirePermissions(PERMISSIONS.BRANCH_EDIT)
  @Patch(':branchId/status')
  setStatus(
    @CurrentUser() principal: AuthPrincipal,
    @Param('branchId', new ParseUUIDPipe()) branchId: string,
    @Body() dto: SetLocationStatusDto,
  ) {
    return this.branches.setStatus(principal, branchId, dto);
  }
}

@ApiTags('user branch access')
@ApiBearerAuth()
@Controller('users/:userId/branches')
export class UserBranchAccessController {
  constructor(private readonly branches: BranchesService) {}

  @RequirePermissions(PERMISSIONS.BRANCH_MANAGE_ACCESS)
  @Get()
  list(
    @CurrentUser() principal: AuthPrincipal,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.branches.listUserAccess(principal, userId);
  }

  @RequirePermissions(PERMISSIONS.BRANCH_MANAGE_ACCESS)
  @Post()
  grant(
    @CurrentUser() principal: AuthPrincipal,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: BranchAccessDto,
  ) {
    return this.branches.grantAccess(principal, userId, dto.branchId);
  }

  @RequirePermissions(PERMISSIONS.BRANCH_MANAGE_ACCESS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':branchId')
  revoke(
    @CurrentUser() principal: AuthPrincipal,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('branchId', new ParseUUIDPipe()) branchId: string,
  ) {
    return this.branches.revokeAccess(principal, userId, branchId);
  }
}
