import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
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
} from 'class-validator';
import { CashMovementType, CashShiftStatus, ExpenseStatus } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const positive = /^(?:0\.\d*[1-9]\d*|[1-9]\d*(?:\.\d+)?)$/;
const nonNegative = /^(?:0|0\.\d+|[1-9]\d*(?:\.\d+)?)$/;
const booleanValue = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

export class OpenCashShiftDto {
  @IsUUID('4') registerId!: string;
  @Transform(trim) @Matches(nonNegative) openingCash!: string;
}

export class ManualCashMovementDto {
  @IsUUID('4') registerId!: string;
  @Transform(trim) @Matches(positive) amount!: string;
  @Transform(trim) @IsString() @Length(3, 1000) reason!: string;
  @IsDateString() @IsOptional() occurredAt?: string;
}

export class CloseCashShiftDto {
  @Transform(trim) @Matches(nonNegative) actualCash!: string;
  @Transform(trim) @IsString() @Length(3, 1000) @IsOptional() note?: string;
}

export class CashShiftQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() limit = 25;
  @IsUUID('4') @IsOptional() registerId?: string;
  @IsUUID('4') @IsOptional() cashierId?: string;
  @IsEnum(CashShiftStatus) @IsOptional() status?: CashShiftStatus;
  @IsDateString() @IsOptional() from?: string;
  @IsDateString() @IsOptional() to?: string;
}

export class CashMovementQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() limit = 25;
  @IsUUID('4') @IsOptional() shiftId?: string;
  @IsUUID('4') @IsOptional() registerId?: string;
  @IsEnum(CashMovementType) @IsOptional() type?: CashMovementType;
  @IsDateString() @IsOptional() from?: string;
  @IsDateString() @IsOptional() to?: string;
  @Transform(trim) @IsString() @Length(1, 120) @IsOptional() reference?: string;
}

export class CreateExpenseCategoryDto {
  @Transform(trim) @IsString() @Length(2, 40) code!: string;
  @Transform(trim) @IsString() @Length(2, 120) name!: string;
  @Transform(trim) @IsString() @Length(1, 1000) @IsOptional() description?: string;
}

export class UpdateExpenseCategoryDto {
  @Transform(trim) @IsString() @Length(2, 120) @IsOptional() name?: string;
  @Transform(trim) @IsString() @Length(1, 1000) @IsOptional() description?: string;
}

export class ExpenseCategoryStatusDto {
  @Transform(booleanValue) @IsBoolean() isActive!: boolean;
}

export class ExpenseCategoryQueryDto {
  @Transform(booleanValue) @IsBoolean() @IsOptional() active?: boolean;
}

export class PostExpenseDto {
  @IsUUID('4') categoryId!: string;
  @IsUUID('4') paymentMethodId!: string;
  @IsUUID('4') @IsOptional() registerId?: string;
  @Transform(trim) @Matches(positive) amount!: string;
  @IsDateString() @IsOptional() expenseDate?: string;
  @Transform(trim) @IsString() @Length(3, 2000) description!: string;
  @Transform(trim) @IsString() @Length(1, 160) @IsOptional() reference?: string;
}

export class ReverseExpenseDto {
  @IsUUID('4') @IsOptional() registerId?: string;
  @Transform(trim) @IsString() @Length(3, 1000) reason!: string;
}

export class ExpenseQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() limit = 25;
  @IsUUID('4') @IsOptional() categoryId?: string;
  @IsUUID('4') @IsOptional() paymentMethodId?: string;
  @IsUUID('4') @IsOptional() createdById?: string;
  @IsEnum(ExpenseStatus) @IsOptional() status?: ExpenseStatus;
  @IsDateString() @IsOptional() from?: string;
  @IsDateString() @IsOptional() to?: string;
}
