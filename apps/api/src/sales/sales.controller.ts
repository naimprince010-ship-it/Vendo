import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
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
  CompleteSaleDto,
  CollectCustomerPaymentDto,
  PostSaleExchangeDto,
  PostSaleRefundDto,
  PostSaleReturnDto,
  PosCustomerQueryDto,
  PosSearchQueryDto,
  SaleListQueryDto,
  SaleFinancialListQueryDto,
  SaveSaleDto,
  VoidSaleDto,
} from './dto/sales.dto';
import { SalesService } from './sales.service';

@ApiTags('sales')
@ApiBearerAuth()
@ApiHeader({ name: 'x-branch-id', required: true })
@UseGuards(ActiveBranchGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @RequirePermissions(PERMISSIONS.SALE_CREATE)
  @Get('pos/context')
  context(@CurrentUser() principal: AuthPrincipal, @ActiveBranch() branch: ActiveBranchContext) {
    return this.sales.posContext(principal, branch);
  }

  @RequirePermissions(PERMISSIONS.SALE_CREATE)
  @Get('pos/customers')
  customers(@CurrentUser() principal: AuthPrincipal, @Query() query: PosCustomerQueryDto) {
    return this.sales.searchCustomers(principal, query);
  }

  @RequirePermissions(PERMISSIONS.SALE_CREATE)
  @Get('pos/products')
  products(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Query() query: PosSearchQueryDto,
  ) {
    return this.sales.searchProducts(principal, branch, query);
  }

  @RequirePermissions(PERMISSIONS.SALE_CREATE)
  @Post('drafts')
  draft(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Body() dto: SaveSaleDto,
  ) {
    return this.sales.createDraft(principal, branch, dto);
  }

  @RequirePermissions(PERMISSIONS.SALE_CREATE)
  @Put('drafts/:id')
  updateDraft(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SaveSaleDto,
  ) {
    return this.sales.updateDraft(principal, branch, id, dto);
  }

  @RequirePermissions(PERMISSIONS.SALE_CREATE)
  @Post('drafts/:id/hold')
  hold(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.sales.transitionDraft(principal, branch, id, 'hold');
  }

  @RequirePermissions(PERMISSIONS.SALE_CREATE)
  @Post('drafts/:id/resume')
  resume(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.sales.transitionDraft(principal, branch, id, 'resume');
  }

  @RequirePermissions(PERMISSIONS.SALE_CREATE)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @Post('complete')
  complete(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Headers('idempotency-key') key: string,
    @Body() dto: CompleteSaleDto,
  ) {
    return this.sales.complete(principal, branch, key, dto);
  }

  @RequirePermissions(PERMISSIONS.CUSTOMER_COLLECT_PAYMENT)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @Post('collections')
  collection(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Headers('idempotency-key') key: string,
    @Body() dto: CollectCustomerPaymentDto,
  ) {
    return this.sales.collectCustomerPayment(principal, branch, key, dto);
  }

  @RequirePermissions(PERMISSIONS.CUSTOMER_VIEW_PAYMENTS)
  @Get('collections')
  collections(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Query() query: SaleFinancialListQueryDto,
  ) {
    return this.sales.listCollections(principal, branch, query);
  }

  @RequirePermissions(PERMISSIONS.SALE_RETURN)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @Post('returns')
  saleReturn(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Headers('idempotency-key') key: string,
    @Body() dto: PostSaleReturnDto,
  ) {
    return this.sales.postReturn(principal, branch, key, dto);
  }

  @RequirePermissions(PERMISSIONS.SALE_VIEW)
  @Get('returns')
  returns(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Query() query: SaleFinancialListQueryDto,
  ) {
    return this.sales.listReturns(principal, branch, query);
  }

  @RequirePermissions(PERMISSIONS.SALE_REFUND)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @Post('refunds')
  refund(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Headers('idempotency-key') key: string,
    @Body() dto: PostSaleRefundDto,
  ) {
    return this.sales.postRefund(principal, branch, key, dto);
  }

  @RequirePermissions(PERMISSIONS.CUSTOMER_VIEW_PAYMENTS)
  @Get('refunds')
  refunds(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Query() query: SaleFinancialListQueryDto,
  ) {
    return this.sales.listRefunds(principal, branch, query);
  }

  @RequirePermissions(PERMISSIONS.SALE_EXCHANGE)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @Post('exchanges')
  exchange(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Headers('idempotency-key') key: string,
    @Body() dto: PostSaleExchangeDto,
  ) {
    return this.sales.postExchange(principal, branch, key, dto);
  }

  @RequirePermissions(PERMISSIONS.SALE_VOID)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @Post(':id/void')
  voidSale(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: VoidSaleDto,
  ) {
    return this.sales.voidSale(principal, branch, id, key, dto.reason, dto.refunds);
  }

  @RequirePermissions(PERMISSIONS.SALE_VIEW)
  @Get()
  list(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Query() query: SaleListQueryDto,
  ) {
    return this.sales.list(principal, branch, query);
  }

  @RequirePermissions(PERMISSIONS.SALE_VIEW)
  @Get(':id')
  detail(
    @CurrentUser() principal: AuthPrincipal,
    @ActiveBranch() branch: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.sales.get(principal, branch, id);
  }
}
