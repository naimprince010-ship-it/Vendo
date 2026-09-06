import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const upper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const email = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class UpdateCompanyDto {
  @Transform(trim)
  @IsString()
  @Length(1, 160)
  @IsOptional()
  name?: string;

  @Transform(trim)
  @IsString()
  @Length(1, 200)
  @IsOptional()
  legalName?: string;

  @Transform(trim)
  @IsString()
  @Length(3, 40)
  @IsOptional()
  phone?: string;

  @Transform(email)
  @IsEmail()
  @Length(3, 254)
  @IsOptional()
  email?: string;

  @Transform(trim)
  @IsString()
  @Length(1, 1000)
  @IsOptional()
  address?: string;

  @Transform(upper)
  @Matches(/^[A-Z]{2}$/)
  @IsOptional()
  countryCode?: string;

  @Transform(upper)
  @Matches(/^[A-Z]{3}$/)
  @IsOptional()
  currencyCode?: string;

  @Transform(trim)
  @IsString()
  @Length(1, 80)
  @IsOptional()
  timezone?: string;
}
