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

export class BranchListQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 25;

  @Transform(trim)
  @IsString()
  @Length(1, 100)
  @IsOptional()
  search?: string;

  @Transform(({ value }): unknown => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateBranchDto {
  @Transform(code)
  @Matches(/^[A-Z0-9][A-Z0-9_-]{0,39}$/)
  code!: string;

  @Transform(trim)
  @IsString()
  @Length(1, 160)
  name!: string;

  @Transform(trim)
  @IsString()
  @Length(3, 40)
  @IsOptional()
  phone?: string;

  @Transform(trim)
  @IsString()
  @Length(1, 1000)
  @IsOptional()
  address?: string;
}

export class UpdateBranchDto {
  @Transform(trim)
  @IsString()
  @Length(1, 160)
  @IsOptional()
  name?: string;

  @Transform(trim)
  @IsString()
  @Length(3, 40)
  @IsOptional()
  phone?: string;

  @Transform(trim)
  @IsString()
  @Length(1, 1000)
  @IsOptional()
  address?: string;
}

export class SetLocationStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

export class BranchAccessDto {
  @IsUUID('4')
  branchId!: string;
}
