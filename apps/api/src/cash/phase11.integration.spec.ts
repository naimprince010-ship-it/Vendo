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
const PASSWORD = 'Phase11Password123';

describe('Phase 11 cash shifts and expenses API', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let companyId = '';
  let branchId = '';
  let registerId = '';
  let warehouseId = '';
  let customerId = '';
  let supplierId = '';
  let productId = '';
  let unitId = '';
  let cashId = '';
  let cardId = '';
  let ownerToken = '';
  let limitedToken = '';
  let shiftId = '';
  let returnId = '';
  let cashExpenseId = '';
  const suffix = randomUUID().slice(0, 8);
  const companyCode = `P11${suffix}`.toUpperCase();
  const key = () => `phase11-${randomUUID()}`;
  const auth = (token: string) => ({ authorization: `Bearer ${token}`, 'x-branch-id': branchId });

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
      data: { code: companyCode, name: 'Phase 11 Company' },
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
          firstName: 'Limited',
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
          .filter(({ key: permission }) => permission === 'cash.view_shift')
          .map(({ id }) => ({ companyId, roleId: limitedRole.id, permissionId: id })),
      }),
    ]);
    const [register, warehouse, customer, supplier, unit, cash, card] = await db.$transaction([
      db.register.create({ data: { companyId, branchId, code: 'POS-1', name: 'Counter 1' } }),
      db.warehouse.create({ data: { companyId, branchId, code: 'WH', name: 'Warehouse' } }),
      db.customer.create({
        data: { companyId, code: 'CREDIT', name: 'Credit Customer', creditLimit: '1000' },
      }),
      db.supplier.create({ data: { companyId, code: 'SUP', name: 'Supplier' } }),
      db.unit.create({ data: { companyId, code: 'PCS', name: 'Pieces', decimalScale: 0 } }),
      db.paymentMethod.create({ data: { companyId, code: 'CASH', name: 'Cash', isCash: true } }),
      db.paymentMethod.create({ data: { companyId, code: 'CARD', name: 'Card' } }),
    ]);
    registerId = register.id;
    warehouseId = warehouse.id;
    customerId = customer.id;
    supplierId = supplier.id;
    unitId = unit.id;
    cashId = cash.id;
    cardId = card.id;
    const product = await db.product.create({
      data: {
        companyId,
        sku: 'ITEM-P11',
        name: 'Cash Test Item',
        type: 'GENERAL',
        baseUnitId: unitId,
        standardCost: '20',
      },
    });
    productId = product.id;
    await db.$transaction([
      db.productPrice.create({
        data: { companyId, productId, unitId, type: 'RETAIL', amount: '100' },
      }),
      db.inventoryBalance.create({
        data: { companyId, branchId, warehouseId, productId, baseQuantity: '20' },
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
        ['CashMovement', 'CashMovement_immutable'],
        ['CashShift', 'CashShift_guard'],
        ['Expense', 'Expense_guard'],
        ['Payment', 'Payment_completed_immutable'],
        ['SalePayment', 'SalePayment_immutable'],
        ['SaleReturn', 'SaleReturn_immutable'],
        ['SaleReturnItem', 'SaleReturnItem_immutable'],
        ['SaleRefund', 'SaleRefund_immutable'],
        ['Sale', 'Sale_completed_immutable'],
        ['SaleItem', 'SaleItem_completed_immutable'],
        ['InventoryMovement', 'InventoryMovement_immutable_delete'],
        ['CustomerLedgerEntry', 'CustomerLedgerEntry_immutable_delete'],
        ['SupplierLedgerEntry', 'SupplierLedgerEntry_immutable_delete'],
      ];
      for (const [table, trigger] of triggers)
        await db.$executeRawUnsafe(`ALTER TABLE "${table}" DISABLE TRIGGER "${trigger}"`);
      await db.cashMovement.deleteMany({ where: { companyId } });
      await db.cashOperation.deleteMany({ where: { companyId } });
      await db.expense.deleteMany({ where: { companyId } });
      await db.expenseCategory.deleteMany({ where: { companyId } });
      await db.cashShift.deleteMany({ where: { companyId } });
      await db.cashDocumentSequence.deleteMany({ where: { companyId } });
      await db.saleRefund.deleteMany({ where: { companyId } });
      await db.saleReturnItem.deleteMany({ where: { companyId } });
      await db.saleReturn.deleteMany({ where: { companyId } });
      await db.salePayment.deleteMany({ where: { companyId } });
      await db.purchasePayment.deleteMany({ where: { companyId } });
      await db.payment.deleteMany({ where: { companyId } });
      await db.customerLedgerEntry.deleteMany({ where: { companyId } });
      await db.supplierLedgerEntry.deleteMany({ where: { companyId } });
      await db.inventoryMovement.deleteMany({ where: { companyId } });
      await db.salesOperation.deleteMany({ where: { companyId } });
      await db.purchaseOperation.deleteMany({ where: { companyId } });
      await db.saleItem.deleteMany({ where: { companyId } });
      await db.sale.deleteMany({ where: { companyId } });
      await db.salesDocumentSequence.deleteMany({ where: { companyId } });
      await db.purchaseDocumentSequence.deleteMany({ where: { companyId } });
      await db.auditLog.deleteMany({ where: { companyId } });
      await db.authSession.deleteMany({ where: { companyId } });
      await db.inventoryBalance.deleteMany({ where: { companyId } });
      await db.productPrice.deleteMany({ where: { companyId } });
      await db.product.deleteMany({ where: { companyId } });
      await db.paymentMethod.deleteMany({ where: { companyId } });
      await db.expenseCategory.deleteMany({ where: { companyId } });
      await db.supplier.deleteMany({ where: { companyId } });
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

  it('opens exactly one shift per register with idempotency, tenant scope, and permissions', async () => {
    const attempts = await Promise.all(
      [key(), key()].map((idempotency) =>
        request(app.getHttpServer())
          .post('/cash/shifts/open')
          .set(auth(ownerToken))
          .set('Idempotency-Key', idempotency)
          .send({ registerId, openingCash: '500' }),
      ),
    );
    expect(attempts.map((row) => row.status).sort()).toEqual([201, 409]);
    const success = attempts.find((row) => row.status === 201)!;
    shiftId = success.body.id;
    expect(success.body).toMatchObject({ openingCash: '500.0000', expectedCash: '500.0000' });
    expect(await db.cashShift.count({ where: { companyId, registerId, status: 'OPEN' } })).toBe(1);
    expect(await db.cashMovement.count({ where: { companyId, shiftId, type: 'OPENING' } })).toBe(1);
    await request(app.getHttpServer())
      .post('/cash/movements/in')
      .set(auth(limitedToken))
      .set('Idempotency-Key', key())
      .send({ registerId, amount: '1', reason: 'Forbidden float' })
      .expect(403);
    const foreign = await db.company.create({ data: { code: `X${companyCode}`, name: 'Foreign' } });
    const foreignBranch = await db.branch.create({
      data: { companyId: foreign.id, code: 'X', name: 'Foreign' },
    });
    const foreignRegister = await db.register.create({
      data: { companyId: foreign.id, branchId: foreignBranch.id, code: 'X', name: 'Foreign' },
    });
    await request(app.getHttpServer())
      .post('/cash/shifts/open')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({ registerId: foreignRegister.id, openingCash: '1' })
      .expect(400);
    await db.register.delete({ where: { id: foreignRegister.id } });
    await db.branch.delete({ where: { id: foreignBranch.id } });
    await db.customer.deleteMany({ where: { companyId: foreign.id } });
    await db.company.delete({ where: { id: foreign.id } });
  });

  it('posts immutable manual movements and cash/non-cash expenses without double counting', async () => {
    const cashInKey = key();
    const cashInBody = { registerId, amount: '50.1234', reason: 'Owner float added' };
    const first = await request(app.getHttpServer())
      .post('/cash/movements/in')
      .set(auth(ownerToken))
      .set('Idempotency-Key', cashInKey)
      .send(cashInBody)
      .expect(201);
    const retry = await request(app.getHttpServer())
      .post('/cash/movements/in')
      .set(auth(ownerToken))
      .set('Idempotency-Key', cashInKey)
      .send(cashInBody)
      .expect(201);
    expect(retry.body.id).toBe(first.body.id);
    await request(app.getHttpServer())
      .post('/cash/movements/out')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({ registerId, amount: '10', reason: 'Bank deposit pickup' })
      .expect(201);
    const category = await request(app.getHttpServer())
      .post('/expense-categories')
      .set(auth(ownerToken))
      .send({ code: 'DELIVERY', name: 'Delivery' })
      .expect(201);
    cashExpenseId = (
      await request(app.getHttpServer())
        .post('/expenses')
        .set(auth(ownerToken))
        .set('Idempotency-Key', key())
        .send({
          categoryId: category.body.id,
          paymentMethodId: cashId,
          registerId,
          amount: '20',
          description: 'Local delivery charge',
        })
        .expect(201)
    ).body.id;
    await request(app.getHttpServer())
      .post('/expenses')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        categoryId: category.body.id,
        paymentMethodId: cardId,
        amount: '5',
        description: 'Online office subscription',
      })
      .expect(201);
    expect(await db.cashMovement.count({ where: { companyId, type: 'EXPENSE' } })).toBe(1);
    await expect(
      db.cashMovement.update({ where: { id: first.body.id }, data: { amount: '999' } }),
    ).rejects.toThrow(/immutable/i);
    await request(app.getHttpServer())
      .post(`/expenses/${cashExpenseId}/reverse`)
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({ registerId, reason: 'Duplicate supplier charge' })
      .expect(201);
    const reversed = await db.expense.findUniqueOrThrow({ where: { id: cashExpenseId } });
    expect(reversed.status).toBe('REVERSED');
  });

  it('maps each eligible business cash event exactly once and ignores non-cash portions', async () => {
    const sale = await request(app.getHttpServer())
      .post('/sales/complete')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        warehouseId,
        registerId,
        customerId,
        pricingMode: 'RETAIL',
        items: [{ productId, unitId, quantity: '1' }],
        payments: [
          { methodId: cashId, amount: '40', tendered: '50' },
          { methodId: cardId, amount: '30' },
        ],
      })
      .expect(201);
    expect(sale.body).toMatchObject({ total: '100', paid: '70', due: '30', change: '10' });
    await request(app.getHttpServer())
      .post('/sales/collections')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        customerId,
        methodId: cashId,
        registerId,
        amount: '10',
        allocations: [{ saleId: sale.body.id, amount: '10' }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/sales/collections')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        customerId,
        methodId: cardId,
        amount: '10',
        allocations: [{ saleId: sale.body.id, amount: '10' }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/purchases/payments')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        supplierId,
        methodId: cashId,
        registerId,
        amount: '20',
        paidAt: new Date().toISOString(),
        allocations: [],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/purchases/payments')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        supplierId,
        methodId: cardId,
        amount: '20',
        paidAt: new Date().toISOString(),
        allocations: [],
      })
      .expect(201);
    const paidSale = await request(app.getHttpServer())
      .post('/sales/complete')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        warehouseId,
        registerId,
        customerId,
        pricingMode: 'RETAIL',
        items: [{ productId, unitId, quantity: '1' }],
        payments: [{ methodId: cardId, amount: '100' }],
      })
      .expect(201);
    const returned = await request(app.getHttpServer())
      .post('/sales/returns')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        saleId: paidSale.body.id,
        reason: 'Unused item returned',
        items: [{ saleItemId: paidSale.body.items[0].id, quantity: '1', disposition: 'RESTOCK' }],
      })
      .expect(201);
    returnId = returned.body.id;
    await request(app.getHttpServer())
      .post('/sales/refunds')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        returnId,
        methodId: cashId,
        registerId,
        amount: '100',
        reason: 'Cash refund approved',
      })
      .expect(201);
    const types = await db.cashMovement.groupBy({
      by: ['type'],
      where: { companyId, shiftId },
      _count: true,
      _sum: { amount: true },
    });
    const map = Object.fromEntries(
      types.map((row) => [row.type, { count: row._count, amount: row._sum.amount?.toFixed(4) }]),
    );
    expect(map.CASH_SALE).toEqual({ count: 1, amount: '40.0000' });
    expect(map.CUSTOMER_COLLECTION).toEqual({ count: 1, amount: '10.0000' });
    expect(map.SUPPLIER_PAYMENT).toEqual({ count: 1, amount: '20.0000' });
    expect(map.CASH_REFUND).toEqual({ count: 1, amount: '100.0000' });
  });

  it('derives expected cash, closes safely against concurrent posting, and rejects late movements', async () => {
    const before = await request(app.getHttpServer())
      .get(`/cash/shifts/${shiftId}`)
      .set(auth(ownerToken))
      .expect(200);
    expect(before.body.expectedCash).toBe('470.1234');
    const [close, incoming] = await Promise.all([
      request(app.getHttpServer())
        .post(`/cash/shifts/${shiftId}/close`)
        .set(auth(ownerToken))
        .set('Idempotency-Key', key())
        .send({ actualCash: '470.1234', note: 'Counted at close' }),
      request(app.getHttpServer())
        .post('/cash/movements/in')
        .set(auth(ownerToken))
        .set('Idempotency-Key', key())
        .send({ registerId, amount: '1', reason: 'Concurrent late float' }),
    ]);
    expect(close.status).toBe(201);
    expect([201, 409]).toContain(incoming.status);
    const summary = await request(app.getHttpServer())
      .get(`/cash/shifts/${shiftId}`)
      .set(auth(ownerToken))
      .expect(200);
    const expectedFromRows = await db.$queryRaw<Array<{ total: string }>>`
      SELECT COALESCE(SUM(CASE WHEN "type" IN ('OPENING','CASH_SALE','CUSTOMER_COLLECTION','CASH_IN') THEN "amount" ELSE -"amount" END), 0)::text total
      FROM "CashMovement" WHERE "companyId" = ${companyId}::uuid AND "shiftId" = ${shiftId}::uuid
    `;
    expect(summary.body.status).toBe('CLOSED');
    expect(summary.body.expectedCash).toBe(Number(expectedFromRows[0].total).toFixed(4));
    expect(summary.body.variance).toBe((470.1234 - Number(summary.body.expectedCash)).toFixed(4));
    await request(app.getHttpServer())
      .post('/cash/movements/out')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({ registerId, amount: '1', reason: 'After close attempt' })
      .expect(409);
    const walkIn = await db.customer.findFirstOrThrow({ where: { companyId, isWalkIn: true } });
    await request(app.getHttpServer())
      .post('/sales/complete')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        warehouseId,
        registerId,
        customerId: walkIn.id,
        pricingMode: 'RETAIL',
        items: [{ productId, unitId, quantity: '1' }],
        payments: [{ methodId: cashId, amount: '100' }],
      })
      .expect(409);
    await request(app.getHttpServer())
      .post('/sales/complete')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        warehouseId,
        registerId,
        customerId: walkIn.id,
        pricingMode: 'RETAIL',
        items: [{ productId, unitId, quantity: '1' }],
        payments: [{ methodId: cardId, amount: '100' }],
      })
      .expect(201);
    await expect(
      db.cashShift.update({ where: { id: shiftId }, data: { actualCash: '0' } }),
    ).rejects.toThrow(/immutable/i);
    const audit = await db.auditLog.findMany({
      where: {
        companyId,
        action: {
          in: [
            'cash.shift.opened',
            'cash.cash_in',
            'cash.cash_out',
            'expense.posted',
            'expense.reversed',
            'cash.shift.closed',
          ],
        },
      },
    });
    expect(new Set(audit.map((row) => row.action))).toEqual(
      new Set([
        'cash.shift.opened',
        'cash.cash_in',
        'cash.cash_out',
        'expense.posted',
        'expense.reversed',
        'cash.shift.closed',
      ]),
    );
  });
});
