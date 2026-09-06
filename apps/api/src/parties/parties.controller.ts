import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { CurrentUser } from '../authorization/current-user.decorator';
import { PERMISSIONS } from '../authorization/permission-catalog';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import {
  CorrectOpeningBalanceDto,
  CreateCustomerDto,
  CreateCustomerGroupDto,
  CreateSupplierDto,
  CreditLimitDto,
  CustomerLedgerQueryDto,
  PartyListQueryDto,
  PostLedgerAmountDto,
  StatusDto,
  SupplierLedgerQueryDto,
  UpdateCustomerDto,
  UpdateCustomerGroupDto,
  UpdateSupplierDto,
} from './dto/parties.dto';
import { PartiesService } from './parties.service';

@ApiTags('customer-groups')
@ApiBearerAuth()
@Controller('customer-groups')
export class CustomerGroupsController {
  constructor(private readonly parties: PartiesService) {}

  @RequirePermissions(PERMISSIONS.CUSTOMER_GROUP_VIEW)
  @Get()
  list(@CurrentUser() principal: AuthPrincipal, @Query() query: PartyListQueryDto) {
    return this.parties.listGroups(principal, query);
  }

  @RequirePermissions(PERMISSIONS.CUSTOMER_GROUP_VIEW)
  @Get(':id')
  get(@CurrentUser() principal: AuthPrincipal, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.parties.getGroup(principal, id);
  }

  @RequirePermissions(PERMISSIONS.CUSTOMER_GROUP_MANAGE)
  @Post()
  create(@CurrentUser() principal: AuthPrincipal, @Body() dto: CreateCustomerGroupDto) {
    return this.parties.createGroup(principal, dto);
  }

  @RequirePermissions(PERMISSIONS.CUSTOMER_GROUP_MANAGE)
  @Patch(':id')
  update(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCustomerGroupDto,
  ) {
    return this.parties.updateGroup(principal, id, dto);
  }

  @RequirePermissions(PERMISSIONS.CUSTOMER_GROUP_MANAGE)
  @Patch(':id/status')
  status(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: StatusDto,
  ) {
    return this.parties.groupStatus(principal, id, dto);
  }
}

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly parties: PartiesService) {}

  @RequirePermissions(PERMISSIONS.CUSTOMER_VIEW)
  @Get()
  list(@CurrentUser() principal: AuthPrincipal, @Query() query: PartyListQueryDto) {
    return this.parties.listCustomers(principal, query);
  }

  @RequirePermissions(PERMISSIONS.CUSTOMER_VIEW)
  @Get(':id')
  get(@CurrentUser() principal: AuthPrincipal, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.parties.getCustomer(principal, id);
  }

  @RequirePermissions(PERMISSIONS.CUSTOMER_CREATE)
  @Post()
  create(@CurrentUser() principal: AuthPrincipal, @Body() dto: CreateCustomerDto) {
    return this.parties.createCustomer(principal, dto);
  }

  @RequirePermissions(PERMISSIONS.CUSTOMER_EDIT)
  @Patch(':id')
  update(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.parties.updateCustomer(principal, id, dto);
  }

  @RequirePermissions(PERMISSIONS.CUSTOMER_EDIT)
  @Patch(':id/status')
  status(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: StatusDto,
  ) {
    return this.parties.customerStatus(principal, id, dto);
  }

  @RequirePermissions(PERMISSIONS.CUSTOMER_MANAGE_CREDIT)
  @Patch(':id/credit-limit')
  credit(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreditLimitDto,
  ) {
    return this.parties.setCreditLimit(principal, id, dto);
  }

  @RequirePermissions(PERMISSIONS.CUSTOMER_VIEW_LEDGER)
  @Get(':id/ledger')
  ledger(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: CustomerLedgerQueryDto,
  ) {
    return this.parties.customerLedger(principal, id, query);
  }

  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @RequirePermissions(PERMISSIONS.CUSTOMER_ADJUST_BALANCE)
  @Post(':id/ledger/opening')
  opening(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: PostLedgerAmountDto,
  ) {
    return this.parties.postCustomerOpening(principal, id, key, dto);
  }

  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @RequirePermissions(PERMISSIONS.CUSTOMER_ADJUST_BALANCE)
  @Post(':id/ledger/opening-corrections')
  correctOpening(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: CorrectOpeningBalanceDto,
  ) {
    return this.parties.correctCustomerOpening(principal, id, key, dto);
  }

  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @RequirePermissions(PERMISSIONS.CUSTOMER_ADJUST_BALANCE)
  @Post(':id/ledger/adjustments')
  adjustment(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: PostLedgerAmountDto,
  ) {
    return this.parties.postCustomerAdjustment(principal, id, key, dto);
  }
}

@ApiTags('suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly parties: PartiesService) {}

  @RequirePermissions(PERMISSIONS.SUPPLIER_VIEW)
  @Get()
  list(@CurrentUser() principal: AuthPrincipal, @Query() query: PartyListQueryDto) {
    return this.parties.listSuppliers(principal, query);
  }

  @RequirePermissions(PERMISSIONS.SUPPLIER_VIEW)
  @Get(':id')
  get(@CurrentUser() principal: AuthPrincipal, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.parties.getSupplier(principal, id);
  }

  @RequirePermissions(PERMISSIONS.SUPPLIER_CREATE)
  @Post()
  create(@CurrentUser() principal: AuthPrincipal, @Body() dto: CreateSupplierDto) {
    return this.parties.createSupplier(principal, dto);
  }

  @RequirePermissions(PERMISSIONS.SUPPLIER_EDIT)
  @Patch(':id')
  update(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.parties.updateSupplier(principal, id, dto);
  }

  @RequirePermissions(PERMISSIONS.SUPPLIER_EDIT)
  @Patch(':id/status')
  status(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: StatusDto,
  ) {
    return this.parties.supplierStatus(principal, id, dto);
  }

  @RequirePermissions(PERMISSIONS.SUPPLIER_VIEW_LEDGER)
  @Get(':id/ledger')
  ledger(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: SupplierLedgerQueryDto,
  ) {
    return this.parties.supplierLedger(principal, id, query);
  }

  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @RequirePermissions(PERMISSIONS.SUPPLIER_ADJUST_BALANCE)
  @Post(':id/ledger/opening')
  opening(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: PostLedgerAmountDto,
  ) {
    return this.parties.postSupplierOpening(principal, id, key, dto);
  }

  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @RequirePermissions(PERMISSIONS.SUPPLIER_ADJUST_BALANCE)
  @Post(':id/ledger/opening-corrections')
  correctOpening(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: CorrectOpeningBalanceDto,
  ) {
    return this.parties.correctSupplierOpening(principal, id, key, dto);
  }

  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @RequirePermissions(PERMISSIONS.SUPPLIER_ADJUST_BALANCE)
  @Post(':id/ledger/adjustments')
  adjustment(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: PostLedgerAmountDto,
  ) {
    return this.parties.postSupplierAdjustment(principal, id, key, dto);
  }
}
