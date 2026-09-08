import { Module } from '@nestjs/common';
import { BranchesModule } from '../branches/branches.module';
import { CashModule } from '../cash/cash.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PurchasingController } from './purchasing.controller';
import { PurchasingService } from './purchasing.service';

@Module({
  imports: [BranchesModule, CashModule, InventoryModule],
  controllers: [PurchasingController],
  providers: [PurchasingService],
  exports: [PurchasingService],
})
export class PurchasingModule {}
