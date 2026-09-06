import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { CurrentUser } from '../authorization/current-user.decorator';
import { PERMISSIONS } from '../authorization/permission-catalog';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/company.dto';

@ApiTags('company')
@ApiBearerAuth()
@Controller('company')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @RequirePermissions(PERMISSIONS.COMPANY_VIEW)
  @Get()
  get(@CurrentUser() principal: AuthPrincipal) {
    return this.companies.get(principal);
  }

  @RequirePermissions(PERMISSIONS.COMPANY_MANAGE)
  @Patch()
  update(@CurrentUser() principal: AuthPrincipal, @Body() dto: UpdateCompanyDto) {
    return this.companies.update(principal, dto);
  }
}
