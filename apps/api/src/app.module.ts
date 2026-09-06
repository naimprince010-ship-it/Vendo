import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { BranchesModule } from './branches/branches.module';
import { CatalogModule } from './catalog/catalog.module';
import { CompaniesModule } from './companies/companies.module';
import { validateEnvironment } from './config/environment';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { PartiesModule } from './parties/parties.module';
import { RegistersModule } from './registers/registers.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { WarehousesModule } from './warehouses/warehouses.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CompaniesModule,
    BranchesModule,
    CatalogModule,
    InventoryModule,
    PartiesModule,
    WarehousesModule,
    RegistersModule,
    HealthModule,
  ],
})
export class AppModule {}
