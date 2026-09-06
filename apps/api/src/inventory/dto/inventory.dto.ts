import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
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
import { InventoryMovementType, PhysicalCountStatus } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const positiveDecimal = /^(?:0\.\d*[1-9]\d*|[1-9]\d*(?:\.\d+)?)$/;

export class StockLineDto {
  @IsUUID('4') productId!: string;
  @IsUUID('4') unitId!: string;
  @IsUUID('4') @IsOptional() batchId?: string;
  @Transform(trim) @Matches(positiveDecimal) quantity!: string;
}

export class StockOperationDto {
  @IsUUID('4') warehouseId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => StockLineDto)
  lines!: StockLineDto[];
  @Transform(trim) @IsString() @Length(3, 1000) reason!: string;
}

export enum AdjustmentDirection {
  IN = 'IN',
  OUT = 'OUT',
}

export class AdjustmentDto extends StockOperationDto {
  @IsEnum(AdjustmentDirection) direction!: AdjustmentDirection;
}

export class TransferDto {
  @IsUUID('4') sourceWarehouseId!: string;
  @IsUUID('4') destinationWarehouseId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => StockLineDto)
  lines!: StockLineDto[];
  @Transform(trim) @IsString() @Length(3, 1000) reason!: string;
}

export class CreateBatchDto {
  @IsUUID('4') productId!: string;
  @Transform(trim) @IsString() @Length(1, 100) batchNumber!: string;
  @Transform(trim) @IsString() @Length(1, 100) @IsOptional() lotNumber?: string;
  @Transform(trim) @IsString() @Length(1, 80) @IsOptional() shade?: string;
  @IsUUID('4') @IsOptional() supplierId?: string;
}

export class BatchStatusDto {
  @IsBoolean() isActive!: boolean;
}

export class InventoryListQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() limit = 25;
  @IsUUID('4') @IsOptional() warehouseId?: string;
  @IsUUID('4') @IsOptional() productId?: string;
  @IsUUID('4') @IsOptional() batchId?: string;
  @IsEnum(InventoryMovementType) @IsOptional() type?: InventoryMovementType;
  @Transform(trim) @IsString() @Length(1, 120) @IsOptional() search?: string;
}

export class BatchListQueryDto extends InventoryListQueryDto {
  @Transform(({ value }): unknown => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CountLineDto extends StockLineDto {}

export class CreatePhysicalCountDto {
  @IsUUID('4') warehouseId!: string;
  @Transform(trim) @Matches(/^[A-Za-z0-9][A-Za-z0-9._/-]{1,59}$/) countNumber!: string;
  @Transform(trim) @IsString() @Length(1, 1000) @IsOptional() notes?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CountLineDto)
  items!: CountLineDto[];
}

export class ReplaceCountItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CountLineDto)
  items!: CountLineDto[];
}

export class CountListQueryDto extends InventoryListQueryDto {
  @IsEnum(PhysicalCountStatus) @IsOptional() status?: PhysicalCountStatus;
}
