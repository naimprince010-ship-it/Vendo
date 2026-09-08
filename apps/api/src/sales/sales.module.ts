import { Module } from '@nestjs/common';
import { BranchesModule } from '../branches/branches.module';
import { CashModule } from '../cash/cash.module';
import { InventoryModule } from '../inventory/inventory.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [BranchesModule, CashModule, InventoryModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
