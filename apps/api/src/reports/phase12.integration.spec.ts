import { randomUUID } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PasswordService } from '../auth/password.service';
import { PERMISSIONS, PERMISSION_CATALOG } from '../authorization/permission-catalog';
import { DatabaseService } from '../database/database.service';

jest.setTimeout(180_000);
const PASSWORD = 'Phase12Password123';

describe('Phase 12 reports and historical documents', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let companyId = '';
  let branchId = '';
  let saleId = '';
  let ownerToken = '';
  let limitedToken = '';
  const suffix = randomUUID().slice(0, 8);
  const companyCode = `P12${suffix}`.toUpperCase();
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
      PERMISSION_CATALOG.map((key) =>
        db.permission.upsert({ where: { key }, update: {}, create: { key } }),
      ),
    );
    const company = await db.company.create({
      data: {
        code: companyCode,
        name: 'Phase 12 Company',
        timezone: 'Asia/Dhaka',
        currencyCode: 'BDT',
      },
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
    const branch = await db.branch.create({
      data: { companyId, code: 'MAIN', name: 'Main Branch' },
    });
    branchId = branch.id;
    await db.$transaction([
      db.userRole.create({ data: { companyId, userId: owner.id, roleId: ownerRole.id } }),
      db.userRole.create({ data: { companyId, userId: limited.id, roleId: limitedRole.id } }),
      db.userBranch.createMany({
        data: [
          { companyId, userId: owner.id, branchId },
          { companyId, userId: limited.id, branchId },
        ],
      }),
      db.rolePermission.createMany({
        data: permissions.map(({ id }) => ({ companyId, roleId: ownerRole.id, permissionId: id })),
      }),
      db.rolePermission.createMany({
        data: permissions
          .filter(({ key }) => key === PERMISSIONS.REPORT_VIEW_SALES)
          .map(({ id }) => ({ companyId, roleId: limitedRole.id, permissionId: id })),
      }),
    ]);
    const [warehouse, register, customer, supplier, piece, box, sqft, cash] = await db.$transaction(
      [
        db.warehouse.create({ data: { companyId, branchId, code: 'WH', name: 'Warehouse' } }),
        db.register.create({ data: { companyId, branchId, code: 'POS', name: 'Counter' } }),
        db.customer.create({ data: { companyId, code: 'C-1', name: 'Report Customer' } }),
        db.supplier.create({ data: { companyId, code: 'S-1', name: 'Report Supplier' } }),
        db.unit.create({ data: { companyId, code: 'PCS', name: 'Pieces' } }),
        db.unit.create({ data: { companyId, code: 'BOX', name: 'Box' } }),
        db.unit.create({ data: { companyId, code: 'SQFT', name: 'Square feet' } }),
        db.paymentMethod.create({ data: { companyId, code: 'CASH', name: 'Cash', isCash: true } }),
      ],
    );
    const product = await db.product.create({
      data: {
        companyId,
        categoryId: null,
        baseUnitId: piece.id,
        type: 'TILE',
        sku: 'TILE-REPORT',
        name: 'Historical Tile',
        standardCost: '50',
        reorderLevel: '12',
        batchTracking: false,
      },
    });
    await db.$transaction([
      db.productTileProfile.create({
        data: {
          companyId,
          productId: product.id,
          widthMm: '609.6',
          heightMm: '609.6',
          displaySize: '24 x 24 inch',
        },
      }),
      db.unitConversion.create({
        data: { companyId, productId: product.id, fromUnitId: box.id, factorToBase: '4' },
      }),
      db.unitConversion.create({
        data: { companyId, productId: product.id, fromUnitId: sqft.id, factorToBase: '0.25' },
      }),
      db.inventoryBalance.create({
        data: {
          companyId,
          branchId,
          warehouseId: warehouse.id,
          productId: product.id,
          baseQuantity: '9.8',
        },
      }),
    ]);
    const now = new Date();
    const sale = await db.sale.create({
      data: {
        companyId,
        branchId,
        warehouseId: warehouse.id,
        registerId: register.id,
        customerId: customer.id,
        createdById: owner.id,
        invoiceNumber: `INV-${suffix}`,
        status: 'COMPLETED',
        saleDate: now,
        completedAt: now,
        subtotal: '100',
        total: '100',
        paid: '80',
        due: '20',
      },
    });
    saleId = sale.id;
    const item = await db.saleItem.create({
      data: {
        companyId,
        saleId,
        productId: product.id,
        unitId: piece.id,
        productNameSnapshot: 'Historical Tile',
        skuSnapshot: 'TILE-REPORT',
        unitCodeSnapshot: 'PCS',
        tileSizeSnapshot: '24 x 24 inch',
        quantity: '1',
        baseQuantity: '1',
        conversionFactor: '1',
        configuredPrice: '100',
        unitPrice: '100',
        unitCost: '50',
        lineTotal: '100',
      },
    });
    const saleReturn = await db.saleReturn.create({
      data: {
        companyId,
        branchId,
        warehouseId: warehouse.id,
        saleId,
        customerId: customer.id,
        createdById: owner.id,
        returnNumber: `SR-${suffix}`,
        totalCredit: '20',
        receivableApplied: '20',
        reason: 'Report test',
        returnedAt: now,
      },
    });
    await db.$transaction([
      db.saleReturnItem.create({
        data: {
          companyId,
          returnId: saleReturn.id,
          saleItemId: item.id,
          productId: product.id,
          unitId: piece.id,
          quantity: '0.2',
          baseQuantity: '0.2',
          conversionFactor: '1',
          creditAmount: '20',
          disposition: 'RESTOCK',
        },
      }),
      db.customerLedgerEntry.create({
        data: {
          companyId,
          branchId,
          customerId: customer.id,
          createdById: owner.id,
          type: 'SALE_INVOICE',
          amount: '100',
          effectiveAt: now,
          description: 'Invoice',
          idempotencyKey: `p12-sale-${suffix}`,
          requestHash: 'a'.repeat(64),
        },
      }),
      db.customerLedgerEntry.create({
        data: {
          companyId,
          branchId,
          customerId: customer.id,
          createdById: owner.id,
          type: 'PAYMENT',
          amount: '-80',
          effectiveAt: now,
          description: 'Collection is not revenue',
          idempotencyKey: `p12-pay-${suffix}`,
          requestHash: 'b'.repeat(64),
        },
      }),
      db.customerLedgerEntry.create({
        data: {
          companyId,
          branchId,
          customerId: customer.id,
          createdById: owner.id,
          type: 'SALE_RETURN',
          amount: '-20',
          effectiveAt: now,
          description: 'Return',
          idempotencyKey: `p12-return-${suffix}`,
          requestHash: 'c'.repeat(64),
        },
      }),
      db.supplierLedgerEntry.create({
        data: {
          companyId,
          branchId,
          supplierId: supplier.id,
          createdById: owner.id,
          type: 'OPENING_BALANCE',
          amount: '75',
          effectiveAt: now,
          description: 'Opening payable',
          idempotencyKey: `p12-supplier-${suffix}`,
          requestHash: 'd'.repeat(64),
        },
      }),
      db.purchaseInvoice.create({
        data: {
          companyId,
          branchId,
          supplierId: supplier.id,
          createdById: owner.id,
          invoiceNumber: `PI-${suffix}`,
          status: 'POSTED',
          invoiceDate: now,
          subtotal: '50',
          total: '50',
        },
      }),
    ]);
    const category = await db.expenseCategory.create({
      data: { companyId, code: 'UTIL', name: `Utilities ${suffix}` },
    });
    await db.expense.create({
      data: {
        companyId,
        branchId,
        categoryId: category.id,
        paymentMethodId: cash.id,
        createdById: owner.id,
        expenseNumber: `EXP-${suffix}`,
        amount: '10',
        expenseDate: now,
        description: 'Electricity',
      },
    });
    await db.product.update({
      where: { id: product.id },
      data: { name: 'Renamed Tile', sku: 'RENAMED-TILE' },
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
        ['SaleReturnItem', 'SaleReturnItem_immutable'],
        ['SaleReturn', 'SaleReturn_immutable'],
        ['SaleItem', 'SaleItem_completed_immutable'],
        ['Sale', 'Sale_completed_immutable'],
        ['CustomerLedgerEntry', 'CustomerLedgerEntry_immutable_delete'],
        ['SupplierLedgerEntry', 'SupplierLedgerEntry_immutable_delete'],
        ['Expense', 'Expense_guard'],
        ['PurchaseInvoice', 'PurchaseInvoice_posted_immutable'],
      ];
      for (const [table, trigger] of triggers)
        await db.$executeRawUnsafe(`ALTER TABLE "${table}" DISABLE TRIGGER "${trigger}"`);
      try {
        await db.expense.deleteMany({ where: { companyId } });
        await db.expenseCategory.deleteMany({ where: { companyId } });
        await db.saleReturnItem.deleteMany({ where: { companyId } });
        await db.saleReturn.deleteMany({ where: { companyId } });
        await db.saleItem.deleteMany({ where: { companyId } });
        await db.sale.deleteMany({ where: { companyId } });
        await db.purchaseInvoice.deleteMany({ where: { companyId } });
        await db.customerLedgerEntry.deleteMany({ where: { companyId } });
        await db.supplierLedgerEntry.deleteMany({ where: { companyId } });
        await db.inventoryBalance.deleteMany({ where: { companyId } });
        await db.unitConversion.deleteMany({ where: { companyId } });
        await db.productTileProfile.deleteMany({ where: { companyId } });
        await db.product.deleteMany({ where: { companyId } });
        await db.paymentMethod.deleteMany({ where: { companyId } });
        await db.unit.deleteMany({ where: { companyId } });
        await db.customer.deleteMany({ where: { companyId } });
        await db.supplier.deleteMany({ where: { companyId } });
        await db.register.deleteMany({ where: { companyId } });
        await db.warehouse.deleteMany({ where: { companyId } });
        await db.authSession.deleteMany({ where: { companyId } });
        await db.auditLog.deleteMany({ where: { companyId } });
        await db.userBranch.deleteMany({ where: { companyId } });
        await db.userRole.deleteMany({ where: { companyId } });
        await db.rolePermission.deleteMany({ where: { companyId } });
        await db.role.deleteMany({ where: { companyId } });
        await db.user.deleteMany({ where: { companyId } });
        await db.branch.deleteMany({ where: { companyId } });
        await db.company.delete({ where: { id: companyId } });
      } finally {
        for (const [table, trigger] of triggers)
          await db.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE TRIGGER "${trigger}"`);
      }
    }
    await app?.close();
  });

  it('uses event-based sales math without counting collections as revenue', async () => {
    const response = await request(app.getHttpServer())
      .get('/reports/sales')
      .set(auth(ownerToken))
      .expect(200);
    expect(response.body.summary).toMatchObject({
      grossSales: '100.0000',
      returnCredits: '20.0000',
      netSales: '80.0000',
      grossProfit: '40.0000',
    });
    expect(response.body.definitions.collectionsAreRevenue).toBe(false);
  });

  it('reports authoritative inventory with derived tile equivalents and company ledgers', async () => {
    const inventory = await request(app.getHttpServer())
      .get('/reports/inventory')
      .set(auth(ownerToken))
      .expect(200);
    expect(inventory.body.items[0]).toMatchObject({ baseQuantity: '9.800000', lowStock: true });
    expect(inventory.body.items[0].equivalents).toEqual(
      expect.arrayContaining([
        { unit: 'BOX', quantity: '2.450000' },
        { unit: 'SQFT', quantity: '39.200000' },
      ]),
    );
    const customers = await request(app.getHttpServer())
      .get('/reports/customers')
      .set(auth(ownerToken))
      .expect(200);
    expect(customers.body.summary.receivables).toBe('0.0000');
    const suppliers = await request(app.getHttpServer())
      .get('/reports/suppliers')
      .set(auth(ownerToken))
      .expect(200);
    expect(suppliers.body.summary.payables).toBe('75.0000');
  });

  it('uses immutable product/unit/tile snapshots for invoice reprints', async () => {
    const response = await request(app.getHttpServer())
      .get(`/reports/invoices/${saleId}`)
      .set(auth(ownerToken))
      .expect(200);
    expect(response.body.items[0]).toMatchObject({
      productName: 'Historical Tile',
      sku: 'TILE-REPORT',
      tileSize: '24 x 24 inch',
      unit: 'PCS',
    });
  });

  it('enforces granular report and profit permissions', async () => {
    await request(app.getHttpServer())
      .get('/reports/inventory')
      .set(auth(limitedToken))
      .expect(403);
    await request(app.getHttpServer())
      .get('/reports/financial-summary')
      .set(auth(limitedToken))
      .expect(403);
    await request(app.getHttpServer()).get('/reports/sales').set(auth(limitedToken)).expect(200);
  });

  it('exports the same scoped sales data and rejects invalid local date ranges', async () => {
    const exported = await request(app.getHttpServer())
      .get('/reports/exports/sales')
      .set(auth(ownerToken))
      .expect(200)
      .expect('content-type', /text\/csv/);
    expect(exported.text).toContain('invoiceNumber');
    expect(exported.text).toContain(`INV-${suffix}`);
    await request(app.getHttpServer())
      .get('/reports/sales?from=2026-09-09&to=2026-09-08')
      .set(auth(ownerToken))
      .expect(400);
  });
});
