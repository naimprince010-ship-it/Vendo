import { Module } from '@nestjs/common';
import {
  BrandsController,
  CategoriesController,
  ManufacturersController,
  UnitsController,
} from './catalog-masters.controller';
import { CatalogMastersService } from './catalog-masters.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [
    CategoriesController,
    BrandsController,
    ManufacturersController,
    UnitsController,
    ProductsController,
  ],
  providers: [CatalogMastersService, ProductsService],
  exports: [ProductsService],
})
export class CatalogModule {}
