import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { PERMISSIONS } from '../authorization/permission-catalog';
import { DatabaseService } from '../database/database.service';
import { isUniqueConstraintError } from '../database/prisma-errors';
import { Prisma, ProductType } from '../generated/prisma/client';
import type {
  BarcodeDto,
  ConversionDto,
  ConvertQuantityDto,
  CreateProductDto,
  PriceDto,
  ProductListQueryDto,
  SanitaryProfileDto,
  StatusDto,
  TileProfileDto,
  UpdateProductDto,
} from './dto/catalog.dto';

const detailInclude = {
  category: true,
  brand: true,
  manufacturer: true,
  baseUnit: true,
  tileProfile: true,
  sanitaryProfile: true,
  conversions: {
    where: { isActive: true },
    include: { fromUnit: true },
    orderBy: { fromUnit: { code: 'asc' as const } },
  },
  barcodes: {
    include: { unit: true },
    orderBy: [{ isPrimary: 'desc' as const }, { barcode: 'asc' as const }],
  },
  prices: {
    where: { isActive: true },
    include: { unit: true },
    orderBy: [{ unit: { code: 'asc' as const } }, { type: 'asc' as const }],
  },
} satisfies Prisma.ProductInclude;
type ProductDetail = Prisma.ProductGetPayload<{ include: typeof detailInclude }>;

@Injectable()
export class ProductsService {
  constructor(private readonly db: DatabaseService) {}

