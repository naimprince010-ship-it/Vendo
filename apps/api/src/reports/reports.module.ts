import { Module } from '@nestjs/common';
import { BranchesModule } from '../branches/branches.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [BranchesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
