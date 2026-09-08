import { randomUUID } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PasswordService } from '../auth/password.service';
import { PERMISSION_CATALOG } from '../authorization/permission-catalog';
import { DatabaseService } from '../database/database.service';

jest.setTimeout(120_000);
const PASSWORD = 'Phase9Password123';

describe('Phase 9 POS and sales API', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let companyId = '';
  let foreignCompanyId = '';
  let foreignCustomerId = '';
  let branchId = '';
  let warehouseId = '';
  let registerId = '';
  let walkInId = '';
  let customerId = '';
  let pcsId = '';
  let boxId = '';
  let sqftId = '';
  let tileId = '';
  let tileBatchId = '';
  let sanitaryId = '';
  let raceProductId = '';
  let cashId = '';
  let ownerId = '';
  let ownerToken = '';
  let limitedToken = '';
  let completedSaleId = '';
  const suffix = randomUUID().slice(0, 8);
  const companyCode = `P9${suffix}`.toUpperCase();
  const auth = (token: string) => ({ authorization: `Bearer ${token}`, 'x-branch-id': branchId });
  const key = () => `phase9-${randomUUID()}`;

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
      PERMISSION_CATALOG.map((permissionKey) =>
        db.permission.upsert({
          where: { key: permissionKey },
          update: {},
          create: { key: permissionKey },
        }),
      ),
    );
    const company = await db.company.create({
      data: { code: companyCode, name: 'Phase 9 Company' },
    });
    companyId = company.id;
    const foreign = await db.company.create({
      data: { code: `F9${suffix}`.toUpperCase(), name: 'Foreign Phase 9 Company' },
    });
    foreignCompanyId = foreign.id;
    foreignCustomerId = (
      await db.customer.findFirstOrThrow({ where: { companyId: foreignCompanyId, isWalkIn: true } })
    ).id;
    walkInId = (await db.customer.findFirstOrThrow({ where: { companyId, isWalkIn: true } })).id;
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
          firstName: 'Cashier',
        },
      }),
      db.role.create({ data: { companyId, key: `owner-${suffix}`, name: 'Owner' } }),
      db.role.create({ data: { companyId, key: `cashier-${suffix}`, name: 'Cashier' } }),
    ]);
    ownerId = owner.id;
    const permissions = await db.permission.findMany({ select: { id: true, key: true } });
    const branch = await db.branch.create({ data: { companyId, code: 'MAIN', name: 'Main' } });
    branchId = branch.id;
    await db.$transaction([
      db.userRole.create({ data: { companyId, userId: owner.id, roleId: ownerRole.id } }),
      db.userRole.create({ data: { companyId, userId: limited.id, roleId: limitedRole.id } }),
      db.userBranch.create({ data: { companyId, userId: limited.id, branchId } }),
      db.rolePermission.createMany({
        data: permissions.map(({ id }) => ({ companyId, roleId: ownerRole.id, permissionId: id })),
      }),
      db.rolePermission.createMany({
        data: permissions
          .filter(({ key: permission }) => ['sale.create', 'sale.view'].includes(permission))
          .map(({ id }) => ({ companyId, roleId: limitedRole.id, permissionId: id })),
      }),
    ]);
    const [warehouse, register, customer, pcs, box, sqft, cash] = await db.$transaction([
      db.warehouse.create({ data: { companyId, branchId, code: 'WH', name: 'POS Warehouse' } }),
      db.register.create({ data: { companyId, branchId, code: 'POS-1', name: 'Counter 1' } }),
      db.customer.create({
        data: { companyId, code: 'CREDIT-1', name: 'Credit Customer', creditLimit: '500' },
      }),
      db.unit.create({ data: { companyId, code: 'PCS', name: 'Pieces', decimalScale: 0 } }),
      db.unit.create({ data: { companyId, code: 'BOX', name: 'Boxes', decimalScale: 0 } }),
      db.unit.create({
        data: { companyId, code: 'SQFT', name: 'Square feet', decimalScale: 4 },
      }),
      db.paymentMethod.create({ data: { companyId, code: 'CASH', name: 'Cash', isCash: true } }),
    ]);
    warehouseId = warehouse.id;
    registerId = register.id;
    customerId = customer.id;
    pcsId = pcs.id;
    boxId = box.id;
    sqftId = sqft.id;
    cashId = cash.id;
    const shift = await db.cashShift.create({
      data: { companyId, branchId, registerId, cashierId: ownerId, openingCash: '0' },
    });
    await db.cashMovement.create({
      data: {
        companyId,
        branchId,
        shiftId: shift.id,
        registerId,
        recordedById: ownerId,
        type: 'OPENING',
        amount: '0',
        referenceType: 'CASH_SHIFT',
        referenceId: shift.id,
      },
    });
    const [tile, sanitary, race] = await db.$transaction([
      db.product.create({
        data: {
          companyId,
          sku: 'TILE-P9',
          name: 'Premium 24x24 Tile',
          type: 'TILE',
          baseUnitId: pcsId,
          batchTracking: true,
          standardCost: '50',
        },
      }),
      db.product.create({
        data: {
          companyId,
          sku: 'BASIN-P9',
          name: 'Premium Basin',
          type: 'SANITARY',
          baseUnitId: pcsId,
          standardCost: '3000',
        },
      }),
      db.product.create({
        data: {
          companyId,
          sku: 'RACE-P9',
          name: 'Oversell Race Item',
          type: 'GENERAL',
          baseUnitId: pcsId,
          standardCost: '1',
        },
      }),
    ]);
    tileId = tile.id;
    sanitaryId = sanitary.id;
    raceProductId = race.id;
    const batch = await db.productBatch.create({
      data: { companyId, productId: tileId, batchNumber: 'B-001', lotNumber: 'L-1', shade: 'A' },
    });
    tileBatchId = batch.id;
    await db.$transaction([
      db.unitConversion.create({
        data: { companyId, productId: tileId, fromUnitId: boxId, factorToBase: '4' },
      }),
      db.unitConversion.create({
        data: { companyId, productId: tileId, fromUnitId: sqftId, factorToBase: '0.25' },
      }),
      db.productBarcode.create({
        data: {
          companyId,
          productId: tileId,
          unitId: boxId,
          barcode: `BOX${suffix}`,
          isPrimary: true,
        },
      }),
      db.productPrice.createMany({
        data: [
          { companyId, productId: tileId, unitId: boxId, type: 'RETAIL', amount: '1850' },
          { companyId, productId: tileId, unitId: boxId, type: 'WHOLESALE', amount: '1700' },
          { companyId, productId: tileId, unitId: boxId, type: 'MINIMUM', amount: '1800' },
          { companyId, productId: tileId, unitId: sqftId, type: 'RETAIL', amount: '120' },
          { companyId, productId: tileId, unitId: sqftId, type: 'WHOLESALE', amount: '110' },
          { companyId, productId: tileId, unitId: sqftId, type: 'MINIMUM', amount: '100' },
          { companyId, productId: sanitaryId, unitId: pcsId, type: 'RETAIL', amount: '5000' },
          { companyId, productId: sanitaryId, unitId: pcsId, type: 'WHOLESALE', amount: '4500' },
          { companyId, productId: sanitaryId, unitId: pcsId, type: 'MINIMUM', amount: '4000' },
          { companyId, productId: raceProductId, unitId: pcsId, type: 'RETAIL', amount: '10' },
        ],
      }),
      db.inventoryBalance.create({
        data: {
          companyId,
          branchId,
          warehouseId,
          productId: tileId,
          batchId: tileBatchId,
          baseQuantity: '40',
        },
      }),
      db.inventoryBalance.create({
        data: { companyId, branchId, warehouseId, productId: sanitaryId, baseQuantity: '10' },
      }),
      db.inventoryBalance.create({
        data: { companyId, branchId, warehouseId, productId: raceProductId, baseQuantity: '10' },
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
    if (companyId) {
      const triggers: Array<[string, string]> = [
        ['Payment', 'Payment_completed_immutable'],
        ['SalePayment', 'SalePayment_immutable'],
        ['Sale', 'Sale_completed_immutable'],
        ['SaleItem', 'SaleItem_completed_immutable'],
        ['InventoryMovement', 'InventoryMovement_immutable_delete'],
        ['CustomerLedgerEntry', 'CustomerLedgerEntry_immutable_delete'],
        ['CashMovement', 'CashMovement_immutable'],
        ['CashShift', 'CashShift_guard'],
      ];
      for (const [table, trigger] of triggers)
        await db.$executeRawUnsafe(`ALTER TABLE "${table}" DISABLE TRIGGER "${trigger}"`);
      await db.cashMovement.deleteMany({ where: { companyId } });
      await db.cashOperation.deleteMany({ where: { companyId } });
      await db.cashShift.deleteMany({ where: { companyId } });
      await db.salePayment.deleteMany({ where: { companyId } });
      await db.payment.deleteMany({ where: { companyId } });
      await db.customerLedgerEntry.deleteMany({ where: { companyId } });
      await db.inventoryMovement.deleteMany({ where: { companyId } });
      await db.salesOperation.deleteMany({ where: { companyId } });
      await db.saleItem.deleteMany({ where: { companyId } });
      await db.sale.deleteMany({ where: { companyId } });
      await db.salesDocumentSequence.deleteMany({ where: { companyId } });
      await db.auditLog.deleteMany({ where: { companyId } });
      await db.authSession.deleteMany({ where: { companyId } });
      await db.inventoryBalance.deleteMany({ where: { companyId } });
      await db.productBatch.deleteMany({ where: { companyId } });
      await db.productBarcode.deleteMany({ where: { companyId } });
      await db.productPrice.deleteMany({ where: { companyId } });
      await db.unitConversion.deleteMany({ where: { companyId } });
      await db.product.deleteMany({ where: { companyId } });
      await db.paymentMethod.deleteMany({ where: { companyId } });
      await db.userBranch.deleteMany({ where: { companyId } });
      await db.userRole.deleteMany({ where: { companyId } });
      await db.rolePermission.deleteMany({ where: { companyId } });
      await db.register.deleteMany({ where: { companyId } });
      await db.warehouse.deleteMany({ where: { companyId } });
      await db.branch.deleteMany({ where: { companyId } });
      await db.customer.deleteMany({ where: { companyId } });
      await db.user.deleteMany({ where: { companyId } });
      await db.role.deleteMany({ where: { companyId } });
      await db.unit.deleteMany({ where: { companyId } });
      await db.company.delete({ where: { id: companyId } });
      for (const [table, trigger] of triggers)
        await db.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE TRIGGER "${trigger}"`);
    }
    if (foreignCompanyId) {
      await db.customer.deleteMany({ where: { companyId: foreignCompanyId } });
      await db.company.delete({ where: { id: foreignCompanyId } });
    }
    await app?.close();
  });

  const saleBody = (customer = walkInId) => ({
    warehouseId,
    registerId,
    customerId: customer,
    pricingMode: 'RETAIL',
    items: [{ productId: sanitaryId, unitId: pcsId, quantity: '1' }],
  });

  it('returns indexed barcode/search results with unit price, stock, and batch shade', async () => {
    const barcode = await request(app.getHttpServer())
      .get(`/sales/pos/products?warehouseId=${warehouseId}&barcode=BOX${suffix}`)
      .set(auth(limitedToken))
      .expect(200);
    expect(barcode.body.items).toHaveLength(1);
    expect(barcode.body.items[0].scannedUnitId).toBe(boxId);
    expect(barcode.body.items[0].availability[0]).toMatchObject({
      batchNumber: 'B-001',
      shade: 'A',
      baseQuantity: '40',
    });
    expect(barcode.body.items[0].standardCost).toBeUndefined();
    const search = await request(app.getHttpServer())
      .get(`/sales/pos/products?warehouseId=${warehouseId}&search=Premium`)
      .set(auth(ownerToken))
      .expect(200);
    expect(search.body.items.map((row: { sku: string }) => row.sku).sort()).toEqual([
      'BASIN-P9',
      'TILE-P9',
    ]);
  });

  it('holds and resumes a draft without inventory, payment, or ledger effects', async () => {
    const created = await request(app.getHttpServer())
      .post('/sales/drafts')
      .set(auth(ownerToken))
      .send(saleBody())
      .expect(201);
    expect(created.body.status).toBe('DRAFT');
    await request(app.getHttpServer())
      .post(`/sales/drafts/${created.body.id}/hold`)
      .set(auth(ownerToken))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/sales/drafts/${created.body.id}/resume`)
      .set(auth(ownerToken))
      .expect(201);
    expect(await db.inventoryMovement.count({ where: { companyId, type: 'SALE' } })).toBe(0);
    expect(await db.payment.count({ where: { companyId } })).toBe(0);
    expect(await db.customerLedgerEntry.count({ where: { companyId } })).toBe(0);
  });

  it('atomically completes a paid tile/sanitary sale with Decimal totals and snapshots', async () => {
    const body = {
      warehouseId,
      registerId,
      customerId: walkInId,
      salespersonId: ownerId,
      pricingMode: 'RETAIL',
      invoiceDiscount: '50',
      invoiceTax: '10',
      items: [
        {
          productId: tileId,
          unitId: boxId,
          batchId: tileBatchId,
          quantity: '2',
          requestedUnitPrice: '1900',
          priceOverrideReason: 'Approved showroom price',
          discount: '100',
          tax: '50',
        },
        { productId: sanitaryId, unitId: pcsId, quantity: '1' },
      ],
      payment: { methodId: cashId, amount: '8710', tendered: '9000' },
    };
    const completed = await request(app.getHttpServer())
      .post('/sales/complete')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send(body)
      .expect(201);
    completedSaleId = completed.body.id;
    expect(completed.body.invoiceNumber).toMatch(/^INV-\d{6}$/);
    expect(completed.body).toMatchObject({
      status: 'COMPLETED',
      subtotal: '8800',
      discount: '150',
      tax: '60',
      total: '8710',
      paid: '8710',
      due: '0',
      change: '290',
    });
    const balances = await db.inventoryBalance.findMany({
      where: { companyId, warehouseId, productId: { in: [tileId, sanitaryId] } },
      orderBy: { productId: 'asc' },
    });
    expect(balances.find((row) => row.productId === tileId)?.baseQuantity.toFixed()).toBe('32');
    expect(balances.find((row) => row.productId === sanitaryId)?.baseQuantity.toFixed()).toBe('9');
    expect(await db.customerLedgerEntry.count({ where: { companyId } })).toBe(0);
    expect(await db.salePayment.count({ where: { companyId, saleId: completed.body.id } })).toBe(1);
    await expect(
      db.sale.update({ where: { id: completed.body.id }, data: { total: '1' } }),
    ).rejects.toThrow(/immutable/i);
    await expect(
      db.saleItem.deleteMany({ where: { companyId, saleId: completed.body.id } }),
    ).rejects.toThrow(/immutable/i);
  });

  it('enforces walk-in settlement, credit limits, tenant ownership, and price permissions', async () => {
    await request(app.getHttpServer())
      .post('/sales/complete')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({ ...saleBody(), payment: { methodId: cashId, amount: '4700' } })
      .expect(409);
    const credit = await request(app.getHttpServer())
      .post('/sales/complete')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({ ...saleBody(customerId), payment: { methodId: cashId, amount: '4700' } })
      .expect(201);
    expect(credit.body.due).toBe('300');
    const ledger = await db.customerLedgerEntry.aggregate({
      where: { companyId, customerId },
      _sum: { amount: true },
    });
    expect(ledger._sum.amount?.toFixed(4)).toBe('300.0000');
    await request(app.getHttpServer())
      .post('/sales/complete')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({ ...saleBody(customerId), payment: { methodId: cashId, amount: '4700' } })
      .expect(409);
    await request(app.getHttpServer())
      .post('/sales/complete')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send(saleBody(foreignCustomerId))
      .expect(400);
    await request(app.getHttpServer())
      .post('/sales/complete')
      .set(auth(limitedToken))
      .set('Idempotency-Key', key())
      .send({
        ...saleBody(),
        items: [
          {
            productId: sanitaryId,
            unitId: pcsId,
            quantity: '1',
            requestedUnitPrice: '4500',
            priceOverrideReason: 'Unauthorized override',
          },
        ],
        payment: { methodId: cashId, amount: '4500' },
      })
      .expect(403);
    await request(app.getHttpServer())
      .post('/sales/complete')
      .set(auth(limitedToken))
      .set('Idempotency-Key', key())
      .send({
        ...saleBody(),
        invoiceDiscount: '1',
        payment: { methodId: cashId, amount: '4999' },
      })
      .expect(403);
  });

  it('sells tile area units through the snapshotted Sq.ft to PCS conversion', async () => {
    const before = await db.inventoryBalance.findFirstOrThrow({
      where: { companyId, warehouseId, productId: tileId, batchId: tileBatchId },
    });
    const completed = await request(app.getHttpServer())
      .post('/sales/complete')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        warehouseId,
        registerId,
        customerId: walkInId,
        pricingMode: 'RETAIL',
        items: [
          {
            productId: tileId,
            unitId: sqftId,
            batchId: tileBatchId,
            quantity: '4',
          },
        ],
        payment: { methodId: cashId, amount: '480' },
      })
      .expect(201);
    expect(completed.body).toMatchObject({ subtotal: '480', total: '480', due: '0' });
    const item = await db.saleItem.findFirstOrThrow({ where: { saleId: completed.body.id } });
    expect(item.conversionFactor.toFixed(4)).toBe('0.2500');
    expect(item.baseQuantity.toFixed(4)).toBe('1.0000');
    const after = await db.inventoryBalance.findFirstOrThrow({
      where: { companyId, warehouseId, productId: tileId, batchId: tileBatchId },
    });
    expect(before.baseQuantity.minus(after.baseQuantity).toFixed(4)).toBe('1.0000');
  });

  it('deduplicates simultaneous completion and prevents concurrent overselling', async () => {
    const idempotency = key();
    const idempotentBody = {
      ...saleBody(),
      payment: { methodId: cashId, amount: '5000' },
    };
    const duplicates = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post('/sales/complete')
          .set(auth(ownerToken))
          .set('Idempotency-Key', idempotency)
          .send(idempotentBody),
      ),
    );
    expect(duplicates.map((row) => row.status)).toEqual([201, 201]);
    expect(duplicates[0].body.id).toBe(duplicates[1].body.id);
    const raceBody = {
      warehouseId,
      registerId,
      customerId: walkInId,
      pricingMode: 'RETAIL',
      items: [{ productId: raceProductId, unitId: pcsId, quantity: '8' }],
      payment: { methodId: cashId, amount: '80' },
    };
    const outcomes = await Promise.all(
      [key(), key()].map((idempotencyKey) =>
        request(app.getHttpServer())
          .post('/sales/complete')
          .set(auth(ownerToken))
          .set('Idempotency-Key', idempotencyKey)
          .send(raceBody),
      ),
    );
    expect(outcomes.map((row) => row.status).sort()).toEqual([201, 409]);
    const balance = await db.inventoryBalance.findFirstOrThrow({
      where: { companyId, warehouseId, productId: raceProductId },
    });
    expect(balance.baseQuantity.toFixed()).toBe('2');
    const history = await request(app.getHttpServer())
      .get('/sales?search=INV-&status=COMPLETED')
      .set(auth(ownerToken))
      .expect(200);
    expect(history.body.total).toBeGreaterThanOrEqual(4);
    await request(app.getHttpServer())
      .get(`/sales/${completedSaleId}`)
      .set(auth(ownerToken))
      .expect(200);
  });
});
