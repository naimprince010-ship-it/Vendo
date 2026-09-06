import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { DatabaseService } from '../database/database.service';
import type { UpdateCompanyDto } from './dto/company.dto';

const companySelect = {
  id: true,
  code: true,
  name: true,
  legalName: true,
  phone: true,
  email: true,
  address: true,
  countryCode: true,
  currencyCode: true,
  timezone: true,
  negativeStockAllowed: true,
  quantityScale: true,
  moneyScale: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class CompaniesService {
  constructor(private readonly database: DatabaseService) {}

  async get(principal: AuthPrincipal) {
    const company = await this.database.company.findUnique({
      where: { id: principal.companyId },
      select: companySelect,
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(principal: AuthPrincipal, dto: UpdateCompanyDto) {
    const existing = await this.get(principal);
    if (dto.timezone) {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: dto.timezone }).format();
      } catch {
        throw new BadRequestException('Timezone must be a valid IANA timezone');
      }
    }
    await this.database.$transaction([
      this.database.company.update({
        where: { id: principal.companyId },
        data: dto,
      }),
      this.database.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'company.updated',
          entityType: 'Company',
          entityId: principal.companyId,
          previousValue: existing,
          newValue: {
            name: dto.name,
            legalName: dto.legalName,
            phone: dto.phone,
            email: dto.email,
            address: dto.address,
            countryCode: dto.countryCode,
            currencyCode: dto.currencyCode,
            timezone: dto.timezone,
          },
        },
      }),
    ]);
    return this.get(principal);
  }
}
