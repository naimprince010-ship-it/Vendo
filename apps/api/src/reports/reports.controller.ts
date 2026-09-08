import { Controller, Get, Param, ParseUUIDPipe, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthPrincipal } from '../authorization/auth-principal';
import type { ActiveBranchContext } from '../authorization/authenticated-request';
import { CurrentUser } from '../authorization/current-user.decorator';
import { PERMISSIONS } from '../authorization/permission-catalog';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { ActiveBranch } from '../branches/active-branch.decorator';
import { ActiveBranchGuard } from '../branches/active-branch.guard';
import { ReportQueryDto } from './dto/reports.dto';
import { ReportsService, type ReportKind } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@ApiHeader({ name: 'x-branch-id', required: true })
@UseGuards(ActiveBranchGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @RequirePermissions(PERMISSIONS.REPORT_VIEW_SALES)
  @Get('dashboard')
  dashboard(@CurrentUser() p: AuthPrincipal, @ActiveBranch() b: ActiveBranchContext) {
    return this.reports.dashboard(p, b);
  }

  @RequirePermissions(PERMISSIONS.REPORT_VIEW_SALES)
  @Get('sales')
  sales(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Query() q: ReportQueryDto,
  ) {
    return this.reports.sales(p, b, q);
  }

  @RequirePermissions(PERMISSIONS.REPORT_VIEW_SALES)
  @Get('products')
  products(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Query() q: ReportQueryDto,
  ) {
    return this.reports.productSales(p, b, q);
  }

  @RequirePermissions(PERMISSIONS.REPORT_VIEW_INVENTORY)
  @Get('inventory')
  inventory(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Query() q: ReportQueryDto,
  ) {
    return this.reports.inventory(p, b, q);
  }

  @RequirePermissions(PERMISSIONS.REPORT_VIEW_PURCHASES)
  @Get('purchases')
  purchases(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Query() q: ReportQueryDto,
  ) {
    return this.reports.purchases(p, b, q);
  }

  @RequirePermissions(PERMISSIONS.REPORT_VIEW_CUSTOMERS)
  @Get('customers')
  customers(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Query() q: ReportQueryDto,
  ) {
    return this.reports.customers(p, b, q);
  }

  @RequirePermissions(PERMISSIONS.REPORT_VIEW_SUPPLIERS)
  @Get('suppliers')
  suppliers(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Query() q: ReportQueryDto,
  ) {
    return this.reports.suppliers(p, b, q);
  }

  @RequirePermissions(PERMISSIONS.REPORT_VIEW_EXPENSES)
  @Get('expenses')
  expenses(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Query() q: ReportQueryDto,
  ) {
    return this.reports.expenses(p, b, q);
  }

  @RequirePermissions(PERMISSIONS.REPORT_VIEW_CASH)
  @Get('cash')
  cash(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Query() q: ReportQueryDto,
  ) {
    return this.reports.cash(p, b, q);
  }

  @RequirePermissions(PERMISSIONS.REPORT_VIEW_SALES, PERMISSIONS.REPORT_VIEW_PROFIT)
  @Get('financial-summary')
  financial(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Query() q: ReportQueryDto,
  ) {
    return this.reports.financial(p, b, q);
  }

  @RequirePermissions(PERMISSIONS.SALE_VIEW)
  @Get('invoices/:id')
  invoice(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.reports.invoice(p, b, id);
  }

  @Get('exports/:kind')
  async export(
    @CurrentUser() p: AuthPrincipal,
    @ActiveBranch() b: ActiveBranchContext,
    @Param('kind') kind: ReportKind,
    @Query() q: ReportQueryDto,
    @Res() response: Response,
  ) {
    const csv = await this.reports.exportCsv(p, b, kind, q);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="vendo-${kind}.csv"`);
    response.send(`\uFEFF${csv}`);
  }
}
