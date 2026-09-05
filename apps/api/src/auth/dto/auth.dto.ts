import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const normalizeCompanyCode = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class LoginDto {
  @Transform(normalizeCompanyCode)
  @IsString()
  @Length(1, 40)
  companyCode!: string;

  @Transform(normalizeEmail)
  @IsEmail()
  @Length(3, 254)
  email!: string;

  @IsString()
  @Length(8, 256)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  @Length(8, 256)
  currentPassword!: string;

  @IsString()
  @MinLength(12)
  @Matches(/[a-z]/, { message: 'newPassword must contain a lowercase letter' })
  @Matches(/[A-Z]/, { message: 'newPassword must contain an uppercase letter' })
  @Matches(/\d/, { message: 'newPassword must contain a number' })
  @Length(12, 256)
  newPassword!: string;
}

export class RequestPasswordResetDto {
  @Transform(normalizeCompanyCode)
  @IsString()
  @Length(1, 40)
  companyCode!: string;

  @Transform(normalizeEmail)
  @IsEmail()
  @Length(3, 254)
  email!: string;
}

export class CompletePasswordResetDto {
  @Transform(normalizeCompanyCode)
  @IsString()
  @Length(1, 40)
  companyCode!: string;

  @IsString()
  @Length(32, 256)
  token!: string;

  @IsString()
  @MinLength(12)
  @Matches(/[a-z]/)
  @Matches(/[A-Z]/)
  @Matches(/\d/)
  @Length(12, 256)
  newPassword!: string;
}
