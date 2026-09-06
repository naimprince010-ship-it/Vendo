import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { CurrentUser } from '../authorization/current-user.decorator';
import { PERMISSIONS } from '../authorization/permission-catalog';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import {
  BarcodeDto,
  ConversionDto,
  ConvertQuantityDto,
  CreateProductDto,
  PriceDto,
  ProductListQueryDto,
  SanitaryProfileDto,
  StatusDto,
  TileProfileDto,
  UpdateProductDto,
} from './dto/catalog.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}
  @RequirePermissions(PERMISSIONS.PRODUCT_VIEW) @Get() list(
    @CurrentUser() p: AuthPrincipal,
    @Query() q: ProductListQueryDto,
  ) {
    return this.products.list(p, q);
  }
  @RequirePermissions(PERMISSIONS.PRODUCT_VIEW) @Get('barcode/:barcode') barcode(
    @CurrentUser() p: AuthPrincipal,
    @Param('barcode') barcode: string,
  ) {
    return this.products.lookupBarcode(p, barcode);
  }
  @RequirePermissions(PERMISSIONS.PRODUCT_VIEW) @Get(':id') get(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.products.get(p, id);
  }
  @RequirePermissions(PERMISSIONS.PRODUCT_CREATE) @Post() create(
    @CurrentUser() p: AuthPrincipal,
    @Body() dto: CreateProductDto,
  ) {
    return this.products.create(p, dto);
  }
  @RequirePermissions(PERMISSIONS.PRODUCT_EDIT) @Patch(':id') update(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(p, id, dto);
  }
  @RequirePermissions(PERMISSIONS.PRODUCT_EDIT) @Patch(':id/status') status(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: StatusDto,
  ) {
    return this.products.status(p, id, dto);
  }
  @RequirePermissions(PERMISSIONS.PRODUCT_EDIT) @Put(':id/tile-profile') tile(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: TileProfileDto,
  ) {
    return this.products.setTileProfile(p, id, dto);
  }
  @RequirePermissions(PERMISSIONS.PRODUCT_EDIT) @Put(':id/sanitary-profile') sanitary(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SanitaryProfileDto,
  ) {
    return this.products.setSanitaryProfile(p, id, dto);
  }
  @RequirePermissions(PERMISSIONS.PRODUCT_EDIT) @Put(':id/conversions') conversion(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ConversionDto,
  ) {
    return this.products.setConversion(p, id, dto);
  }
  @RequirePermissions(PERMISSIONS.PRODUCT_VIEW) @Post(':id/convert') convert(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ConvertQuantityDto,
  ) {
    return this.products.convert(p, id, dto);
  }
  @RequirePermissions(PERMISSIONS.PRODUCT_EDIT) @Post(':id/barcodes') addBarcode(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: BarcodeDto,
  ) {
    return this.products.addBarcode(p, id, dto);
  }
  @RequirePermissions(PERMISSIONS.PRODUCT_EDIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/barcodes/:barcodeId')
  removeBarcode(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('barcodeId', new ParseUUIDPipe()) barcodeId: string,
  ) {
    return this.products.removeBarcode(p, id, barcodeId);
  }
  @RequirePermissions(PERMISSIONS.PRICING_MANAGE) @Put(':id/prices') price(
    @CurrentUser() p: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: PriceDto,
  ) {
    return this.products.setPrice(p, id, dto);
  }
}
