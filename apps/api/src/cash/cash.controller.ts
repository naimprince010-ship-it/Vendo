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
import { CashService } from './cash.service';
import {
  CashMovementQueryDto,
  CashShiftQueryDto,
  CloseCashShiftDto,
  CreateExpenseCategoryDto,
  ExpenseCategoryStatusDto,
  ExpenseCategoryQueryDto,
  ExpenseQueryDto,
  ManualCashMovementDto,
  OpenCashShiftDto,
  PostExpenseDto,
  ReverseExpenseDto,
  UpdateExpenseCategoryDto,
} from './dto/cash.dto';

@ApiTags('cash-and-expenses')
@ApiBearerAuth()
@ApiHeader({ name: 'x-branch-id', required: true })
@UseGuards(ActiveBranchGuard)
@Controller()
export class CashController {
  constructor(private readonly cash: CashService) {}

  @RequirePermissions(PERMISSIONS.CASH_OPEN_SHIFT)
  @Post('cash/shifts/open')
  open(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Headers('idempotency-key') key: string,
    @Body() dto: OpenCashShiftDto,
  ) {
    return this.cash.openShift(p, b, key, dto);
  }

  @RequirePermissions(PERMISSIONS.CASH_VIEW_SHIFT)
  @Get('cash/shifts/current')
  current(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Query('registerId', ParseUUIDPipe) registerId: string,
  ) {
    return this.cash.current(p, b, registerId);
  }

  @RequirePermissions(PERMISSIONS.CASH_VIEW_SHIFT)
  @Get('cash/shifts')
  shifts(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Query() q: CashShiftQueryDto,
  ) {
    return this.cash.listShifts(p, b, q);
  }

  @RequirePermissions(PERMISSIONS.CASH_VIEW_SHIFT)
  @Get('cash/shifts/:id')
  summary(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cash.summary(p, b, id);
  }

  @RequirePermissions(PERMISSIONS.CASH_IN)
  @Post('cash/movements/in')
  cashIn(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Headers('idempotency-key') key: string,
    @Body() dto: ManualCashMovementDto,
  ) {
    return this.cash.cashIn(p, b, key, dto);
  }

  @RequirePermissions(PERMISSIONS.CASH_OUT)
  @Post('cash/movements/out')
  cashOut(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Headers('idempotency-key') key: string,
    @Body() dto: ManualCashMovementDto,
  ) {
    return this.cash.cashOut(p, b, key, dto);
  }

  @RequirePermissions(PERMISSIONS.CASH_VIEW_HISTORY)
  @Get('cash/movements')
  movements(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Query() q: CashMovementQueryDto,
  ) {
    return this.cash.listMovements(p, b, q);
  }

  @RequirePermissions(PERMISSIONS.CASH_CLOSE_SHIFT)
  @Post('cash/shifts/:id/close')
  close(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: CloseCashShiftDto,
  ) {
    return this.cash.closeShift(p, b, id, key, dto);
  }

  @RequirePermissions(PERMISSIONS.EXPENSE_VIEW)
  @Get('expense-categories')
  categories(@CurrentUser() p: AuthPrincipal, @Query() query: ExpenseCategoryQueryDto) {
    return this.cash.listCategories(p, query.active);
  }

  @RequirePermissions(PERMISSIONS.EXPENSE_CREATE)
  @Post('expense-categories')
  createCategory(@CurrentUser() p: AuthPrincipal, @Body() dto: CreateExpenseCategoryDto) {
    return this.cash.createCategory(p, dto);
  }

  @RequirePermissions(PERMISSIONS.EXPENSE_EDIT)
  @Put('expense-categories/:id')
  updateCategory(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseCategoryDto,
  ) {
    return this.cash.updateCategory(p, id, dto);
  }

  @RequirePermissions(PERMISSIONS.EXPENSE_EDIT)
  @Patch('expense-categories/:id/status')
  categoryStatus(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExpenseCategoryStatusDto,
  ) {
    return this.cash.setCategoryStatus(p, id, dto);
  }

  @RequirePermissions(PERMISSIONS.EXPENSE_POST)
  @Post('expenses')
  expense(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Headers('idempotency-key') key: string,
    @Body() dto: PostExpenseDto,
  ) {
    return this.cash.postExpense(p, b, key, dto);
  }

  @RequirePermissions(PERMISSIONS.EXPENSE_REVERSE)
  @Post('expenses/:id/reverse')
  reverseExpense(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: ReverseExpenseDto,
  ) {
    return this.cash.reverseExpense(p, b, id, key, dto);
  }

  @RequirePermissions(PERMISSIONS.EXPENSE_VIEW)
  @Get('expenses')
  expenses(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Query() q: ExpenseQueryDto,
  ) {
    return this.cash.listExpenses(p, b, q);
  }
}
