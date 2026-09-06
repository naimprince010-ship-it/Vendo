import { randomUUID } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PasswordService } from '../auth/password.service';
import { PERMISSION_CATALOG } from '../authorization/permission-catalog';
import { DatabaseService } from '../database/database.service';

jest.setTimeout(90_000);
const PASSWORD = 'Phase8Password123';

describe('Phase 8 purchasing API', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let companyId = '';
  let branchId = '';
  let warehouseId = '';
  let supplierId = '';
  let tileId = '';
  let pcsId = '';
  let boxId = '';
  let methodId = '';
  let ownerToken = '';
  let limitedToken = '';
  let orderId = '';
  let orderItemId = '';
  let receiptId = '';
  let receiptItemId = '';
  let invoiceId = '';
  let invoiceItemId = '';
  const suffix = randomUUID().slice(0, 8);
  const companyCode = `P8${suffix}`.toUpperCase();
  const key = () => `phase8-${randomUUID()}`;
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
      data: { code: companyCode, name: 'Phase 8 Company' },
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
          firstName: 'Viewer',
        },
      }),
      db.role.create({ data: { companyId, key: `owner-${suffix}`, name: 'Owner' } }),
      db.role.create({ data: { companyId, key: `viewer-${suffix}`, name: 'Viewer' } }),
    ]);
    const permissions = await db.permission.findMany({ select: { id: true, key: true } });
    const branch = await db.branch.create({
      data: { companyId, code: 'MAIN', name: 'Main Branch' },
    });
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
          .filter(({ key: p }) => p === 'purchase.view')
          .map(({ id }) => ({ companyId, roleId: limitedRole.id, permissionId: id })),
      }),
    ]);
    const [warehouse, supplier, pcs, box, method] = await db.$transaction([
      db.warehouse.create({
        data: { companyId, branchId, code: 'WH', name: 'Receiving Warehouse' },
      }),
      db.supplier.create({ data: { companyId, code: 'SUP-001', name: 'Tile Supplier' } }),
      db.unit.create({ data: { companyId, code: 'PCS', name: 'Pieces', decimalScale: 0 } }),
      db.unit.create({ data: { companyId, code: 'BOX', name: 'Boxes', decimalScale: 0 } }),
      db.paymentMethod.create({ data: { companyId, code: 'BANK', name: 'Bank' } }),
    ]);
    warehouseId = warehouse.id;
    supplierId = supplier.id;
    pcsId = pcs.id;
    boxId = box.id;
    methodId = method.id;
    const tile = await db.product.create({
      data: {
        companyId,
        sku: 'TILE-P8',
        name: '24x24 Shade Tile',
        type: 'TILE',
        baseUnitId: pcsId,
        batchTracking: true,
      },
    });
    tileId = tile.id;
    await db.unitConversion.create({
      data: { companyId, productId: tileId, fromUnitId: boxId, factorToBase: '4' },
    });
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
        ['SupplierLedgerEntry', 'SupplierLedgerEntry_immutable_delete'],
        ['InventoryMovement', 'InventoryMovement_immutable_delete'],
        ['GoodsReceipt', 'GoodsReceipt_posted_immutable'],
        ['GoodsReceiptItem', 'GoodsReceiptItem_posted_immutable'],
        ['PurchaseInvoice', 'PurchaseInvoice_posted_immutable'],
        ['PurchaseInvoiceItem', 'PurchaseInvoiceItem_posted_immutable'],
        ['PurchaseReturn', 'PurchaseReturn_immutable'],
        ['PurchaseReturnItem', 'PurchaseReturnItem_immutable'],
      ];
      for (const [table, trigger] of triggers)
        await db.$executeRawUnsafe(`ALTER TABLE "${table}" DISABLE TRIGGER "${trigger}"`);
      await db.purchaseReturnItem.deleteMany({ where: { companyId } });
      await db.purchaseReturn.deleteMany({ where: { companyId } });
      await db.purchasePayment.deleteMany({ where: { companyId } });
      await db.supplierLedgerEntry.deleteMany({ where: { companyId } });
      await db.payment.deleteMany({ where: { companyId } });
      await db.purchaseInvoiceItem.deleteMany({ where: { companyId } });
      await db.purchaseInvoice.deleteMany({ where: { companyId } });
      await db.inventoryMovement.deleteMany({ where: { companyId } });
      await db.inventoryBalance.deleteMany({ where: { companyId } });
      await db.goodsReceiptItem.deleteMany({ where: { companyId } });
      await db.goodsReceipt.deleteMany({ where: { companyId } });
      await db.purchaseOrderItem.deleteMany({ where: { companyId } });
      await db.purchaseOrder.deleteMany({ where: { companyId } });
      await db.purchaseOperation.deleteMany({ where: { companyId } });
      await db.purchaseDocumentSequence.deleteMany({ where: { companyId } });
      await db.auditLog.deleteMany({ where: { companyId } });
      await db.authSession.deleteMany({ where: { companyId } });
      await db.productBatch.deleteMany({ where: { companyId } });
      await db.unitConversion.deleteMany({ where: { companyId } });
      await db.product.deleteMany({ where: { companyId } });
      await db.paymentMethod.deleteMany({ where: { companyId } });
      await db.supplier.deleteMany({ where: { companyId } });
      await db.userBranch.deleteMany({ where: { companyId } });
      await db.userRole.deleteMany({ where: { companyId } });
      await db.rolePermission.deleteMany({ where: { companyId } });
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

  it('creates, edits, submits, and confirms a PO without stock or payable effects', async () => {
    const body = {
      supplierId,
      warehouseId,
      orderDate: '2026-09-06',
      expectedAt: '2026-09-10',
      discount: '5',
      tax: '2',
      freight: '20',
      notes: 'Shade A order',
      items: [
        {
          productId: tileId,
          unitId: boxId,
          quantity: '10',
          unitCost: '100',
          discount: '10',
          tax: '5',
        },
      ],
    };
    const created = await request(app.getHttpServer())
      .post('/purchases/orders')
      .set(auth(ownerToken))
      .send(body)
      .expect(201);
    orderId = created.body.id;
    orderItemId = created.body.items[0].id;
    expect(created.body.orderNumber).toMatch(/^PO-\d{6}$/);
    expect(created.body.total).toBe('1012');
    const updated = await request(app.getHttpServer())
      .put(`/purchases/orders/${orderId}`)
      .set(auth(ownerToken))
      .send({ ...body, notes: 'Confirmed shade A order' })
      .expect(200);
    orderItemId = updated.body.items[0].id;
    await request(app.getHttpServer())
      .post(`/purchases/orders/${orderId}/submit`)
      .set(auth(ownerToken))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/purchases/orders/${orderId}/confirm`)
      .set(auth(ownerToken))
      .expect(201);
    await request(app.getHttpServer())
      .post('/purchases/orders')
      .set(auth(limitedToken))
      .send(body)
      .expect(403);
    expect(await db.inventoryMovement.count({ where: { companyId } })).toBe(0);
    expect(await db.supplierLedgerEntry.count({ where: { companyId } })).toBe(0);
  });

  it('posts idempotent partial tile receipts and serializes the final concurrent receipt', async () => {
    const firstBody = {
      orderId,
      warehouseId,
      receivedAt: '2026-09-06T08:00:00.000Z',
      notes: 'First truck',
      items: [
        {
          orderItemId,
          unitId: boxId,
          quantity: '6',
          batchNumber: 'B-001',
          lotNumber: 'L-1',
          shade: 'A',
        },
      ],
    };
    const receiptKey = key();
    const first = await request(app.getHttpServer())
      .post('/purchases/receipts')
      .set(auth(ownerToken))
      .set('Idempotency-Key', receiptKey)
      .send(firstBody)
      .expect(201);
    const replay = await request(app.getHttpServer())
      .post('/purchases/receipts')
      .set(auth(ownerToken))
      .set('Idempotency-Key', receiptKey)
      .send(firstBody)
      .expect(201);
    expect(replay.body.id).toBe(first.body.id);
    receiptId = first.body.id;
    receiptItemId = first.body.items[0].item.id;
    expect(first.body.items[0].item.baseQuantity).toBe('24');
    const finalBody = {
      ...firstBody,
      receivedAt: '2026-09-06T09:00:00.000Z',
      items: [{ ...firstBody.items[0], quantity: '4' }],
    };
    const outcomes = await Promise.all(
      [key(), key()].map((idempotency) =>
        request(app.getHttpServer())
          .post('/purchases/receipts')
          .set(auth(ownerToken))
          .set('Idempotency-Key', idempotency)
          .send(finalBody),
      ),
    );
    expect(outcomes.map((x) => x.status).sort()).toEqual([201, 409]);
    const balance = await db.inventoryBalance.findFirstOrThrow({
      where: { companyId, warehouseId, productId: tileId },
    });
    expect(balance.baseQuantity.toFixed(6)).toBe('40.000000');
    expect(
      await db.productBatch.count({ where: { companyId, productId: tileId, shade: 'A' } }),
    ).toBe(1);
    const detail = await request(app.getHttpServer())
      .get(`/purchases/orders/${orderId}`)
      .set(auth(ownerToken))
      .expect(200);
    expect(detail.body.status).toBe('RECEIVED');
    expect(detail.body.items[0].remainingBaseQuantity).toBe('0.000000');
  });

  it('posts a Decimal supplier invoice and increases the immutable supplier payable', async () => {
    const draft = await request(app.getHttpServer())
      .post('/purchases/invoices')
      .set(auth(ownerToken))
      .send({
        supplierId,
        orderId,
        receiptId,
        supplierInvoiceNumber: `EXT-${suffix}`,
        invoiceDate: '2026-09-06',
        dueDate: '2026-09-30',
        freight: '0',
        additionalCost: '0',
        items: [
          {
            receiptItemId,
            productId: tileId,
            unitId: boxId,
            quantity: '6',
            unitCost: '100.1234',
            discount: '0.1234',
            tax: '0',
          },
        ],
      })
      .expect(201);
    invoiceId = draft.body.id;
    invoiceItemId = draft.body.items[0].id;
    expect(draft.body.total).toBe('600.617');
    const postKey = key();
    await request(app.getHttpServer())
      .post(`/purchases/invoices/${invoiceId}/post`)
      .set(auth(ownerToken))
      .set('Idempotency-Key', postKey)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/purchases/invoices/${invoiceId}/post`)
      .set(auth(ownerToken))
      .set('Idempotency-Key', postKey)
      .expect(201);
    const ledger = await db.supplierLedgerEntry.aggregate({
      where: { companyId, supplierId },
      _sum: { amount: true },
    });
    expect(ledger._sum.amount?.toFixed(4)).toBe('600.6170');
    await expect(
      db.purchaseInvoice.update({ where: { id: invoiceId }, data: { total: '1' } }),
    ).rejects.toThrow(/immutable/i);
  });

  it('allocates a partial payment, records unapplied advance, and rejects over-allocation', async () => {
    const payment = await request(app.getHttpServer())
      .post('/purchases/payments')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        supplierId,
        methodId,
        amount: '250.1111',
        paidAt: '2026-09-07T08:00:00.000Z',
        reference: 'BANK-1',
        allocations: [{ invoiceId, amount: '250.1111' }],
      })
      .expect(201);
    expect(payment.body.allocated).toBe('250.1111');
    await request(app.getHttpServer())
      .post('/purchases/payments')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        supplierId,
        methodId,
        amount: '50',
        paidAt: '2026-09-07T09:00:00.000Z',
        notes: 'Supplier advance',
        allocations: [],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/purchases/payments')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        supplierId,
        methodId,
        amount: '999',
        paidAt: '2026-09-07T10:00:00.000Z',
        allocations: [{ invoiceId, amount: '999' }],
      })
      .expect(409);
    const due = await request(app.getHttpServer())
      .get(`/purchases/suppliers/${supplierId}/due`)
      .set(auth(ownerToken))
      .expect(200);
    expect(due.body.balance).toBe('300.5059');
    expect(due.body.invoices[0].outstanding).toBe('350.5059');
  });

  it('returns the correct batch and creates a financial effect only for invoiced goods', async () => {
    const financial = await request(app.getHttpServer())
      .post('/purchases/returns')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        receiptId,
        invoiceId,
        returnedAt: '2026-09-08T08:00:00.000Z',
        reason: 'Damaged cartons',
        items: [{ receiptItemId, invoiceItemId, unitId: boxId, quantity: '1' }],
      })
      .expect(201);
    expect(financial.body.financialTotal).toBe('100.1028');
    const before = await db.supplierLedgerEntry.aggregate({
      where: { companyId, supplierId },
      _sum: { amount: true },
    });
    await request(app.getHttpServer())
      .post('/purchases/returns')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        receiptId,
        returnedAt: '2026-09-08T09:00:00.000Z',
        reason: 'Uninvoiced quality rejection',
        items: [{ receiptItemId, unitId: boxId, quantity: '1' }],
      })
      .expect(201);
    const after = await db.supplierLedgerEntry.aggregate({
      where: { companyId, supplierId },
      _sum: { amount: true },
    });
    expect(after._sum.amount?.toFixed(4)).toBe(before._sum.amount?.toFixed(4));
    const balance = await db.inventoryBalance.findFirstOrThrow({
      where: { companyId, warehouseId, productId: tileId },
    });
    expect(balance.baseQuantity.toFixed(6)).toBe('32.000000');
    expect(
      await db.inventoryMovement.count({ where: { companyId, type: 'PURCHASE_RETURN' } }),
    ).toBe(2);
    await request(app.getHttpServer())
      .post('/purchases/returns')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        receiptId,
        returnedAt: '2026-09-08T10:00:00.000Z',
        reason: 'Impossible over-return',
        items: [{ receiptItemId, unitId: boxId, quantity: '10' }],
      })
      .expect(409);
  });
});
