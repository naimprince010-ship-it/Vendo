import { Module } from '@nestjs/common';
import {
  CustomerGroupsController,
  CustomersController,
  SuppliersController,
} from './parties.controller';
import { PartiesService } from './parties.service';

@Module({
  controllers: [CustomerGroupsController, CustomersController, SuppliersController],
  providers: [PartiesService],
  exports: [PartiesService],
})
export class PartiesModule {}
