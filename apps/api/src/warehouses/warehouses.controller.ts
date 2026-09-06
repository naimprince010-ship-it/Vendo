import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { CurrentUser } from '../authorization/current-user.decorator';
import { PERMISSIONS } from '../authorization/permission-catalog';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { SetLocationStatusDto } from '../branches/dto/branch.dto';
import { CreateWarehouseDto, UpdateWarehouseDto, WarehouseListQueryDto } from './dto/warehouse.dto';
import { WarehousesService } from './warehouses.service';

@ApiTags('warehouses')
@ApiBearerAuth()
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehouses: WarehousesService) {}
  @RequirePermissions(PERMISSIONS.WAREHOUSE_VIEW)
  @Get()
  list(@CurrentUser() principal: AuthPrincipal, @Query() query: WarehouseListQueryDto) {
    return this.warehouses.list(principal, query);
  }
  @RequirePermissions(PERMISSIONS.WAREHOUSE_VIEW)
  @Get(':warehouseId')
  get(
    @CurrentUser() principal: AuthPrincipal,
    @Param('warehouseId', new ParseUUIDPipe()) id: string,
  ) {
    return this.warehouses.get(principal, id);
  }
  @RequirePermissions(PERMISSIONS.WAREHOUSE_CREATE)
  @Post()
  create(@CurrentUser() principal: AuthPrincipal, @Body() dto: CreateWarehouseDto) {
    return this.warehouses.create(principal, dto);
  }
  @RequirePermissions(PERMISSIONS.WAREHOUSE_EDIT)
  @Patch(':warehouseId')
  update(
    @CurrentUser() principal: AuthPrincipal,
    @Param('warehouseId', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.warehouses.update(principal, id, dto);
  }
  @RequirePermissions(PERMISSIONS.WAREHOUSE_EDIT)
  @Patch(':warehouseId/status')
  setStatus(
    @CurrentUser() principal: AuthPrincipal,
    @Param('warehouseId', new ParseUUIDPipe()) id: string,
    @Body() dto: SetLocationStatusDto,
  ) {
    return this.warehouses.setStatus(principal, id, dto);
  }
}
