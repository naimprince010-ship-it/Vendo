import { Module } from '@nestjs/common';
import { BranchesModule } from '../branches/branches.module';
import { CashController } from './cash.controller';
import { CashService } from './cash.service';

@Module({
  imports: [BranchesModule],
  controllers: [CashController],
  providers: [CashService],
  exports: [CashService],
})
export class CashModule {}
