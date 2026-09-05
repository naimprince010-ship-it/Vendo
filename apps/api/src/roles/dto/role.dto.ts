import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @Length(2, 80)
  @Matches(/^[a-z][a-z0-9_-]*$/)
  key!: string;

  @IsString()
  @Length(2, 120)
  name!: string;

  @IsString()
  @Length(1, 1000)
  @IsOptional()
  description?: string;
}

export class UpdateRoleDto {
  @IsString()
  @Length(2, 120)
  @IsOptional()
  name?: string;

  @IsString()
  @Length(1, 1000)
  @IsOptional()
  description?: string;
}

export class SetRolePermissionsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  permissionIds!: string[];
}
