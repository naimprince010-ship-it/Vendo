import { randomUUID } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PasswordService } from '../auth/password.service';
import { PERMISSION_CATALOG } from '../authorization/permission-catalog';
import { DatabaseService } from '../database/database.service';

jest.setTimeout(180_000);
const PASSWORD = 'Phase10Password123';

describe('Phase 10 payments, returns, refunds, and exchange API', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let companyId = '';
  let branchId = '';
  let warehouseId = '';
  let registerId = '';
  let customerId = '';
  let pcsId = '';
  let boxId = '';
  let tileId = '';
  let tileBatchId = '';
  let basinId = '';
  let cashId = '';
  let cardId = '';
  let mfsId = '';
  let ownerToken = '';
  let limitedToken = '';
  let splitSaleId = '';
  const suffix = randomUUID().slice(0, 8);
  const companyCode = `P10${suffix}`.toUpperCase();
  const auth = (token: string) => ({ authorization: `Bearer ${token}`, 'x-branch-id': branchId });
  const key = () => `phase10-${randomUUID()}`;

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
      data: { code: companyCode, name: 'Phase 10 Company' },
    });
    companyId = company.id;
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
      db.role.create({ data: { companyId, key: `limited-${suffix}`, name: 'Limited' } }),
    ]);
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
    const [warehouse, register, customer, pcs, box, cash, card, mfs] = await db.$transaction([
      db.warehouse.create({ data: { companyId, branchId, code: 'WH', name: 'Warehouse' } }),
      db.register.create({ data: { companyId, branchId, code: 'POS', name: 'Counter' } }),
      db.customer.create({
        data: { companyId, code: 'CREDIT', name: 'Credit Customer', creditLimit: '10000' },
      }),
      db.unit.create({ data: { companyId, code: 'PCS', name: 'Pieces', decimalScale: 0 } }),
      db.unit.create({ data: { companyId, code: 'BOX', name: 'Boxes', decimalScale: 0 } }),
      db.paymentMethod.create({ data: { companyId, code: 'CASH', name: 'Cash', isCash: true } }),
      db.paymentMethod.create({ data: { companyId, code: 'CARD', name: 'Card' } }),
      db.paymentMethod.create({ data: { companyId, code: 'MFS', name: 'Mobile' } }),
    ]);
    warehouseId = warehouse.id;
    registerId = register.id;
    customerId = customer.id;
    pcsId = pcs.id;
    boxId = box.id;
    cashId = cash.id;
    cardId = card.id;
    mfsId = mfs.id;
    const shift = await db.cashShift.create({
      data: { companyId, branchId, registerId, cashierId: owner.id, openingCash: '0' },
    });
    await db.cashMovement.create({
      data: {
        companyId,
        branchId,
        shiftId: shift.id,
        registerId,
        recordedById: owner.id,
        type: 'OPENING',
        amount: '0',
        referenceType: 'CASH_SHIFT',
        referenceId: shift.id,
      },
    });
    const [tile, basin] = await db.$transaction([
      db.product.create({
        data: {
          companyId,
          sku: 'TILE-P10',
          name: 'Phase 10 Tile',
          type: 'TILE',
          baseUnitId: pcsId,
          batchTracking: true,
          standardCost: '20',
        },
      }),
      db.product.create({
        data: {
          companyId,
          sku: 'BASIN-P10',
          name: 'Phase 10 Basin',
          type: 'SANITARY',
          baseUnitId: pcsId,
          standardCost: '400',
        },
      }),
    ]);
    tileId = tile.id;
    basinId = basin.id;
    tileBatchId = (
      await db.productBatch.create({
        data: { companyId, productId: tileId, batchNumber: 'RET-B1', shade: 'A' },
      })
    ).id;
    await db.$transaction([
      db.unitConversion.create({
        data: { companyId, productId: tileId, fromUnitId: boxId, factorToBase: '4' },
      }),
      db.productPrice.createMany({
        data: [
          { companyId, productId: tileId, unitId: boxId, type: 'RETAIL', amount: '200' },
          { companyId, productId: basinId, unitId: pcsId, type: 'RETAIL', amount: '1000' },
        ],
      }),
      db.inventoryBalance.create({
        data: {
          companyId,
          branchId,
          warehouseId,
          productId: tileId,
          batchId: tileBatchId,
          baseQuantity: '100',
        },
      }),
      db.inventoryBalance.create({
        data: { companyId, branchId, warehouseId, productId: basinId, baseQuantity: '100' },
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
        ['SaleReturn', 'SaleReturn_immutable'],
        ['SaleReturnItem', 'SaleReturnItem_immutable'],
        ['SaleRefund', 'SaleRefund_immutable'],
        ['SaleExchange', 'SaleExchange_immutable'],
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
      await db.saleRefund.deleteMany({ where: { companyId } });
      await db.saleExchange.deleteMany({ where: { companyId } });
      await db.saleReturnItem.deleteMany({ where: { companyId } });
      await db.saleReturn.deleteMany({ where: { companyId } });
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
    await app?.close();
  });

  const saleBody = (
    productId: string,
    unitId: string,
    quantity: string,
    customer = customerId,
  ) => ({
    warehouseId,
    registerId,
    customerId: customer,
    pricingMode: 'RETAIL',
    items: [
      {
        productId,
        unitId,
        quantity,
        ...(productId === tileId ? { batchId: tileBatchId } : {}),
      },
    ],
  });

  const complete = async (body: object) =>
    request(app.getHttpServer())
      .post('/sales/complete')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send(body)
      .expect(201);

  it('supports configured split payments, cash change, and a real due remainder', async () => {
    const result = await complete({
      ...saleBody(tileId, boxId, '2'),
      payments: [
        { methodId: cashId, amount: '100', tendered: '120' },
        { methodId: cardId, amount: '100', reference: 'CARD-P10' },
      ],
    });
    expect(result.body).toMatchObject({ total: '400', paid: '200', due: '200', change: '20' });
    expect(await db.salePayment.count({ where: { companyId, saleId: result.body.id } })).toBe(2);
    const ledger = await db.customerLedgerEntry.aggregate({
      where: { companyId, customerId },
      _sum: { amount: true },
    });
    expect(ledger._sum.amount?.toFixed(4)).toBe('200.0000');
    splitSaleId = result.body.id;
  });

  it('posts idempotent allocated collections and rejects concurrent over-allocation', async () => {
    const saleId = splitSaleId;
    const collectionKey = key();
    const body = {
      customerId,
      methodId: mfsId,
      amount: '100',
      reference: 'MFS-COLLECTION',
      allocations: [{ saleId, amount: '100' }],
    };
    const [first, retry] = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post('/sales/collections')
          .set(auth(ownerToken))
          .set('Idempotency-Key', collectionKey)
          .send(body),
      ),
    );
    expect([first.status, retry.status]).toEqual([201, 201]);
    expect(first.body.id).toBe(retry.body.id);
    const races = await Promise.all(
      [key(), key()].map((idempotency) =>
        request(app.getHttpServer())
          .post('/sales/collections')
          .set(auth(ownerToken))
          .set('Idempotency-Key', idempotency)
          .send({ ...body, amount: '80', allocations: [{ saleId, amount: '80' }] }),
      ),
    );
    expect(races.map((row) => row.status).sort()).toEqual([201, 409]);
    const detail = await request(app.getHttpServer())
      .get(`/sales/${saleId}`)
      .set(auth(ownerToken))
      .expect(200);
    expect(detail.body.currentOutstanding).toBe('20.0000');

    const beforeAdvance = await db.customerLedgerEntry.aggregate({
      where: { companyId, customerId },
      _sum: { amount: true },
    });
    const advanceKey = key();
    const advanceBody = {
      customerId,
      methodId: mfsId,
      amount: '50',
      reference: 'UNAPPLIED-ADVANCE',
      allocations: [],
    };
    const advance = await request(app.getHttpServer())
      .post('/sales/collections')
      .set(auth(ownerToken))
      .set('Idempotency-Key', advanceKey)
      .send(advanceBody)
      .expect(201);
    expect(advance.body).toMatchObject({ allocated: '0.0000', unapplied: '50.0000' });
    const advanceRetry = await request(app.getHttpServer())
      .post('/sales/collections')
      .set(auth(ownerToken))
      .set('Idempotency-Key', advanceKey)
      .send(advanceBody)
      .expect(201);
    expect(advanceRetry.body.id).toBe(advance.body.id);
    const afterAdvance = await db.customerLedgerEntry.aggregate({
      where: { companyId, customerId },
      _sum: { amount: true },
    });
    expect(beforeAdvance._sum.amount?.minus(afterAdvance._sum.amount ?? 0).toFixed(4)).toBe(
      '50.0000',
    );
  });

  it('returns one original BOX to the exact batch and enforces quantity/refund limits', async () => {
    const sale = await complete({
      ...saleBody(tileId, boxId, '2'),
      payments: [{ methodId: cardId, amount: '400' }],
    });
    const itemId = sale.body.items[0].id as string;
    const before = await db.inventoryBalance.findFirstOrThrow({
      where: { companyId, warehouseId, productId: tileId, batchId: tileBatchId },
    });
    const returnKey = key();
    const payload = {
      saleId: sale.body.id,
      reason: 'Customer returned one sealed box',
      items: [{ saleItemId: itemId, quantity: '1', disposition: 'RESTOCK' }],
    };
    const returned = await request(app.getHttpServer())
      .post('/sales/returns')
      .set(auth(ownerToken))
      .set('Idempotency-Key', returnKey)
      .send(payload)
      .expect(201);
    expect(returned.body).toMatchObject({ totalCredit: '200', receivableApplied: '0' });
    const retry = await request(app.getHttpServer())
      .post('/sales/returns')
      .set(auth(ownerToken))
      .set('Idempotency-Key', returnKey)
      .send(payload)
      .expect(201);
    expect(retry.body.id).toBe(returned.body.id);
    const after = await db.inventoryBalance.findFirstOrThrow({
      where: { companyId, warehouseId, productId: tileId, batchId: tileBatchId },
    });
    expect(after.baseQuantity.minus(before.baseQuantity).toFixed()).toBe('4');
    await request(app.getHttpServer())
      .post('/sales/returns')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({ ...payload, items: [{ ...payload.items[0], quantity: '2' }] })
      .expect(409);
    const refundKey = key();
    const refundBody = {
      returnId: returned.body.id,
      methodId: cashId,
      registerId,
      amount: '50',
      reason: 'Partial cash refund',
    };
    const refund = await request(app.getHttpServer())
      .post('/sales/refunds')
      .set(auth(ownerToken))
      .set('Idempotency-Key', refundKey)
      .send(refundBody)
      .expect(201);
    expect(refund.body.payment.direction).toBe('OUTBOUND');
    const refundRetry = await request(app.getHttpServer())
      .post('/sales/refunds')
      .set(auth(ownerToken))
      .set('Idempotency-Key', refundKey)
      .send(refundBody)
      .expect(201);
    expect(refundRetry.body.refund.id).toBe(refund.body.refund.id);
    await request(app.getHttpServer())
      .post('/sales/refunds')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({ returnId: returned.body.id, methodId: cashId, amount: '151', reason: 'Over refund' })
      .expect(409);
    await expect(
      db.saleReturn.update({ where: { id: returned.body.id }, data: { reason: 'rewrite' } }),
    ).rejects.toThrow(/immutable/i);
  });

  it('reduces receivable before refund and creates no fake refund for an unpaid return', async () => {
    const sale = await complete(saleBody(basinId, pcsId, '4'));
    const returned = await request(app.getHttpServer())
      .post('/sales/returns')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        saleId: sale.body.id,
        reason: 'One basin returned from fully due sale',
        items: [{ saleItemId: sale.body.items[0].id, quantity: '1', disposition: 'RESTOCK' }],
      })
      .expect(201);
    expect(returned.body).toMatchObject({ totalCredit: '1000', receivableApplied: '1000' });
    expect(await db.saleRefund.count({ where: { companyId, returnId: returned.body.id } })).toBe(0);
    const detail = await request(app.getHttpServer())
      .get(`/sales/${sale.body.id}`)
      .set(auth(ownerToken))
      .expect(200);
    expect(detail.body.currentOutstanding).toBe('3000.0000');
    expect(detail.body.lifecycleStatus).toBe('PARTIALLY_RETURNED');
  });

  it('reverses historical invoice discount/tax proportionally and serializes returns/refunds', async () => {
    const partial = await complete({
      ...saleBody(basinId, pcsId, '4'),
      invoiceDiscount: '200',
      invoiceTax: '100',
      payments: [{ methodId: cardId, amount: '2500' }],
    });
    expect(partial.body).toMatchObject({ total: '3900', paid: '2500', due: '1400' });
    const returned = await request(app.getHttpServer())
      .post('/sales/returns')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        saleId: partial.body.id,
        reason: 'Partial paid return with original discount and tax',
        items: [{ saleItemId: partial.body.items[0].id, quantity: '2', disposition: 'RESTOCK' }],
      })
      .expect(201);
    expect(returned.body).toMatchObject({ totalCredit: '1950', receivableApplied: '1400' });
    const refundRaces = await Promise.all(
      [key(), key()].map((idempotency) =>
        request(app.getHttpServer())
          .post('/sales/refunds')
          .set(auth(ownerToken))
          .set('Idempotency-Key', idempotency)
          .send({
            returnId: returned.body.id,
            methodId: cashId,
            registerId,
            amount: '400',
            reason: 'Concurrent refund capacity test',
          }),
      ),
    );
    expect(refundRaces.map((row) => row.status).sort()).toEqual([201, 409]);

    const raceSale = await complete({
      ...saleBody(tileId, boxId, '2'),
      payments: [{ methodId: cardId, amount: '400' }],
    });
    const returnRaces = await Promise.all(
      [key(), key()].map((idempotency) =>
        request(app.getHttpServer())
          .post('/sales/returns')
          .set(auth(ownerToken))
          .set('Idempotency-Key', idempotency)
          .send({
            saleId: raceSale.body.id,
            reason: 'Concurrent full return test',
            items: [
              { saleItemId: raceSale.body.items[0].id, quantity: '2', disposition: 'RESTOCK' },
            ],
          }),
      ),
    );
    expect(returnRaces.map((row) => row.status).sort()).toEqual([201, 409]);
  });

  it('posts an atomic exchange with original credit and a paid price difference', async () => {
    const original = await complete({
      ...saleBody(tileId, boxId, '1'),
      payments: [{ methodId: cashId, amount: '200' }],
    });
    const result = await request(app.getHttpServer())
      .post('/sales/exchanges')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        reason: 'Customer upgraded tile to basin',
        saleReturn: {
          saleId: original.body.id,
          reason: 'Exchange return',
          items: [{ saleItemId: original.body.items[0].id, quantity: '1', disposition: 'RESTOCK' }],
        },
        replacementSale: {
          ...saleBody(basinId, pcsId, '1'),
          payments: [{ methodId: cashId, amount: '800' }],
        },
      })
      .expect(201);
    expect(result.body.exchange).toMatchObject({ creditApplied: '200', difference: '800' });
    expect(result.body.replacementSale).toMatchObject({ total: '1000', paid: '1000', due: '0' });
    const originalDetail = await request(app.getHttpServer())
      .get(`/sales/${original.body.id}`)
      .set(auth(ownerToken))
      .expect(200);
    expect(originalDetail.body.lifecycleStatus).toBe('EXCHANGED');
  });

  it('requires and atomically records a full walk-in refund', async () => {
    const walkIn = await db.customer.findFirstOrThrow({
      where: { companyId, isWalkIn: true },
    });
    const sale = await complete({
      ...saleBody(basinId, pcsId, '1', walkIn.id),
      payments: [{ methodId: cardId, amount: '1000' }],
    });
    const body = {
      saleId: sale.body.id,
      reason: 'Walk-in customer returned the basin',
      items: [{ saleItemId: sale.body.items[0].id, quantity: '1', disposition: 'RESTOCK' }],
    };
    await request(app.getHttpServer())
      .post('/sales/returns')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send(body)
      .expect(400);
    const returned = await request(app.getHttpServer())
      .post('/sales/returns')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({ ...body, refunds: [{ methodId: cardId, amount: '1000' }] })
      .expect(201);
    expect(returned.body).toMatchObject({ totalCredit: '1000', receivableApplied: '0' });
    expect(await db.saleRefund.count({ where: { companyId, returnId: returned.body.id } })).toBe(1);
    expect(
      await db.customerLedgerEntry.count({
        where: { companyId, customerId: walkIn.id, referenceId: returned.body.id },
      }),
    ).toBe(0);
  });

  it('supports controlled full reversal and enforces Phase 10 permissions', async () => {
    const sale = await complete({
      ...saleBody(basinId, pcsId, '1'),
      payments: [{ methodId: cardId, amount: '1000' }],
    });
    await request(app.getHttpServer())
      .post(`/sales/${sale.body.id}/void`)
      .set(auth(limitedToken))
      .set('Idempotency-Key', key())
      .send({ reason: 'Unauthorized reversal' })
      .expect(403);
    const reversed = await request(app.getHttpServer())
      .post(`/sales/${sale.body.id}/void`)
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({ reason: 'Manager-approved completed-sale reversal' })
      .expect(201);
    expect(reversed.body.kind).toBe('VOID');
    const detail = await request(app.getHttpServer())
      .get(`/sales/${sale.body.id}`)
      .set(auth(ownerToken))
      .expect(200);
    expect(detail.body.lifecycleStatus).toBe('VOIDED');

    const foreignCompany = await db.company.create({
      data: { code: `X${suffix}`.toUpperCase(), name: 'Foreign Phase 10 Company' },
    });
    const foreignCustomer = await db.customer.create({
      data: {
        companyId: foreignCompany.id,
        code: 'FOREIGN',
        name: 'Foreign Customer',
      },
    });
    await request(app.getHttpServer())
      .post('/sales/collections')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        customerId: foreignCustomer.id,
        methodId: cashId,
        amount: '1',
        allocations: [],
      })
      .expect(400);
    await db.customer.deleteMany({ where: { companyId: foreignCompany.id } });
    await db.company.delete({ where: { id: foreignCompany.id } });

    const auditedActions = await db.auditLog.findMany({
      where: {
        companyId,
        action: {
          in: [
            'customer.collection.posted',
            'sale.return.posted',
            'sale.refund.posted',
            'sale.exchange.posted',
            'sale.voided',
          ],
        },
      },
      select: { action: true },
    });
    expect(new Set(auditedActions.map((row) => row.action))).toEqual(
      new Set([
        'customer.collection.posted',
        'sale.return.posted',
        'sale.refund.posted',
        'sale.exchange.posted',
        'sale.voided',
      ]),
    );
  });
});
