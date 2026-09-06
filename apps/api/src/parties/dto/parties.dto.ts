import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { CustomerLedgerEntryType, SupplierLedgerEntryType } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const upper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const email = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : undefined;
const optionalText = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;
const money = /^-?\d{1,14}(?:\.\d{1,4})?$/;
const nonNegativeMoney = /^\d{1,14}(?:\.\d{1,4})?$/;

export class PartyListQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() limit = 25;
  @Transform(trim) @IsString() @Length(1, 160) @IsOptional() search?: string;
  @Transform(({ value }): unknown => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateCustomerGroupDto {
  @Transform(upper) @Matches(/^[A-Z0-9][A-Z0-9._-]{0,39}$/) code!: string;
  @Transform(trim) @IsString() @Length(1, 120) name!: string;
  @Transform(optionalText) @IsString() @Length(1, 1000) @IsOptional() description?: string;
}

export class UpdateCustomerGroupDto {
  @Transform(trim) @IsString() @Length(1, 120) @IsOptional() name?: string;
  @Transform(optionalText) @IsString() @Length(1, 1000) @IsOptional() description?: string;
}

export class StatusDto {
  @IsBoolean() isActive!: boolean;
}

class CustomerFieldsDto {
  @Transform(trim) @IsString() @Length(1, 160) name!: string;
  @Transform(optionalText) @IsString() @Length(1, 40) @IsOptional() phone?: string;
  @Transform(email) @IsEmail() @Length(3, 254) @IsOptional() email?: string;
  @Transform(optionalText) @IsString() @Length(1, 2000) @IsOptional() address?: string;
  @Transform(optionalText) @IsString() @Length(1, 80) @IsOptional() taxIdentifier?: string;
  @Transform(optionalText) @IsString() @Length(1, 4000) @IsOptional() notes?: string;
  @IsUUID('4') @IsOptional() groupId?: string | null;
}

export class CreateCustomerDto extends CustomerFieldsDto {
  @Transform(upper) @Matches(/^[A-Z0-9][A-Z0-9._/-]{0,49}$/) code!: string;
  @Transform(trim) @Matches(nonNegativeMoney) @IsOptional() creditLimit = '0';
}

export class UpdateCustomerDto {
  @Transform(trim) @IsString() @Length(1, 160) @IsOptional() name?: string;
  @Transform(optionalText) @IsString() @Length(1, 40) @IsOptional() phone?: string;
  @Transform(email) @IsEmail() @Length(3, 254) @IsOptional() email?: string;
  @Transform(optionalText) @IsString() @Length(1, 2000) @IsOptional() address?: string;
  @Transform(optionalText) @IsString() @Length(1, 80) @IsOptional() taxIdentifier?: string;
  @Transform(optionalText) @IsString() @Length(1, 4000) @IsOptional() notes?: string;
  @IsUUID('4') @IsOptional() groupId?: string | null;
}

export class CreditLimitDto {
  @Transform(trim) @Matches(nonNegativeMoney) creditLimit!: string;
  @Transform(trim) @IsString() @Length(3, 1000) reason!: string;
}

class SupplierFieldsDto {
  @Transform(trim) @IsString() @Length(1, 160) name!: string;
  @Transform(optionalText) @IsString() @Length(1, 120) @IsOptional() contactName?: string;
  @Transform(optionalText) @IsString() @Length(1, 40) @IsOptional() phone?: string;
  @Transform(email) @IsEmail() @Length(3, 254) @IsOptional() email?: string;
  @Transform(optionalText) @IsString() @Length(1, 2000) @IsOptional() address?: string;
  @Transform(optionalText) @IsString() @Length(1, 80) @IsOptional() taxIdentifier?: string;
  @Transform(optionalText) @IsString() @Length(1, 4000) @IsOptional() notes?: string;
}

export class CreateSupplierDto extends SupplierFieldsDto {
  @Transform(upper) @Matches(/^[A-Z0-9][A-Z0-9._/-]{0,49}$/) code!: string;
}

export class UpdateSupplierDto {
  @Transform(trim) @IsString() @Length(1, 160) @IsOptional() name?: string;
  @Transform(optionalText) @IsString() @Length(1, 120) @IsOptional() contactName?: string;
  @Transform(optionalText) @IsString() @Length(1, 40) @IsOptional() phone?: string;
  @Transform(email) @IsEmail() @Length(3, 254) @IsOptional() email?: string;
  @Transform(optionalText) @IsString() @Length(1, 2000) @IsOptional() address?: string;
  @Transform(optionalText) @IsString() @Length(1, 80) @IsOptional() taxIdentifier?: string;
  @Transform(optionalText) @IsString() @Length(1, 4000) @IsOptional() notes?: string;
}

export class PostLedgerAmountDto {
  @Transform(trim) @Matches(money) amount!: string;
  @IsISO8601({ strict: true }) effectiveAt!: string;
  @Transform(trim) @IsString() @Length(3, 1000) description!: string;
  @Transform(optionalText) @IsString() @Length(1, 60) @IsOptional() referenceType?: string;
  @IsUUID('4') @IsOptional() referenceId?: string;
}

export class CorrectOpeningBalanceDto {
  @Transform(trim) @Matches(money) correctedAmount!: string;
  @IsISO8601({ strict: true }) effectiveAt!: string;
  @Transform(trim) @IsString() @Length(3, 1000) reason!: string;
}

export class CustomerLedgerQueryDto extends PartyListQueryDto {
  @IsEnum(CustomerLedgerEntryType) @IsOptional() type?: CustomerLedgerEntryType;
  @IsISO8601({ strict: true }) @IsOptional() from?: string;
  @IsISO8601({ strict: true }) @IsOptional() to?: string;
}

export class SupplierLedgerQueryDto extends PartyListQueryDto {
  @IsEnum(SupplierLedgerEntryType) @IsOptional() type?: SupplierLedgerEntryType;
  @IsISO8601({ strict: true }) @IsOptional() from?: string;
  @IsISO8601({ strict: true }) @IsOptional() to?: string;
}
