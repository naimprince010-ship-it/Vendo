import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PriceType, ProductType } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const upper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const slug = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string'
    ? value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    : value;
const decimal = /^\d{1,14}(?:\.\d{1,10})?$/;
const positiveDecimal = /^(?:0\.\d*[1-9]\d*|[1-9]\d*(?:\.\d+)?)$/;

export class ListQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() limit = 25;
  @Transform(trim) @IsString() @Length(1, 120) @IsOptional() search?: string;
  @Transform(({ value }): unknown => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ProductListQueryDto extends ListQueryDto {
  @IsEnum(ProductType) @IsOptional() type?: ProductType;
  @IsUUID('4') @IsOptional() categoryId?: string;
  @IsUUID('4') @IsOptional() brandId?: string;
  @IsUUID('4') @IsOptional() manufacturerId?: string;
}

export class CreateNamedDto {
  @Transform(trim) @IsString() @Length(1, 160) name!: string;
  @Transform(slug) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string;
}
export class UpdateNamedDto {
  @Transform(trim) @IsString() @Length(1, 160) @IsOptional() name?: string;
  @Transform(slug) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @IsOptional() slug?: string;
}
export class CreateCategoryDto extends CreateNamedDto {
  @IsUUID('4') @IsOptional() parentId?: string;
}
export class UpdateCategoryDto extends UpdateNamedDto {
  @IsUUID('4') @IsOptional() parentId?: string;
}
export class StatusDto {
  @IsBoolean() isActive!: boolean;
}

export class CreateUnitDto {
  @Transform(upper) @Matches(/^[A-Z0-9][A-Z0-9_-]{0,23}$/) code!: string;
  @Transform(trim) @IsString() @Length(1, 80) name!: string;
  @IsInt() @Min(0) @Max(10) @IsOptional() decimalScale = 6;
}
export class UpdateUnitDto {
  @Transform(trim) @IsString() @Length(1, 80) @IsOptional() name?: string;
  @IsInt() @Min(0) @Max(10) @IsOptional() decimalScale?: number;
}

export class TileProfileDto {
  @Transform(trim) @Matches(positiveDecimal) width!: string;
  @Transform(trim) @Matches(positiveDecimal) height!: string;
  @IsIn(['MM', 'CM', 'INCH']) dimensionUnit!: 'MM' | 'CM' | 'INCH';
  @Transform(trim) @Matches(decimal) @IsOptional() thicknessMm?: string;
  @Transform(trim) @IsString() @Length(1, 80) @IsOptional() displaySize?: string;
  @Transform(trim) @IsString() @Length(1, 120) @IsOptional() series?: string;
  @Transform(trim) @IsString() @Length(1, 80) @IsOptional() finish?: string;
  @Transform(trim) @IsString() @Length(1, 80) @IsOptional() surface?: string;
  @Transform(trim) @IsString() @Length(1, 80) @IsOptional() color?: string;
  @Transform(trim) @IsString() @Length(1, 40) @IsOptional() grade?: string;
  @Transform(upper) @Matches(/^[A-Z]{2}$/) @IsOptional() countryOfOrigin?: string;
}

export class SanitaryProfileDto {
  @Transform(trim) @IsString() @Length(1, 100) @IsOptional() size?: string;
  @Transform(trim) @IsString() @Length(1, 80) @IsOptional() color?: string;
  @Transform(trim) @IsString() @Length(1, 100) @IsOptional() material?: string;
  @Transform(trim) @IsString() @Length(1, 80) @IsOptional() finish?: string;
  @IsInt() @Min(0) @Max(1200) @IsOptional() warrantyMonths?: number;
  @Transform(trim) @IsString() @Length(1, 500) @IsOptional() warrantyDetails?: string;
}

export class ConversionDto {
  @IsUUID('4') unitId!: string;
  @Transform(trim) @Matches(positiveDecimal) factorToBase!: string;
}
export class BarcodeDto {
  @Transform(trim) @IsString() @Length(3, 120) barcode!: string;
  @IsUUID('4') @IsOptional() unitId?: string;
  @IsBoolean() @IsOptional() isPrimary = false;
}
export class PriceDto {
  @IsUUID('4') unitId!: string;
  @IsEnum(PriceType) type!: PriceType;
  @Transform(trim) @Matches(decimal) amount!: string;
}

export class CreateProductDto {
  @Transform(upper) @Matches(/^[A-Z0-9][A-Z0-9._-]{0,79}$/) sku!: string;
  @Transform(trim) @IsString() @Length(1, 200) name!: string;
  @IsEnum(ProductType) type!: ProductType;
  @IsUUID('4') baseUnitId!: string;
  @IsUUID('4') @IsOptional() categoryId?: string;
  @IsUUID('4') @IsOptional() brandId?: string;
  @IsUUID('4') @IsOptional() manufacturerId?: string;
  @Transform(trim) @IsString() @Length(1, 120) @IsOptional() model?: string;
  @Transform(trim) @IsString() @Length(1, 4000) @IsOptional() description?: string;
  @Transform(trim) @Matches(decimal) @IsOptional() standardCost?: string;
  @Transform(trim) @Matches(decimal) @IsOptional() reorderLevel?: string;
  @IsBoolean() @IsOptional() trackInventory = true;
  @IsBoolean() @IsOptional() batchTracking = false;
  @ValidateNested() @Type(() => TileProfileDto) @IsOptional() tileProfile?: TileProfileDto;
  @ValidateNested()
  @Type(() => SanitaryProfileDto)
  @IsOptional()
  sanitaryProfile?: SanitaryProfileDto;
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ConversionDto)
  @IsOptional()
  conversions: ConversionDto[] = [];
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => BarcodeDto)
  @IsOptional()
  barcodes: BarcodeDto[] = [];
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => PriceDto)
  @IsOptional()
  prices: PriceDto[] = [];
}

export class UpdateProductDto {
  @Transform(trim) @IsString() @Length(1, 200) @IsOptional() name?: string;
  @IsUUID('4') @IsOptional() categoryId?: string;
  @IsUUID('4') @IsOptional() brandId?: string;
  @IsUUID('4') @IsOptional() manufacturerId?: string;
  @Transform(trim) @IsString() @Length(1, 120) @IsOptional() model?: string;
  @Transform(trim) @IsString() @Length(1, 4000) @IsOptional() description?: string;
  @Transform(trim) @Matches(decimal) @IsOptional() standardCost?: string;
  @Transform(trim) @Matches(decimal) @IsOptional() reorderLevel?: string;
  @IsBoolean() @IsOptional() trackInventory?: boolean;
  @IsBoolean() @IsOptional() batchTracking?: boolean;
}

export class ConvertQuantityDto {
  @IsUUID('4') unitId!: string;
  @Transform(trim) @Matches(decimal) quantity!: string;
}
