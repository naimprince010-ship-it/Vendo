import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { CurrentUser } from '../authorization/current-user.decorator';
import { PERMISSIONS } from '../authorization/permission-catalog';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { CatalogMastersService } from './catalog-masters.service';
import {
  CreateCategoryDto,
  CreateNamedDto,
  CreateUnitDto,
  ListQueryDto,
  StatusDto,
  UpdateCategoryDto,
  UpdateNamedDto,
  UpdateUnitDto,
} from './dto/catalog.dto';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CatalogMastersService) {}
  @RequirePermissions(PERMISSIONS.CATEGORY_VIEW) @Get() list(
    @CurrentUser() p: AuthPrincipal,
    @Query() q: ListQueryDto,
  ) {
    return this.service.list(p, 'category', q);
  }
  @RequirePermissions(PERMISSIONS.CATEGORY_VIEW) @Get(':id') get(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.get(p, 'category', id);
  }
  @RequirePermissions(PERMISSIONS.CATEGORY_CREATE) @Post() create(
    @CurrentUser() p: AuthPrincipal,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.service.createCategory(p, dto);
  }
  @RequirePermissions(PERMISSIONS.CATEGORY_EDIT) @Patch(':id') update(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.updateCategory(p, id, dto);
  }
  @RequirePermissions(PERMISSIONS.CATEGORY_EDIT) @Patch(':id/status') status(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: StatusDto,
  ) {
    return this.service.status(p, 'category', id, dto);
  }
}

@ApiTags('brands')
@ApiBearerAuth()
@Controller('brands')
export class BrandsController {
  constructor(private readonly service: CatalogMastersService) {}
  @RequirePermissions(PERMISSIONS.BRAND_VIEW) @Get() list(
    @CurrentUser() p: AuthPrincipal,
    @Query() q: ListQueryDto,
  ) {
    return this.service.list(p, 'brand', q);
  }
  @RequirePermissions(PERMISSIONS.BRAND_VIEW) @Get(':id') get(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.get(p, 'brand', id);
  }
  @RequirePermissions(PERMISSIONS.BRAND_CREATE) @Post() create(
    @CurrentUser() p: AuthPrincipal,
    @Body() dto: CreateNamedDto,
  ) {
    return this.service.createNamed(p, 'brand', dto);
  }
  @RequirePermissions(PERMISSIONS.BRAND_EDIT) @Patch(':id') update(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateNamedDto,
  ) {
    return this.service.updateNamed(p, 'brand', id, dto);
  }
  @RequirePermissions(PERMISSIONS.BRAND_EDIT) @Patch(':id/status') status(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: StatusDto,
  ) {
    return this.service.status(p, 'brand', id, dto);
  }
}

@ApiTags('manufacturers')
@ApiBearerAuth()
@Controller('manufacturers')
export class ManufacturersController {
  constructor(private readonly service: CatalogMastersService) {}
  @RequirePermissions(PERMISSIONS.MANUFACTURER_VIEW) @Get() list(
    @CurrentUser() p: AuthPrincipal,
    @Query() q: ListQueryDto,
  ) {
    return this.service.list(p, 'manufacturer', q);
  }
  @RequirePermissions(PERMISSIONS.MANUFACTURER_VIEW) @Get(':id') get(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.get(p, 'manufacturer', id);
  }
  @RequirePermissions(PERMISSIONS.MANUFACTURER_CREATE) @Post() create(
    @CurrentUser() p: AuthPrincipal,
    @Body() dto: CreateNamedDto,
  ) {
    return this.service.createNamed(p, 'manufacturer', dto);
  }
  @RequirePermissions(PERMISSIONS.MANUFACTURER_EDIT) @Patch(':id') update(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateNamedDto,
  ) {
    return this.service.updateNamed(p, 'manufacturer', id, dto);
  }
  @RequirePermissions(PERMISSIONS.MANUFACTURER_EDIT) @Patch(':id/status') status(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: StatusDto,
  ) {
    return this.service.status(p, 'manufacturer', id, dto);
  }
}

@ApiTags('units')
@ApiBearerAuth()
@Controller('units')
export class UnitsController {
  constructor(private readonly service: CatalogMastersService) {}
  @RequirePermissions(PERMISSIONS.UNIT_VIEW) @Get() list(
    @CurrentUser() p: AuthPrincipal,
    @Query() q: ListQueryDto,
  ) {
    return this.service.list(p, 'unit', q);
  }
  @RequirePermissions(PERMISSIONS.UNIT_VIEW) @Get(':id') get(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.get(p, 'unit', id);
  }
  @RequirePermissions(PERMISSIONS.UNIT_MANAGE) @Post() create(
    @CurrentUser() p: AuthPrincipal,
    @Body() dto: CreateUnitDto,
  ) {
    return this.service.createUnit(p, dto);
  }
  @RequirePermissions(PERMISSIONS.UNIT_MANAGE) @Patch(':id') update(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.service.updateUnit(p, id, dto);
  }
  @RequirePermissions(PERMISSIONS.UNIT_MANAGE) @Patch(':id/status') status(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: StatusDto,
  ) {
    return this.service.status(p, 'unit', id, dto);
  }
}
