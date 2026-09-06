import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const code = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class WarehouseListQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() limit = 25;
  @IsUUID('4') @IsOptional() branchId?: string;
  @Transform(trim) @IsString() @Length(1, 100) @IsOptional() search?: string;
  @Transform(({ value }): unknown => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateWarehouseDto {
  @IsUUID('4') branchId!: string;
  @Transform(code) @Matches(/^[A-Z0-9][A-Z0-9_-]{0,39}$/) code!: string;
  @Transform(trim) @IsString() @Length(1, 160) name!: string;
}

export class UpdateWarehouseDto {
  @Transform(trim) @IsString() @Length(1, 160) @IsOptional() name?: string;
}