  async list(principal: AuthPrincipal, query: ProductListQueryDto) {
    const where: Prisma.ProductWhereInput = {
      companyId: principal.companyId,
      isActive: query.isActive,
      type: query.type,
      categoryId: query.categoryId,
      brandId: query.brandId,
      manufacturerId: query.manufacturerId,
      ...(query.search
        ? {
            OR: [
              { sku: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { model: { contains: query.search, mode: 'insensitive' } },
              { brand: { name: { contains: query.search, mode: 'insensitive' } } },
              { manufacturer: { name: { contains: query.search, mode: 'insensitive' } } },
              { barcodes: { some: { barcode: { contains: query.search, mode: 'insensitive' } } } },
              { tileProfile: { displaySize: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.product.findMany({
        where,
        select: {
          id: true,
          sku: true,
          name: true,
          type: true,
          model: true,
          isActive: true,
          trackInventory: true,
          batchTracking: true,
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          manufacturer: { select: { id: true, name: true } },
          baseUnit: { select: { id: true, code: true, name: true } },
          tileProfile: { select: { displaySize: true } },
          barcodes: { where: { isPrimary: true }, select: { barcode: true }, take: 1 },
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.product.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async get(principal: AuthPrincipal, id: string) {
    const product = await this.db.product.findFirst({
      where: { id, companyId: principal.companyId },
      include: detailInclude,
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.present(product, principal);
  }

  async lookupBarcode(principal: AuthPrincipal, barcode: string) {
    const row = await this.db.productBarcode.findFirst({
      where: { companyId: principal.companyId, barcode },
      include: { unit: true, product: { include: detailInclude } },
    });
    if (!row || !row.product.isActive)
      throw new NotFoundException('Active product barcode not found');
    return { barcode: row.barcode, unit: row.unit, product: this.present(row.product, principal) };
  }

  async create(principal: AuthPrincipal, dto: CreateProductDto) {
    this.validateProfiles(dto.type, dto.tileProfile, dto.sanitaryProfile);
    if (dto.prices.length && !principal.permissions.has(PERMISSIONS.PRICING_MANAGE))
      throw new ForbiddenException('Pricing permission is required');
    if (dto.standardCost && !principal.permissions.has(PERMISSIONS.PRODUCT_VIEW_COST))
      throw new ForbiddenException('Cost permission is required');
    await this.validateReferences(principal, dto);
    this.validateUnitConfiguration(dto.baseUnitId, dto.conversions, dto.barcodes, dto.prices);
    const tile = dto.tileProfile ? this.tileData(dto.tileProfile) : undefined;
    try {
      const created = await this.db.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            companyId: principal.companyId,
            sku: dto.sku,
            name: dto.name,
            type: dto.type,
            baseUnitId: dto.baseUnitId,
            categoryId: dto.categoryId,
            brandId: dto.brandId,
            manufacturerId: dto.manufacturerId,
            model: dto.model,
            description: dto.description,
            standardCost: dto.standardCost,
            reorderLevel: dto.reorderLevel,
            trackInventory: dto.trackInventory,
            batchTracking: dto.batchTracking,
          },
        });
        if (tile)
          await tx.productTileProfile.create({
            data: { productId: product.id, companyId: principal.companyId, ...tile },
          });
        if (dto.sanitaryProfile)
          await tx.productSanitaryProfile.create({
            data: { productId: product.id, companyId: principal.companyId, ...dto.sanitaryProfile },
          });
        if (dto.conversions.length)
          await tx.unitConversion.createMany({
            data: dto.conversions.map((x) => ({
              companyId: principal.companyId,
              productId: product.id,
              fromUnitId: x.unitId,
              factorToBase: x.factorToBase,
            })),
          });
        if (dto.barcodes.length)
          await tx.productBarcode.createMany({
            data: dto.barcodes.map((x) => ({
              companyId: principal.companyId,
              productId: product.id,
              unitId: x.unitId,
              barcode: x.barcode,
              isPrimary: x.isPrimary,
            })),
          });
        if (dto.prices.length)
          await tx.productPrice.createMany({
            data: dto.prices.map((x) => ({
              companyId: principal.companyId,
              productId: product.id,
              unitId: x.unitId,
              type: x.type,
              amount: x.amount,
            })),
          });
        await tx.auditLog.create({
          data: {
            companyId: principal.companyId,
            actorId: principal.userId,
            action: 'product.created',
            entityType: 'Product',
            entityId: product.id,
            newValue: {
              sku: product.sku,
              name: product.name,
              type: product.type,
              baseUnitId: product.baseUnitId,
            },
          },
        });
        return product;
      });
      return this.get(principal, created.id);
    } catch (error) {
      this.mapConflict(error);
    }
  }

  async update(principal: AuthPrincipal, id: string, dto: UpdateProductDto) {
    if (dto.standardCost !== undefined && !principal.permissions.has(PERMISSIONS.PRODUCT_VIEW_COST))
      throw new ForbiddenException('Cost permission is required');
    const before = await this.get(principal, id);
    await this.validateReferences(principal, dto);
    await this.db.$transaction([
      this.db.product.update({ where: { id }, data: dto }),
      this.db.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'product.updated',
          entityType: 'Product',
          entityId: id,
          previousValue: {
            name: before.name,
            categoryId: before.category?.id,
            brandId: before.brand?.id,
            manufacturerId: before.manufacturer?.id,
            model: before.model,
          },
          newValue: { ...dto },
        },
      }),
    ]);
    return this.get(principal, id);
  }

  async status(principal: AuthPrincipal, id: string, dto: StatusDto) {
    const before = await this.get(principal, id);
    await this.db.$transaction([
      this.db.product.update({ where: { id }, data: dto }),
      this.db.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'product.status.changed',
          entityType: 'Product',
          entityId: id,
          previousValue: { isActive: before.isActive },
          newValue: { ...dto },
        },
      }),
    ]);
    return this.get(principal, id);
  }

  async setTileProfile(principal: AuthPrincipal, id: string, dto: TileProfileDto) {
    const product = await this.requireProduct(principal, id);
    if (product.type !== ProductType.TILE)
      throw new BadRequestException('Tile profile is allowed only for TILE products');
    const data = this.tileData(dto);
    await this.db.$transaction(async (tx) => {
      const previous = await tx.productTileProfile.findUnique({ where: { productId: id } });
      await tx.productTileProfile.upsert({
        where: { productId: id },
        create: { productId: id, companyId: principal.companyId, ...data },
        update: data,
      });
      await tx.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'product.tile_profile.changed',
          entityType: 'Product',
          entityId: id,
          previousValue: previous ? this.tileJson(previous) : undefined,
          newValue: this.tileJson(data),
        },
      });
    });
    return this.get(principal, id);
  }

  async setSanitaryProfile(principal: AuthPrincipal, id: string, dto: SanitaryProfileDto) {
    const product = await this.requireProduct(principal, id);
    if (product.type !== ProductType.SANITARY)
      throw new BadRequestException('Sanitary profile is allowed only for SANITARY products');
    await this.db.$transaction(async (tx) => {
      const previous = await tx.productSanitaryProfile.findUnique({ where: { productId: id } });
      await tx.productSanitaryProfile.upsert({
        where: { productId: id },
        create: { productId: id, companyId: principal.companyId, ...dto },
        update: dto,
      });
      await tx.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'product.sanitary_profile.changed',
          entityType: 'Product',
          entityId: id,
          previousValue: previous
            ? {
                size: previous.size,
                color: previous.color,
                material: previous.material,
                finish: previous.finish,
                warrantyMonths: previous.warrantyMonths,
                warrantyDetails: previous.warrantyDetails,
              }
            : undefined,
          newValue: { ...dto },
        },
      });
    });
    return this.get(principal, id);
  }

  async setConversion(principal: AuthPrincipal, id: string, dto: ConversionDto) {
    const product = await this.requireProduct(principal, id);
    if (dto.unitId === product.baseUnitId)
      throw new BadRequestException('Base unit conversion is implicitly 1');
    await this.requireValidUnit(principal, dto.unitId);
    try {
      await this.db.$transaction(async (tx) => {
        const existing = await tx.unitConversion.findFirst({
          where: {
            companyId: principal.companyId,
            productId: id,
            fromUnitId: dto.unitId,
            isActive: true,
          },
          orderBy: { version: 'desc' },
        });
        if (existing)
          await tx.unitConversion.update({ where: { id: existing.id }, data: { isActive: false } });
        const latest = await tx.unitConversion.findFirst({
          where: { companyId: principal.companyId, productId: id, fromUnitId: dto.unitId },
          orderBy: { version: 'desc' },
        });
        const created = await tx.unitConversion.create({
          data: {
            companyId: principal.companyId,
            productId: id,
            fromUnitId: dto.unitId,
            factorToBase: dto.factorToBase,
            version: (latest?.version ?? 0) + 1,
          },
        });
        await tx.auditLog.create({
          data: {
            companyId: principal.companyId,
            actorId: principal.userId,
            action: 'product.conversion.changed',
            entityType: 'Product',
            entityId: id,
            previousValue: existing
              ? {
                  unitId: existing.fromUnitId,
                  factorToBase: existing.factorToBase.toString(),
                  version: existing.version,
                }
              : undefined,
            newValue: {
              unitId: created.fromUnitId,
              factorToBase: created.factorToBase.toString(),
              version: created.version,
            },
          },
        });
      });
      return this.get(principal, id);
    } catch (error) {
      this.mapConflict(error);
    }
  }

  async addBarcode(principal: AuthPrincipal, id: string, dto: BarcodeDto) {
    const product = await this.requireProduct(principal, id);
    if (dto.unitId) await this.requireProductUnit(principal, product, dto.unitId);
    try {
      await this.db.$transaction(async (tx) => {
        if (dto.isPrimary)
          await tx.productBarcode.updateMany({
            where: { companyId: principal.companyId, productId: id, isPrimary: true },
            data: { isPrimary: false },
          });
        const row = await tx.productBarcode.create({
          data: { companyId: principal.companyId, productId: id, ...dto },
        });
        await tx.auditLog.create({
          data: {
            companyId: principal.companyId,
            actorId: principal.userId,
            action: 'product.barcode.added',
            entityType: 'Product',
            entityId: id,
            newValue: { barcode: row.barcode, unitId: row.unitId, isPrimary: row.isPrimary },
          },
        });
      });
      return this.get(principal, id);
    } catch (error) {
      this.mapConflict(error);
    }
  }

  async removeBarcode(principal: AuthPrincipal, id: string, barcodeId: string) {
    await this.requireProduct(principal, id);
    const row = await this.db.productBarcode.findFirst({
      where: { id: barcodeId, productId: id, companyId: principal.companyId },
    });
    if (!row) throw new NotFoundException('Barcode not found');
    await this.db.$transaction([
      this.db.productBarcode.delete({ where: { id: barcodeId } }),
      this.db.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'product.barcode.removed',
          entityType: 'Product',
          entityId: id,
          previousValue: { barcode: row.barcode, unitId: row.unitId, isPrimary: row.isPrimary },
        },
      }),
    ]);
  }

  async setPrice(principal: AuthPrincipal, id: string, dto: PriceDto) {
    const product = await this.requireProduct(principal, id);
    await this.requireProductUnit(principal, product, dto.unitId);
    await this.db.$transaction(async (tx) => {
      const existing = await tx.productPrice.findUnique({
        where: {
          companyId_productId_unitId_type: {
            companyId: principal.companyId,
            productId: id,
            unitId: dto.unitId,
            type: dto.type,
          },
        },
      });
      const row = await tx.productPrice.upsert({
        where: {
          companyId_productId_unitId_type: {
            companyId: principal.companyId,
            productId: id,
            unitId: dto.unitId,
            type: dto.type,
          },
        },
        create: {
          companyId: principal.companyId,
          productId: id,
          unitId: dto.unitId,
          type: dto.type,
          amount: dto.amount,
        },
        update: { amount: dto.amount, isActive: true },
      });
      await tx.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'product.price.changed',
          entityType: 'Product',
          entityId: id,
          previousValue: existing
            ? { unitId: existing.unitId, type: existing.type, amount: existing.amount.toString() }
            : undefined,
          newValue: { unitId: row.unitId, type: row.type, amount: row.amount.toString() },
        },
      });
    });
    return this.get(principal, id);
  }

  async convert(principal: AuthPrincipal, id: string, dto: ConvertQuantityDto) {
    const product = await this.db.product.findFirst({
      where: { id, companyId: principal.companyId },
      include: {
        baseUnit: true,
        conversions: { where: { isActive: true }, include: { fromUnit: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    const quantity = new Prisma.Decimal(dto.quantity);
    const sourceFactor =
      dto.unitId === product.baseUnitId
        ? new Prisma.Decimal(1)
        : product.conversions.find((x) => x.fromUnitId === dto.unitId)?.factorToBase;
    if (!sourceFactor) throw new BadRequestException('Unit is not configured for this product');
    const baseQuantity = quantity.mul(sourceFactor);
    return {
      input: { quantity: quantity.toFixed(), unitId: dto.unitId },
      base: { quantity: baseQuantity.toDecimalPlaces(10).toFixed(), unit: product.baseUnit },
      equivalents: product.conversions.map((x) => ({
        unit: x.fromUnit,
        quantity: baseQuantity
          .div(x.factorToBase)
          .toDecimalPlaces(x.fromUnit.decimalScale)
          .toFixed(),
        factorToBase: x.factorToBase.toFixed(),
      })),
    };
  }

  private async validateReferences(principal: AuthPrincipal, dto: Partial<CreateProductDto>) {
    const checks: Promise<unknown>[] = [];
    if (dto.baseUnitId) checks.push(this.requireValidUnit(principal, dto.baseUnitId));
    if (dto.categoryId) checks.push(this.requireActive(principal, 'category', dto.categoryId));
    if (dto.brandId) checks.push(this.requireActive(principal, 'brand', dto.brandId));
    if (dto.manufacturerId)
      checks.push(this.requireActive(principal, 'manufacturer', dto.manufacturerId));
    await Promise.all(checks);
  }
  private async requireActive(
    principal: AuthPrincipal,
    kind: 'category' | 'brand' | 'manufacturer',
    id: string,
  ) {
    const found =
      kind === 'category'
        ? await this.db.category.findFirst({
            where: { id, companyId: principal.companyId, isActive: true },
          })
        : kind === 'brand'
          ? await this.db.brand.findFirst({
              where: { id, companyId: principal.companyId, isActive: true },
            })
          : await this.db.manufacturer.findFirst({
              where: { id, companyId: principal.companyId, isActive: true },
            });
    if (!found) throw new BadRequestException(`${kind} is invalid or inactive`);
  }
  private async requireValidUnit(principal: AuthPrincipal, id: string) {
    const unit = await this.db.unit.findFirst({
      where: { id, companyId: principal.companyId, isActive: true },
    });
    if (!unit) throw new BadRequestException('Unit is invalid or inactive');
    return unit;
  }
  private async requireProduct(principal: AuthPrincipal, id: string) {
    const product = await this.db.product.findFirst({
      where: { id, companyId: principal.companyId },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
  private async requireProductUnit(
    principal: AuthPrincipal,
    product: { id: string; baseUnitId: string },
    unitId: string,
  ) {
    if (unitId === product.baseUnitId) return;
    const conversion = await this.db.unitConversion.findFirst({
      where: {
        companyId: principal.companyId,
        productId: product.id,
        fromUnitId: unitId,
        isActive: true,
      },
    });
    if (!conversion) throw new BadRequestException('Unit is not configured for this product');
  }
  private validateProfiles(
    type: ProductType,
    tile?: TileProfileDto,
    sanitary?: SanitaryProfileDto,
  ) {
    if (type === ProductType.TILE && !tile)
      throw new BadRequestException('TILE products require a tile profile');
    if (type !== ProductType.TILE && tile)
      throw new BadRequestException('Tile profile is allowed only for TILE products');
    if (type !== ProductType.SANITARY && sanitary)
      throw new BadRequestException('Sanitary profile is allowed only for SANITARY products');
  }
  private validateUnitConfiguration(
    base: string,
    conversions: ConversionDto[],
    barcodes: BarcodeDto[],
    prices: PriceDto[],
  ) {
    const units = new Set<string>([base]);
    for (const conversion of conversions) {
      if (conversion.unitId === base)
        throw new BadRequestException('Base unit conversion is implicitly 1');
      if (units.has(conversion.unitId)) throw new BadRequestException('Duplicate conversion unit');
      units.add(conversion.unitId);
    }
    if (barcodes.filter((x) => x.isPrimary).length > 1)
      throw new BadRequestException('Only one primary barcode is allowed');
    for (const row of [...barcodes, ...prices])
      if (row.unitId && !units.has(row.unitId))
        throw new BadRequestException('Barcode or price unit is not configured for this product');
    const priceKeys = new Set<string>();
    for (const price of prices) {
      const key = `${price.unitId}:${price.type}`;
      if (priceKeys.has(key)) throw new BadRequestException('Duplicate unit price');
      priceKeys.add(key);
    }
  }
  private tileData(dto: TileProfileDto) {
    const multiplier =
      dto.dimensionUnit === 'MM'
        ? new Prisma.Decimal(1)
        : dto.dimensionUnit === 'CM'
          ? new Prisma.Decimal(10)
          : new Prisma.Decimal('25.4');
    return {
      widthMm: new Prisma.Decimal(dto.width).mul(multiplier),
      heightMm: new Prisma.Decimal(dto.height).mul(multiplier),
      thicknessMm: dto.thicknessMm,
      displaySize: dto.displaySize,
      series: dto.series,
      finish: dto.finish,
      surface: dto.surface,
      color: dto.color,
      grade: dto.grade,
      countryOfOrigin: dto.countryOfOrigin,
    };
  }
  private tileJson(value: {
    widthMm: Prisma.Decimal;
    heightMm: Prisma.Decimal;
    thicknessMm?: Prisma.Decimal | string | null;
    displaySize?: string | null;
    series?: string | null;
  }) {
    return {
      widthMm: value.widthMm.toString(),
      heightMm: value.heightMm.toString(),
      thicknessMm: value.thicknessMm?.toString(),
      displaySize: value.displaySize,
      series: value.series,
    };
  }
  private present(product: ProductDetail, principal: AuthPrincipal) {
    const nominal = product.tileProfile
      ? {
          squareFeetPerPiece: product.tileProfile.widthMm
            .mul(product.tileProfile.heightMm)
            .div('92903.04')
            .toDecimalPlaces(10)
            .toFixed(),
          squareMetersPerPiece: product.tileProfile.widthMm
            .mul(product.tileProfile.heightMm)
            .div('1000000')
            .toDecimalPlaces(10)
            .toFixed(),
          informationalOnly: true,
        }
      : null;
    return {
      ...product,
      standardCost: principal.permissions.has(PERMISSIONS.PRODUCT_VIEW_COST)
        ? (product.standardCost?.toFixed() ?? null)
        : undefined,
      reorderLevel: product.reorderLevel?.toFixed() ?? null,
      tileProfile: product.tileProfile
        ? {
            ...product.tileProfile,
            widthMm: product.tileProfile.widthMm.toFixed(),
            heightMm: product.tileProfile.heightMm.toFixed(),
            thicknessMm: product.tileProfile.thicknessMm?.toFixed() ?? null,
            nominalCoverage: nominal,
          }
        : null,
      conversions: product.conversions.map((x) => ({
        ...x,
        factorToBase: x.factorToBase.toFixed(),
      })),
      prices:
        principal.permissions.has(PERMISSIONS.PRICING_VIEW) ||
        principal.permissions.has(PERMISSIONS.PRICING_MANAGE)
          ? product.prices.map((x) => ({ ...x, amount: x.amount.toFixed() }))
          : [],
    };
  }
  private mapConflict(error: unknown): never {
    if (isUniqueConstraintError(error))
      throw new ConflictException(
        'SKU, barcode, conversion, or price conflicts with an existing catalog record',
      );
    throw error;
  }
}
