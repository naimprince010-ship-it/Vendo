import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { BranchesModule } from './branches/branches.module';
import { CatalogModule } from './catalog/catalog.module';
import { CashModule } from './cash/cash.module';
import { CompaniesModule } from './companies/companies.module';
import { validateEnvironment } from './config/environment';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { ObservabilityModule } from './observability/observability.module';
import { PartiesModule } from './parties/parties.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { RegistersModule } from './registers/registers.module';
import { ReportsModule } from './reports/reports.module';
import { RolesModule } from './roles/roles.module';
import { SalesModule } from './sales/sales.module';
import { UsersModule } from './users/users.module';
import { WarehousesModule } from './warehouses/warehouses.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    ObservabilityModule,
    AuthModule,
    AuditModule,
    UsersModule,
    RolesModule,
    CompaniesModule,
    BranchesModule,
    CatalogModule,
    CashModule,
    InventoryModule,
    PartiesModule,
    PurchasingModule,
    SalesModule,
    WarehousesModule,
    RegistersModule,
    ReportsModule,
    HealthModule,
  ],
})
export class AppModule {}
