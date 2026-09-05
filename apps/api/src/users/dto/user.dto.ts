import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { UserStatus } from '../../generated/prisma/enums';

const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class UserListQueryDto {
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

  @IsString()
  @Length(1, 100)
  @IsOptional()
  search?: string;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}

export class CreateUserDto {
  @Transform(normalizeEmail)
  @IsEmail()
  @Length(3, 254)
  email!: string;

  @IsString()
  @Length(1, 100)
  firstName!: string;

  @IsString()
  @Length(1, 100)
  @IsOptional()
  lastName?: string;

  @IsString()
  @Length(3, 40)
  @IsOptional()
  phone?: string;

  @IsString()
  @MinLength(12)
  @Matches(/[a-z]/)
  @Matches(/[A-Z]/)
  @Matches(/\d/)
  @Length(12, 256)
  password!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  @IsOptional()
  roleIds: string[] = [];
}

export class UpdateUserDto {
  @Transform(normalizeEmail)
  @IsEmail()
  @Length(3, 254)
  @IsOptional()
  email?: string;

  @IsString()
  @Length(1, 100)
  @IsOptional()
  firstName?: string;

  @IsString()
  @Length(1, 100)
  @IsOptional()
  lastName?: string;

  @IsString()
  @Length(3, 40)
  @IsOptional()
  phone?: string;
}

export class SetUserStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;
}

export class RoleAssignmentDto {
  @IsUUID('4')
  roleId!: string;
}

export class AdminSetPasswordDto {
  @IsString()
  @MinLength(12)
  @Matches(/[a-z]/)
  @Matches(/[A-Z]/)
  @Matches(/\d/)
  @Length(12, 256)
  newPassword!: string;
}
