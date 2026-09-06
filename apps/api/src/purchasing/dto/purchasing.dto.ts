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
import { InvoiceStatus, OrderStatus } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const positive = /^(?:0\.\d*[1-9]\d*|[1-9]\d*(?:\.\d+)?)$/;
const nonNegative = /^(?:0|0\.\d+|[1-9]\d*(?:\.\d+)?)$/;

export class PurchaseLineDto {
  @IsUUID('4') productId!: string;
  @IsUUID('4') unitId!: string;
  @Transform(trim) @Matches(positive) quantity!: string;
  @Transform(trim) @Matches(nonNegative) unitCost!: string;
  @Transform(trim) @Matches(nonNegative) @IsOptional() discount = '0';
  @Transform(trim) @Matches(nonNegative) @IsOptional() tax = '0';
}

export class CreatePurchaseOrderDto {
  @IsUUID('4') supplierId!: string;
  @IsUUID('4') warehouseId!: string;
  @IsDateString() orderDate!: string;
  @IsDateString() @IsOptional() expectedAt?: string;
  @Transform(trim) @Matches(nonNegative) @IsOptional() discount = '0';
  @Transform(trim) @Matches(nonNegative) @IsOptional() tax = '0';
  @Transform(trim) @Matches(nonNegative) @IsOptional() freight = '0';
  @Transform(trim) @IsString() @Length(1, 2000) @IsOptional() notes?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PurchaseLineDto)
  items!: PurchaseLineDto[];
}

export class UpdatePurchaseOrderDto extends CreatePurchaseOrderDto {}

export class ReceiptLineDto {
  @IsUUID('4') orderItemId!: string;
  @IsUUID('4') unitId!: string;
  @Transform(trim) @Matches(positive) quantity!: string;
  @Transform(trim) @IsString() @Length(1, 100) @IsOptional() batchNumber?: string;
  @Transform(trim) @IsString() @Length(1, 100) @IsOptional() lotNumber?: string;
  @Transform(trim) @IsString() @Length(1, 80) @IsOptional() shade?: string;
}

export class PostGoodsReceiptDto {
  @IsUUID('4') orderId!: string;
  @IsUUID('4') warehouseId!: string;
  @IsDateString() receivedAt!: string;
  @Transform(trim) @IsString() @Length(1, 2000) @IsOptional() notes?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReceiptLineDto)
  items!: ReceiptLineDto[];
}

export class InvoiceLineDto extends PurchaseLineDto {
  @IsUUID('4') @IsOptional() receiptItemId?: string;
}

export class CreatePurchaseInvoiceDto {
  @IsUUID('4') supplierId!: string;
  @IsUUID('4') @IsOptional() orderId?: string;
  @IsUUID('4') @IsOptional() receiptId?: string;
  @Transform(trim) @IsString() @Length(1, 100) @IsOptional() supplierInvoiceNumber?: string;
  @IsDateString() invoiceDate!: string;
  @IsDateString() @IsOptional() dueDate?: string;
  @Transform(trim) @Matches(nonNegative) @IsOptional() discount = '0';
  @Transform(trim) @Matches(nonNegative) @IsOptional() tax = '0';
  @Transform(trim) @Matches(nonNegative) @IsOptional() freight = '0';
  @Transform(trim) @Matches(nonNegative) @IsOptional() additionalCost = '0';
  @Transform(trim) @IsString() @Length(3, 3) @IsOptional() currencyCode = 'BDT';
  @Transform(trim) @IsString() @Length(1, 2000) @IsOptional() notes?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  items!: InvoiceLineDto[];
}

export class PaymentAllocationDto {
  @IsUUID('4') invoiceId!: string;
  @Transform(trim) @Matches(positive) amount!: string;
}

export class PostSupplierPaymentDto {
  @IsUUID('4') supplierId!: string;
  @IsUUID('4') methodId!: string;
  @Transform(trim) @Matches(positive) amount!: string;
  @IsDateString() paidAt!: string;
  @Transform(trim) @IsString() @Length(1, 160) @IsOptional() reference?: string;
  @Transform(trim) @IsString() @Length(1, 1000) @IsOptional() notes?: string;
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  @IsOptional()
  allocations: PaymentAllocationDto[] = [];
}

export class ReturnLineDto {
  @IsUUID('4') receiptItemId!: string;
  @IsUUID('4') @IsOptional() invoiceItemId?: string;
  @IsUUID('4') unitId!: string;
  @Transform(trim) @Matches(positive) quantity!: string;
}

export class PostPurchaseReturnDto {
  @IsUUID('4') receiptId!: string;
  @IsUUID('4') @IsOptional() invoiceId?: string;
  @IsDateString() returnedAt!: string;
  @Transform(trim) @IsString() @Length(3, 1000) reason!: string;
  @Transform(trim) @IsString() @Length(1, 2000) @IsOptional() notes?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReturnLineDto)
  items!: ReturnLineDto[];
}

export class PurchaseListQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() limit = 25;
  @Transform(trim) @IsString() @Length(1, 120) @IsOptional() search?: string;
  @IsUUID('4') @IsOptional() supplierId?: string;
  @IsUUID('4') @IsOptional() warehouseId?: string;
  @IsEnum(OrderStatus) @IsOptional() orderStatus?: OrderStatus;
  @IsEnum(InvoiceStatus) @IsOptional() invoiceStatus?: InvoiceStatus;
  @IsDateString() @IsOptional() from?: string;
  @IsDateString() @IsOptional() to?: string;
}
