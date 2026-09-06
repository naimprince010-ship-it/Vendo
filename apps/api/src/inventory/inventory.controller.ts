import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import type { AuthPrincipal } from '../authorization/auth-principal';
import type { ActiveBranchContext } from '../authorization/authenticated-request';
import { CurrentUser } from '../authorization/current-user.decorator';
import { PERMISSIONS } from '../authorization/permission-catalog';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { ActiveBranch } from '../branches/active-branch.decorator';
import { ActiveBranchGuard } from '../branches/active-branch.guard';
import {
  AdjustmentDto,
  BatchListQueryDto,
  BatchStatusDto,
  CountListQueryDto,
  CreateBatchDto,
  CreatePhysicalCountDto,
  InventoryListQueryDto,
  ReplaceCountItemsDto,
  StockOperationDto,
  TransferDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@ApiHeader({ name: 'x-branch-id', required: true })
@UseGuards(ActiveBranchGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @RequirePermissions(PERMISSIONS.INVENTORY_OPENING)
  @Post('opening')
  opening(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Headers('idempotency-key') key: string,
    @Body() dto: StockOperationDto,
  ) {
    return this.inventory.opening(principal, branch, key, dto);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY_ADJUST)
  @Post('adjustments')
  adjustment(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Headers('idempotency-key') key: string,
    @Body() dto: AdjustmentDto,
  ) {
    return this.inventory.adjustment(principal, branch, key, dto);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY_DAMAGE)
  @Post('damage')
  damage(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Headers('idempotency-key') key: string,
    @Body() dto: StockOperationDto,
  ) {
    return this.inventory.damage(principal, branch, key, dto);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY_LOSS)
  @Post('loss')
  loss(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Headers('idempotency-key') key: string,
    @Body() dto: StockOperationDto,
  ) {
    return this.inventory.loss(principal, branch, key, dto);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY_TRANSFER)
  @Post('transfers')
  transfer(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Headers('idempotency-key') key: string,
    @Body() dto: TransferDto,
  ) {
    return this.inventory.transfer(principal, branch, key, dto);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY_BATCH_MANAGE)
  @Post('batches')
  createBatch(@CurrentUser() principal: AuthPrincipal, @Body() dto: CreateBatchDto) {
    return this.inventory.createBatch(principal, dto);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY_BATCH_MANAGE)
  @Patch('batches/:id/status')
  batchStatus(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: BatchStatusDto,
  ) {
    return this.inventory.setBatchStatus(principal, id, dto);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @Get('batches')
  batches(@CurrentUser() principal: AuthPrincipal, @Query() query: BatchListQueryDto) {
    return this.inventory.listBatches(principal, query);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @Get('balances')
  balances(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Query() query: InventoryListQueryDto,
  ) {
    return this.inventory.balances(principal, branch, query);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @Get('low-stock')
  lowStock(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Query() query: InventoryListQueryDto,
  ) {
    return this.inventory.lowStock(principal, branch, query);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY_HISTORY)
  @Get('movements')
  history(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Query() query: InventoryListQueryDto,
  ) {
    return this.inventory.history(principal, branch, query);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY_COUNT)
  @Post('counts')
  createCount(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Body() dto: CreatePhysicalCountDto,
  ) {
    return this.inventory.createCount(principal, branch, dto);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY_COUNT)
  @Put('counts/:id/items')
  replaceCountItems(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReplaceCountItemsDto,
  ) {
    return this.inventory.replaceCountItems(principal, branch, id, dto);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY_COUNT)
  @Post('counts/:id/review')
  reviewCount(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.inventory.reviewCount(principal, branch, id);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY_COUNT)
  @Post('counts/:id/reopen')
  reopenCount(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.inventory.reopenCount(principal, branch, id);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY_RECONCILE)
  @Post('counts/:id/post')
  postCount(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.inventory.postCount(principal, branch, id, key);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @Get('counts')
  counts(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Query() query: CountListQueryDto,
  ) {
    return this.inventory.listCounts(principal, branch, query);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @Get('counts/:id')
  count(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.inventory.getCount(principal, branch, id);
  }
}
