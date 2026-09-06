import { randomUUID } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PasswordService } from '../auth/password.service';
import { PERMISSION_CATALOG } from '../authorization/permission-catalog';
import { DatabaseService } from '../database/database.service';

jest.setTimeout(40_000);
const PASSWORD = 'Phase5Password123';

describe('Phase 5 catalog API', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let companyId: string;
  let foreignCompanyId: string;
  let ownerToken: string;
  let limitedToken: string;
  let pcsId: string;
  let boxId: string;
  let sqftId: string;
  let sqmId: string;
  let categoryId: string;
  let brandId: string;
  let manufacturerId: string;
  let tileId: string;
  let limitedRoleId: string;
  const suffix = randomUUID().slice(0, 8);
  const companyCode = `P5${suffix}`.toUpperCase();
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    db = app.get(DatabaseService);
    const passwords = app.get(PasswordService);
    await db.$transaction(
      PERMISSION_CATALOG.map((key) =>
        db.permission.upsert({ where: { key }, update: {}, create: { key } }),
      ),
    );
    const [company, foreign] = await Promise.all([
      db.company.create({ data: { code: companyCode, name: 'Phase 5 Company' } }),
      db.company.create({ data: { code: `X${companyCode}`, name: 'Foreign Catalog Company' } }),
    ]);
    companyId = company.id;
    foreignCompanyId = foreign.id;
    const passwordHash = await passwords.hash(PASSWORD);
    const [owner, limited, ownerRole, limitedRole] = await db.$transaction([
      db.user.create({
        data: {
          companyId,
          email: `owner-${suffix}@example.invalid`,
          passwordHash,
          firstName: 'Owner',
        },
      }),
      db.user.create({
        data: {
          companyId,
          email: `limited-${suffix}@example.invalid`,
          passwordHash,
          firstName: 'Limited',
        },
      }),
      db.role.create({ data: { companyId, key: `owner-${suffix}`, name: 'Owner' } }),
      db.role.create({ data: { companyId, key: `limited-${suffix}`, name: 'Limited' } }),
    ]);
    const permissions = await db.permission.findMany({ select: { id: true } });
    limitedRoleId = limitedRole.id;
    await db.$transaction([
      db.userRole.create({ data: { companyId, userId: owner.id, roleId: ownerRole.id } }),
      db.userRole.create({ data: { companyId, userId: limited.id, roleId: limitedRole.id } }),
      db.rolePermission.createMany({
        data: permissions.map(({ id }) => ({ companyId, roleId: ownerRole.id, permissionId: id })),
      }),
    ]);
    const login = async (email: string) =>
      (
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ companyCode, email, password: PASSWORD })
          .expect(200)
      ).body.accessToken as string;
    ownerToken = await login(owner.email);
    limitedToken = await login(limited.email);
  });

  afterAll(async () => {
    for (const id of [companyId, foreignCompanyId].filter(Boolean)) {
      await db.$transaction([
        db.authSession.deleteMany({ where: { companyId: id } }),
        db.auditLog.deleteMany({ where: { companyId: id } }),
        db.productBarcode.deleteMany({ where: { companyId: id } }),
        db.productPrice.deleteMany({ where: { companyId: id } }),
        db.unitConversion.deleteMany({ where: { companyId: id } }),
        db.productSanitaryProfile.deleteMany({ where: { companyId: id } }),
        db.productTileProfile.deleteMany({ where: { companyId: id } }),
        db.product.deleteMany({ where: { companyId: id } }),
      ]);
      await db.$transaction([
        db.category.deleteMany({ where: { companyId: id } }),
        db.brand.deleteMany({ where: { companyId: id } }),
        db.manufacturer.deleteMany({ where: { companyId: id } }),
        db.unit.deleteMany({ where: { companyId: id } }),
        db.userRole.deleteMany({ where: { companyId: id } }),
        db.rolePermission.deleteMany({ where: { companyId: id } }),
      ]);
      await db.$transaction([
        db.customer.deleteMany({ where: { companyId: id } }),
        db.user.deleteMany({ where: { companyId: id } }),
        db.role.deleteMany({ where: { companyId: id } }),
      ]);
      await db.company.delete({ where: { id } });
    }
    await app?.close();
  });

  it('creates and manages category hierarchy, brand, manufacturer, and units', async () => {
    const root = await request(app.getHttpServer())
      .post('/categories')
      .set(auth(ownerToken))
      .send({ name: 'Tiles', slug: 'tiles' })
      .expect(201);
    categoryId = root.body.id as string;
    const child = await request(app.getHttpServer())
      .post('/categories')
      .set(auth(ownerToken))
      .send({ name: 'Floor Tiles', slug: 'floor-tiles', parentId: categoryId })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/categories/${categoryId}`)
      .set(auth(ownerToken))
      .send({ parentId: child.body.id })
      .expect(400);
    brandId = (
      await request(app.getHttpServer())
        .post('/brands')
        .set(auth(ownerToken))
        .send({ name: 'Example Brand', slug: 'example-brand' })
        .expect(201)
    ).body.id as string;
    manufacturerId = (
      await request(app.getHttpServer())
        .post('/manufacturers')
        .set(auth(ownerToken))
        .send({ name: 'Example Ceramics', slug: 'example-ceramics' })
        .expect(201)
    ).body.id as string;
    for (const [code, name, scale] of [
      ['PCS', 'Pieces', 0],
      ['BOX', 'Box', 0],
      ['SQFT', 'Square Feet', 6],
      ['SQM', 'Square Meter', 6],
    ] as const) {
      const response = await request(app.getHttpServer())
        .post('/units')
        .set(auth(ownerToken))
        .send({ code, name, decimalScale: scale })
        .expect(201);
      if (code === 'PCS') pcsId = response.body.id as string;
      if (code === 'BOX') boxId = response.body.id as string;
      if (code === 'SQFT') sqftId = response.body.id as string;
      if (code === 'SQM') sqmId = response.body.id as string;
    }
    await request(app.getHttpServer())
      .post('/brands')
      .set(auth(ownerToken))
      .send({ name: 'Duplicate', slug: 'example-brand' })
      .expect(409);
    await request(app.getHttpServer())
      .get('/units')
      .set(auth(ownerToken))
      .expect(200)
      .expect(({ body }) => expect(body.total).toBe(4));
  });

  it('enforces catalog permissions and inactive/foreign reference rejection', async () => {
    await request(app.getHttpServer()).get('/categories').set(auth(limitedToken)).expect(403);
    const foreignUnit = await db.unit.create({
      data: { companyId: foreignCompanyId, code: 'PCS', name: 'Foreign Piece' },
    });
    await request(app.getHttpServer())
      .post('/products')
      .set(auth(ownerToken))
      .send({ sku: 'ESCAPE-1', name: 'Escape', type: 'GENERAL', baseUnitId: foreignUnit.id })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/brands/${brandId}/status`)
      .set(auth(ownerToken))
      .send({ isActive: false })
      .expect(200);
    await request(app.getHttpServer())
      .post('/products')
      .set(auth(ownerToken))
      .send({
        sku: 'INACTIVE-1',
        name: 'Inactive Ref',
        type: 'GENERAL',
        baseUnitId: pcsId,
        brandId,
      })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/brands/${brandId}/status`)
      .set(auth(ownerToken))
      .send({ isActive: true })
      .expect(200);
  });

  it('creates a tile with nominal dimensions, commercial conversions, barcodes, and independent prices', async () => {
    const response = await request(app.getHttpServer())
      .post('/products')
      .set(auth(ownerToken))
      .send({
        sku: 'TILE-001',
        name: 'Premium Floor Tile',
        type: 'TILE',
        baseUnitId: pcsId,
        categoryId,
        brandId,
        manufacturerId,
        model: 'PFT-24',
        standardCost: '100.0000',
        tileProfile: {
          width: '24',
          height: '24',
          dimensionUnit: 'INCH',
          displaySize: '24 × 24 inch',
          finish: 'Polished',
        },
        conversions: [
          { unitId: boxId, factorToBase: '4' },
          { unitId: sqftId, factorToBase: '0.25' },
          { unitId: sqmId, factorToBase: '2.6909776042' },
        ],
        barcodes: [
          { barcode: `BOX${suffix}`, unitId: boxId, isPrimary: true },
          { barcode: `PCS${suffix}`, unitId: pcsId },
        ],
        prices: [
          { unitId: pcsId, type: 'RETAIL', amount: '500.0000' },
          { unitId: boxId, type: 'RETAIL', amount: '1850.0000' },
          { unitId: sqftId, type: 'RETAIL', amount: '120.0000' },
          { unitId: boxId, type: 'WHOLESALE', amount: '1750.0000' },
        ],
      })
      .expect(201);
    tileId = response.body.id as string;
    expect(response.body.tileProfile).toMatchObject({ widthMm: '609.6', heightMm: '609.6' });
    expect(response.body.tileProfile.nominalCoverage.squareFeetPerPiece).toBe('4');
    expect(
      response.body.prices.find(
        (x: { unit: { code: string }; type: string }) =>
          x.unit.code === 'BOX' && x.type === 'RETAIL',
      ).amount,
    ).toBe('1850');
  });

  it('protects price mutation and cost visibility with dedicated permissions', async () => {
    const permissions = await db.permission.findMany({
      where: { key: { in: ['product.view', 'product.create', 'product.edit'] } },
      select: { id: true },
    });
    await db.rolePermission.createMany({
      data: permissions.map(({ id }) => ({
        companyId,
        roleId: limitedRoleId,
        permissionId: id,
      })),
    });
    const detail = await request(app.getHttpServer())
      .get(`/products/${tileId}`)
      .set(auth(limitedToken))
      .expect(200);
    expect(detail.body.standardCost).toBeUndefined();
    expect(detail.body.prices).toEqual([]);
    await request(app.getHttpServer())
      .post('/products')
      .set(auth(limitedToken))
      .send({
        sku: 'LIMITED-PRICE',
        name: 'Unauthorized Price',
        type: 'GENERAL',
        baseUnitId: pcsId,
        prices: [{ unitId: pcsId, type: 'RETAIL', amount: '10' }],
      })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/products/${tileId}`)
      .set(auth(limitedToken))
      .send({ standardCost: '1' })
      .expect(403);
  });

  it('converts Box, PCS, Sq.ft, and Sq.m through one base quantity with Decimal precision', async () => {
    const boxes = await request(app.getHttpServer())
      .post(`/products/${tileId}/convert`)
      .set(auth(ownerToken))
      .send({ unitId: boxId, quantity: '2' })
      .expect(201);
    expect(boxes.body.base.quantity).toBe('8');
    expect(
      boxes.body.equivalents.find((x: { unit: { code: string } }) => x.unit.code === 'SQFT')
        .quantity,
    ).toBe('32');
    expect(
      boxes.body.equivalents.find((x: { unit: { code: string } }) => x.unit.code === 'SQM')
        .quantity,
    ).toBe('2.972897');
    const sqft = await request(app.getHttpServer())
      .post(`/products/${tileId}/convert`)
      .set(auth(ownerToken))
      .send({ unitId: sqftId, quantity: '10.7639104167' })
      .expect(201);
    expect(sqft.body.base.quantity).toBe('2.6909776042');
    expect(
      sqft.body.equivalents.find((x: { unit: { code: string } }) => x.unit.code === 'SQM').quantity,
    ).toBe('1');
    await request(app.getHttpServer())
      .put(`/products/${tileId}/conversions`)
      .set(auth(ownerToken))
      .send({ unitId: boxId, factorToBase: '0' })
      .expect(400);
  });

  it('supports barcode lookup, ambiguity prevention, indexed search, and company isolation', async () => {
    const lookup = await request(app.getHttpServer())
      .get(`/products/barcode/BOX${suffix}`)
      .set(auth(ownerToken))
      .expect(200);
    expect(lookup.body.product.id).toBe(tileId);
    await request(app.getHttpServer())
      .post(`/products/${tileId}/barcodes`)
      .set(auth(ownerToken))
      .send({ barcode: `BOX${suffix}`, unitId: boxId })
      .expect(409);
    const search = await request(app.getHttpServer())
      .get('/products?search=PFT-24')
      .set(auth(ownerToken))
      .expect(200);
    expect(search.body.items).toHaveLength(1);
    const foreignProduct = await db.product.create({
      data: {
        companyId: foreignCompanyId,
        sku: 'FOREIGN',
        name: 'Foreign',
        type: 'GENERAL',
        baseUnitId: (await db.unit.findFirstOrThrow({ where: { companyId: foreignCompanyId } })).id,
      },
    });
    await request(app.getHttpServer())
      .get(`/products/${foreignProduct.id}`)
      .set(auth(ownerToken))
      .expect(404);
  });

  it('creates sanitary products without tile-only requirements', async () => {
    const result = await request(app.getHttpServer())
      .post('/products')
      .set(auth(ownerToken))
      .send({
        sku: 'BASIN-001',
        name: 'Counter Basin',
        type: 'SANITARY',
        baseUnitId: pcsId,
        sanitaryProfile: {
          size: '560 mm',
          color: 'White',
          material: 'Ceramic',
          warrantyMonths: 60,
        },
        prices: [{ unitId: pcsId, type: 'RETAIL', amount: '8500.0000' }],
      })
      .expect(201);
    expect(result.body.tileProfile).toBeNull();
    expect(result.body.sanitaryProfile).toMatchObject({ material: 'Ceramic', warrantyMonths: 60 });
    await request(app.getHttpServer())
      .post('/products')
      .set(auth(ownerToken))
      .send({
        sku: 'BAD-GENERAL',
        name: 'Bad General',
        type: 'GENERAL',
        baseUnitId: pcsId,
        tileProfile: { width: '24', height: '24', dimensionUnit: 'INCH' },
      })
      .expect(400);
  });

  it('updates catalog records through deactivation and records audit events', async () => {
    await request(app.getHttpServer())
      .patch(`/products/${tileId}`)
      .set(auth(ownerToken))
      .send({ name: 'Premium Floor Tile Updated' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/products/${tileId}/status`)
      .set(auth(ownerToken))
      .send({ isActive: false })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/products/barcode/BOX${suffix}`)
      .set(auth(ownerToken))
      .expect(404);
    const auditCount = await db.auditLog.count({
      where: {
        companyId,
        entityId: tileId,
        action: {
          in: [
            'product.created',
            'product.updated',
            'product.status.changed',
            'product.conversion.changed',
            'product.barcode.added',
            'product.price.changed',
          ],
        },
      },
    });
    expect(auditCount).toBeGreaterThanOrEqual(3);
  });
});
