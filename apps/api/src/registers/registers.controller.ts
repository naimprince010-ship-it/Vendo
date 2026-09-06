import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { CurrentUser } from '../authorization/current-user.decorator';
import { PERMISSIONS } from '../authorization/permission-catalog';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { SetLocationStatusDto } from '../branches/dto/branch.dto';
import { CreateRegisterDto, RegisterListQueryDto, UpdateRegisterDto } from './dto/register.dto';
import { RegistersService } from './registers.service';

@ApiTags('registers')
@ApiBearerAuth()
@Controller('registers')
export class RegistersController {
  constructor(private readonly registers: RegistersService) {}
  @RequirePermissions(PERMISSIONS.REGISTER_VIEW)
  @Get()
  list(@CurrentUser() principal: AuthPrincipal, @Query() query: RegisterListQueryDto) {
    return this.registers.list(principal, query);
  }
  @RequirePermissions(PERMISSIONS.REGISTER_VIEW)
  @Get(':registerId')
  get(
    @CurrentUser() principal: AuthPrincipal,
    @Param('registerId', new ParseUUIDPipe()) id: string,
  ) {
    return this.registers.get(principal, id);
  }
  @RequirePermissions(PERMISSIONS.REGISTER_CREATE)
  @Post()
  create(@CurrentUser() principal: AuthPrincipal, @Body() dto: CreateRegisterDto) {
    return this.registers.create(principal, dto);
  }
  @RequirePermissions(PERMISSIONS.REGISTER_EDIT)
  @Patch(':registerId')
  update(
    @CurrentUser() principal: AuthPrincipal,
    @Param('registerId', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRegisterDto,
  ) {
    return this.registers.update(principal, id, dto);
  }
  @RequirePermissions(PERMISSIONS.REGISTER_EDIT)
  @Patch(':registerId/status')
  setStatus(
    @CurrentUser() principal: AuthPrincipal,
    @Param('registerId', new ParseUUIDPipe()) id: string,
    @Body() dto: SetLocationStatusDto,
  ) {
    return this.registers.setStatus(principal, id, dto);
  }
}
