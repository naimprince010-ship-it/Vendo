import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ActiveBranchGuard } from './active-branch.guard';
import { ActiveBranchService } from './active-branch.service';
import { BranchesController, UserBranchAccessController } from './branches.controller';
import { BranchesService } from './branches.service';

@Module({
  imports: [AuthModule],
  controllers: [BranchesController, UserBranchAccessController],
  providers: [BranchesService, ActiveBranchService, ActiveBranchGuard],
  exports: [ActiveBranchService, ActiveBranchGuard],
})
export class BranchesModule {}
