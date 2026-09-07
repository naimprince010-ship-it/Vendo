import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
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
import { PricingMode, ReturnDisposition, SaleStatus } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const positive = /^(?:0\.\d*[1-9]\d*|[1-9]\d*(?:\.\d+)?)$/;
const nonNegative = /^(?:0|0\.\d+|[1-9]\d*(?:\.\d+)?)$/;

export class PosSearchQueryDto {
  @IsUUID('4') warehouseId!: string;
  @Transform(trim) @IsString() @Length(1, 120) @IsOptional() search?: string;
  @Transform(trim) @IsString() @Length(3, 120) @IsOptional() barcode?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(50) @IsOptional() limit = 20;
}

export class PosCustomerQueryDto {
  @Transform(trim) @IsString() @Length(1, 120) @IsOptional() search?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(50) @IsOptional() limit = 20;
}

export class SaleLineDto {
  @IsUUID('4') productId!: string;
  @IsUUID('4') unitId!: string;
  @IsUUID('4') @IsOptional() batchId?: string;
  @Transform(trim) @Matches(positive) quantity!: string;
  @Transform(trim) @Matches(nonNegative) @IsOptional() requestedUnitPrice?: string;
  @Transform(trim) @IsString() @Length(3, 500) @IsOptional() priceOverrideReason?: string;
  @Transform(trim) @Matches(nonNegative) @IsOptional() discount = '0';
  @Transform(trim) @Matches(nonNegative) @IsOptional() tax = '0';
}

export class SalePaymentInputDto {
  @IsUUID('4') methodId!: string;
  @Transform(trim) @Matches(positive) amount!: string;
  @Transform(trim) @Matches(positive) @IsOptional() tendered?: string;
  @Transform(trim) @IsString() @Length(1, 160) @IsOptional() reference?: string;
}

export class SaveSaleDto {
  @IsUUID('4') warehouseId!: string;
  @IsUUID('4') registerId!: string;
  @IsUUID('4') customerId!: string;
  @IsUUID('4') @IsOptional() salespersonId?: string;
  @IsEnum(PricingMode) pricingMode: PricingMode = PricingMode.RETAIL;
  @Transform(trim) @Matches(nonNegative) @IsOptional() invoiceDiscount = '0';
  @Transform(trim) @Matches(nonNegative) @IsOptional() invoiceTax = '0';
  @Transform(trim) @IsString() @Length(1, 2000) @IsOptional() notes?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SaleLineDto)
  items!: SaleLineDto[];
}

export class CompleteSaleDto extends SaveSaleDto {
  @IsUUID('4') @IsOptional() draftSaleId?: string;
  @ValidateNested() @Type(() => SalePaymentInputDto) @IsOptional() payment?: SalePaymentInputDto;
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SalePaymentInputDto)
  @IsOptional()
  payments?: SalePaymentInputDto[];
}

export class SaleAllocationDto {
  @IsUUID('4') saleId!: string;
  @Transform(trim) @Matches(positive) amount!: string;
}

export class CollectCustomerPaymentDto {
  @IsUUID('4') customerId!: string;
  @IsUUID('4') methodId!: string;
  @Transform(trim) @Matches(positive) amount!: string;
  @IsDateString() @IsOptional() paidAt?: string;
  @Transform(trim) @IsString() @Length(1, 160) @IsOptional() reference?: string;
  @Transform(trim) @IsString() @Length(3, 1000) @IsOptional() notes?: string;
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SaleAllocationDto)
  allocations: SaleAllocationDto[] = [];
}

export class SaleReturnLineDto {
  @IsUUID('4') saleItemId!: string;
  @Transform(trim) @Matches(positive) quantity!: string;
  @IsEnum(ReturnDisposition) disposition: ReturnDisposition = ReturnDisposition.RESTOCK;
}

export class PostSaleReturnDto {
  @IsUUID('4') saleId!: string;
  @Transform(trim) @IsString() @Length(3, 1000) reason!: string;
  @IsDateString() @IsOptional() returnedAt?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SaleReturnLineDto)
  items!: SaleReturnLineDto[];
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SalePaymentInputDto)
  @IsOptional()
  refunds?: SalePaymentInputDto[];
}

export class PostSaleRefundDto {
  @IsUUID('4') returnId!: string;
  @IsUUID('4') methodId!: string;
  @Transform(trim) @Matches(positive) amount!: string;
  @IsDateString() @IsOptional() refundedAt?: string;
  @Transform(trim) @IsString() @Length(1, 160) @IsOptional() reference?: string;
  @Transform(trim) @IsString() @Length(3, 1000) reason!: string;
}

export class PostSaleExchangeDto {
  @ValidateNested() @Type(() => PostSaleReturnDto) saleReturn!: PostSaleReturnDto;
  @ValidateNested() @Type(() => CompleteSaleDto) replacementSale!: CompleteSaleDto;
  @Transform(trim) @IsString() @Length(3, 1000) reason!: string;
}

export class VoidSaleDto {
  @Transform(trim) @IsString() @Length(3, 1000) reason!: string;
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SalePaymentInputDto)
  @IsOptional()
  refunds?: SalePaymentInputDto[];
}

export class SaleFinancialListQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() limit = 25;
  @Transform(trim) @IsString() @Length(1, 120) @IsOptional() search?: string;
  @IsUUID('4') @IsOptional() customerId?: string;
  @IsUUID('4') @IsOptional() saleId?: string;
  @IsDateString() @IsOptional() from?: string;
  @IsDateString() @IsOptional() to?: string;
}

export class SaleListQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() limit = 25;
  @Transform(trim) @IsString() @Length(1, 120) @IsOptional() search?: string;
  @IsUUID('4') @IsOptional() customerId?: string;
  @IsUUID('4') @IsOptional() registerId?: string;
  @IsUUID('4') @IsOptional() cashierId?: string;
  @IsEnum(SaleStatus) @IsOptional() status?: SaleStatus;
  @IsDateString() @IsOptional() from?: string;
  @IsDateString() @IsOptional() to?: string;
}
