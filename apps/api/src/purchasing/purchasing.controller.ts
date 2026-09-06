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
  CreatePurchaseInvoiceDto,
  CreatePurchaseOrderDto,
  PostGoodsReceiptDto,
  PostPurchaseReturnDto,
  PostSupplierPaymentDto,
  PurchaseListQueryDto,
  UpdatePurchaseOrderDto,
} from './dto/purchasing.dto';
import { PurchasingService } from './purchasing.service';

@ApiTags('purchasing')
@ApiBearerAuth()
@ApiHeader({ name: 'x-branch-id', required: true })
@UseGuards(ActiveBranchGuard)
@Controller('purchases')
export class PurchasingController {
  constructor(private readonly purchasing: PurchasingService) {}

  @RequirePermissions(PERMISSIONS.PURCHASE_CREATE)
  @Post('orders')
  createOrder(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.purchasing.createOrder(p, b, dto);
  }

  @RequirePermissions(PERMISSIONS.PURCHASE_EDIT)
  @Put('orders/:id')
  updateOrder(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.purchasing.updateOrder(p, b, id, dto);
  }

  @RequirePermissions(PERMISSIONS.PURCHASE_APPROVE)
  @Post('orders/:id/submit')
  submit(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.purchasing.transitionOrder(p, b, id, 'submit');
  }

  @RequirePermissions(PERMISSIONS.PURCHASE_APPROVE)
  @Post('orders/:id/confirm')
  confirm(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.purchasing.transitionOrder(p, b, id, 'confirm');
  }

  @RequirePermissions(PERMISSIONS.PURCHASE_APPROVE)
  @Post('orders/:id/cancel')
  cancel(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.purchasing.transitionOrder(p, b, id, 'cancel');
  }

  @RequirePermissions(PERMISSIONS.PURCHASE_APPROVE)
  @Post('orders/:id/close')
  close(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.purchasing.transitionOrder(p, b, id, 'close');
  }

  @RequirePermissions(PERMISSIONS.PURCHASE_VIEW)
  @Get('orders')
  orders(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Query() q: PurchaseListQueryDto,
  ) {
    return this.purchasing.listOrders(p, b, q);
  }

  @RequirePermissions(PERMISSIONS.PURCHASE_VIEW)
  @Get('orders/:id')
  order(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.purchasing.getOrder(p, b, id);
  }

  @RequirePermissions(PERMISSIONS.PURCHASE_RECEIVE)
  @Post('receipts')
  receipt(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Headers('idempotency-key') key: string,
    @Body() dto: PostGoodsReceiptDto,
  ) {
    return this.purchasing.postReceipt(p, b, key, dto);
  }

  @RequirePermissions(PERMISSIONS.PURCHASE_VIEW)
  @Get('receipts')
  receipts(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Query() q: PurchaseListQueryDto,
  ) {
    return this.purchasing.listReceipts(p, b, q);
  }

  @RequirePermissions(PERMISSIONS.PURCHASE_VIEW)
  @Get('receipts/:id')
  receiptDetail(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.purchasing.getReceipt(p, b, id);
  }

  @RequirePermissions(PERMISSIONS.PURCHASE_INVOICE)
  @Post('invoices')
  invoice(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Body() dto: CreatePurchaseInvoiceDto,
  ) {
    return this.purchasing.createInvoice(p, b, dto);
  }

  @RequirePermissions(PERMISSIONS.PURCHASE_INVOICE)
  @Post('invoices/:id/post')
  postInvoice(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.purchasing.postInvoice(p, b, id, key);
  }

  @RequirePermissions(PERMISSIONS.PURCHASE_VIEW)
  @Get('invoices')
  invoices(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Query() q: PurchaseListQueryDto,
  ) {
    return this.purchasing.listInvoices(p, b, q);
  }

  @RequirePermissions(PERMISSIONS.PURCHASE_VIEW)
  @Get('invoices/:id')
  invoiceDetail(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.purchasing.getInvoice(p, b, id);
  }

  @RequirePermissions(PERMISSIONS.SUPPLIER_PAYMENT_VIEW)
  @Get('payment-methods')
  paymentMethods(@CurrentUser() p: AuthPrincipal) {
    return this.purchasing.paymentMethods(p);
  }

  @RequirePermissions(PERMISSIONS.SUPPLIER_PAYMENT_CREATE)
  @Post('payments')
  payment(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Headers('idempotency-key') key: string,
    @Body() dto: PostSupplierPaymentDto,
  ) {
    return this.purchasing.postPayment(p, b, key, dto);
  }

  @RequirePermissions(PERMISSIONS.SUPPLIER_PAYMENT_VIEW)
  @Get('payments')
  payments(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Query() q: PurchaseListQueryDto,
  ) {
    return this.purchasing.listPayments(p, b, q);
  }

  @RequirePermissions(PERMISSIONS.PURCHASE_RETURN)
  @Post('returns')
  purchaseReturn(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Headers('idempotency-key') key: string,
    @Body() dto: PostPurchaseReturnDto,
  ) {
    return this.purchasing.postReturn(p, b, key, dto);
  }

  @RequirePermissions(PERMISSIONS.PURCHASE_VIEW)
  @Get('returns')
  returns(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Query() q: PurchaseListQueryDto,
  ) {
    return this.purchasing.listReturns(p, b, q);
  }

  @RequirePermissions(PERMISSIONS.SUPPLIER_VIEW_LEDGER)
  @Get('suppliers/:id/due')
  due(@CurrentUser() p: AuthPrincipal, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.purchasing.supplierDue(p, id);
  }
}
