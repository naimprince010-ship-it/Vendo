import { randomUUID } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PasswordService } from '../auth/password.service';
import { PERMISSION_CATALOG } from '../authorization/permission-catalog';
import { DatabaseService } from '../database/database.service';

jest.setTimeout(60_000);
const PASSWORD = 'Phase6Password123';

describe('Phase 6 inventory API', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let companyId: string;
  let foreignCompanyId: string;
  let ownerToken: string;
  let limitedToken: string;
  let limitedUserId: string;
  let branchId: string;
  let branch2Id: string;
  let warehouseId: string;
  let warehouse2Id: string;
  let pcsId: string;
  let boxId: string;
  let tileId: string;
  let generalId: string;
  let batchId: string;
  const suffix = randomUUID().slice(0, 8);
  const companyCode = `I6${suffix}`.toUpperCase();
  const auth = (token: string, branch = branchId) => ({
    authorization: `Bearer ${token}`,
    'x-branch-id': branch,
  });
  const key = () => `phase6-${randomUUID()}`;

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
    const [company, foreign] = await db.$transaction([
      db.company.create({ data: { code: companyCode, name: 'Phase 6 Company' } }),
      db.company.create({ data: { code: `X${companyCode}`, name: 'Foreign Inventory Company' } }),
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
    const permissions = await db.permission.findMany({ select: { id: true, key: true } });
    limitedUserId = limited.id;
    await db.$transaction([
      db.userRole.create({ data: { companyId, userId: owner.id, roleId: ownerRole.id } }),
      db.userRole.create({ data: { companyId, userId: limited.id, roleId: limitedRole.id } }),
      db.rolePermission.createMany({
        data: permissions.map(({ id }) => ({ companyId, roleId: ownerRole.id, permissionId: id })),
      }),
      db.rolePermission.createMany({
        data: permissions
          .filter((p) => p.key === 'inventory.view')
          .map(({ id }) => ({ companyId, roleId: limitedRole.id, permissionId: id })),
      }),
    ]);
    const [branch, branch2] = await db.$transaction([
      db.branch.create({ data: { companyId, code: 'MAIN', name: 'Main' } }),
      db.branch.create({ data: { companyId, code: 'SECOND', name: 'Second' } }),
    ]);
    branchId = branch.id;
    branch2Id = branch2.id;
    await db.userBranch.create({ data: { companyId, userId: limitedUserId, branchId } });
    const [warehouse, warehouse2] = await db.$transaction([
      db.warehouse.create({
        data: { companyId, branchId, code: 'MAIN-WH', name: 'Main Warehouse' },
      }),
      db.warehouse.create({
        data: { companyId, branchId: branch2Id, code: 'SECOND-WH', name: 'Second Warehouse' },
      }),
    ]);
    warehouseId = warehouse.id;
    warehouse2Id = warehouse2.id;
    const [pcs, box] = await db.$transaction([
      db.unit.create({ data: { companyId, code: 'PCS', name: 'Pieces', decimalScale: 0 } }),
      db.unit.create({ data: { companyId, code: 'BOX', name: 'Box', decimalScale: 0 } }),
    ]);
    pcsId = pcs.id;
    boxId = box.id;
    const [tile, general] = await db.$transaction([
      db.product.create({
        data: {
          companyId,
          sku: 'TILE-I6',
          name: 'Shade Tile',
          type: 'TILE',
          baseUnitId: pcsId,
          batchTracking: true,
          reorderLevel: '4',
        },
      }),
      db.product.create({
        data: {
          companyId,
          sku: 'GENERAL-I6',
          name: 'General Item',
          type: 'GENERAL',
          baseUnitId: pcsId,
          reorderLevel: '3',
        },
      }),
    ]);
    tileId = tile.id;
    generalId = general.id;
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
      await db.$executeRawUnsafe(
        'ALTER TABLE "InventoryMovement" DISABLE TRIGGER "InventoryMovement_immutable_delete"',
      );
      await db.$transaction([
        db.authSession.deleteMany({ where: { companyId } }),
        db.auditLog.deleteMany({ where: { companyId } }),
        db.inventoryMovement.deleteMany({ where: { companyId } }),
      ]);
      await db.$executeRawUnsafe(
        'ALTER TABLE "InventoryMovement" ENABLE TRIGGER "InventoryMovement_immutable_delete"',
      );
      await db.$transaction([
        db.physicalCountItem.deleteMany({ where: { companyId } }),
        db.physicalCount.deleteMany({ where: { companyId } }),
        db.inventoryBalance.deleteMany({ where: { companyId } }),
        db.inventoryOperation.deleteMany({ where: { companyId } }),
        db.productBatch.deleteMany({ where: { companyId } }),
        db.unitConversion.deleteMany({ where: { companyId } }),
      ]);
      await db.$transaction([
        db.product.deleteMany({ where: { companyId } }),
        db.unit.deleteMany({ where: { companyId } }),
        db.userBranch.deleteMany({ where: { companyId } }),
        db.userRole.deleteMany({ where: { companyId } }),
        db.rolePermission.deleteMany({ where: { companyId } }),
      ]);
      await db.$transaction([
        db.customer.deleteMany({ where: { companyId } }),
        db.warehouse.deleteMany({ where: { companyId } }),
        db.branch.deleteMany({ where: { companyId } }),
        db.user.deleteMany({ where: { companyId } }),
        db.role.deleteMany({ where: { companyId } }),
      ]);
      await db.company.delete({ where: { id: companyId } });
    }
    if (foreignCompanyId) {
      await db.customer.deleteMany({ where: { companyId: foreignCompanyId } });
      await db.company.delete({ where: { id: foreignCompanyId } });
    }
    await app?.close();
  });

  it('requires batch identity, opens Box stock once, snapshots conversion, and retries idempotently', async () => {
    await request(app.getHttpServer())
      .post('/inventory/opening')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        warehouseId,
        reason: 'Opening tile stock',
        lines: [{ productId: tileId, unitId: boxId, quantity: '2' }],
      })
      .expect(400);
    batchId = (
      await request(app.getHttpServer())
        .post('/inventory/batches')
        .set(auth(ownerToken))
        .send({ productId: tileId, batchNumber: 'B-001', lotNumber: 'L-1', shade: 'A' })
        .expect(201)
    ).body.id as string;
    await request(app.getHttpServer())
      .get(`/inventory/batches?productId=${tileId}&isActive=true`)
      .set(auth(ownerToken))
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(1));
    const idempotencyKey = key();
    const body = {
      warehouseId,
      reason: 'Opening tile stock',
      lines: [{ productId: tileId, unitId: boxId, batchId, quantity: '2' }],
    };
    const first = await request(app.getHttpServer())
      .post('/inventory/opening')
      .set(auth(ownerToken))
      .set('Idempotency-Key', idempotencyKey)
      .send(body)
      .expect(201);
    const retry = await request(app.getHttpServer())
      .post('/inventory/opening')
      .set(auth(ownerToken))
      .set('Idempotency-Key', idempotencyKey)
      .send(body)
      .expect(201);
    expect(retry.body.operationId).toBe(first.body.operationId);
    const balance = await db.inventoryBalance.findFirstOrThrow({
      where: { companyId, warehouseId, productId: tileId, batchId },
    });
    expect(balance.baseQuantity.toFixed()).toBe('8');
    const movement = await db.inventoryMovement.findFirstOrThrow({
      where: { companyId, productId: tileId, type: 'OPENING' },
    });
    expect(movement.conversionFactor.toFixed()).toBe('4');
    expect(
      await db.inventoryMovement.count({
        where: { companyId, productId: tileId, type: 'OPENING' },
      }),
    ).toBe(1);
    await request(app.getHttpServer())
      .post('/inventory/opening')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send(body)
      .expect(409);
  });

  it('posts adjustments, damage and loss atomically and rejects negative stock', async () => {
    await request(app.getHttpServer())
      .post('/inventory/opening')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        warehouseId,
        reason: 'Opening general stock',
        lines: [{ productId: generalId, unitId: pcsId, quantity: '10' }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/inventory/adjustments')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        warehouseId,
        direction: 'IN',
        reason: 'Found stock',
        lines: [{ productId: generalId, unitId: pcsId, quantity: '2' }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/inventory/damage')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        warehouseId,
        reason: 'Broken item',
        lines: [{ productId: generalId, unitId: pcsId, quantity: '1' }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/inventory/loss')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        warehouseId,
        reason: 'Missing item',
        lines: [{ productId: generalId, unitId: pcsId, quantity: '1' }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/inventory/adjustments')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        warehouseId,
        direction: 'OUT',
        reason: 'Must rollback',
        lines: [{ productId: generalId, unitId: pcsId, quantity: '99' }],
      })
      .expect(409);
    const balance = await db.inventoryBalance.findFirstOrThrow({
      where: { companyId, warehouseId, productId: generalId, batchId: null },
    });
    expect(balance.baseQuantity.toFixed()).toBe('10');
  });

  it('serializes concurrent deductions so only available stock can leave', async () => {
    const send = () =>
      request(app.getHttpServer())
        .post('/inventory/adjustments')
        .set(auth(ownerToken))
        .set('Idempotency-Key', key())
        .send({
          warehouseId,
          direction: 'OUT',
          reason: 'Concurrent allocation',
          lines: [{ productId: generalId, unitId: pcsId, quantity: '6' }],
        });
    const responses = await Promise.all([send(), send()]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    const balance = await db.inventoryBalance.findFirstOrThrow({
      where: { companyId, warehouseId, productId: generalId, batchId: null },
    });
    expect(balance.baseQuantity.toFixed()).toBe('4');
  });

  it('transfers with paired correlated movements and validates destination branch access', async () => {
    await request(app.getHttpServer())
      .post('/inventory/transfers')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        sourceWarehouseId: warehouseId,
        destinationWarehouseId: warehouse2Id,
        reason: 'Replenish second branch',
        lines: [{ productId: generalId, unitId: pcsId, quantity: '2' }],
      })
      .expect(201)
      .expect(({ body }) => expect(body.lines[0].outbound.movement.baseQuantity).toBe('-2'));
    const movements = await db.inventoryMovement.findMany({
      where: {
        companyId,
        referenceType: 'INVENTORY_OPERATION',
        type: { in: ['TRANSFER_OUT', 'TRANSFER_IN'] },
      },
    });
    expect(movements).toHaveLength(2);
    expect(movements[0].correlationId).toBe(movements[1].correlationId);
    const destination = await db.inventoryBalance.findFirstOrThrow({
      where: { companyId, warehouseId: warehouse2Id, productId: generalId },
    });
    expect(destination.baseQuantity.toFixed()).toBe('2');
  });

  it('rejects stale counts and posts a fresh reviewed reconciliation', async () => {
    const stale = await request(app.getHttpServer())
      .post('/inventory/counts')
      .set(auth(ownerToken))
      .send({
        warehouseId,
        countNumber: `COUNT-${suffix}-1`,
        items: [{ productId: generalId, unitId: pcsId, quantity: '1' }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/inventory/counts/${stale.body.id}/review`)
      .set(auth(ownerToken))
      .expect(201);
    await request(app.getHttpServer())
      .post('/inventory/adjustments')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        warehouseId,
        direction: 'IN',
        reason: 'Changed after count',
        lines: [{ productId: generalId, unitId: pcsId, quantity: '1' }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/inventory/counts/${stale.body.id}/post`)
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .expect(409);
    const fresh = await request(app.getHttpServer())
      .post('/inventory/counts')
      .set(auth(ownerToken))
      .send({
        warehouseId,
        countNumber: `COUNT-${suffix}-2`,
        items: [{ productId: generalId, unitId: pcsId, quantity: '3' }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/inventory/counts/${fresh.body.id}/review`)
      .set(auth(ownerToken))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/inventory/counts/${fresh.body.id}/post`)
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .expect(201);
    const balance = await db.inventoryBalance.findFirstOrThrow({
      where: { companyId, warehouseId, productId: generalId, batchId: null },
    });
    expect(balance.baseQuantity.toFixed()).toBe('3');
  });

  it('returns base and derived stock, low stock and immutable movement history', async () => {
    const balances = await request(app.getHttpServer())
      .get('/inventory/balances')
      .set(auth(ownerToken))
      .expect(200);
    const tile = balances.body.items.find(
      (item: { productId: string }) => item.productId === tileId,
    );
    expect(
      tile.equivalents.find((e: { unit: { code: string } }) => e.unit.code === 'BOX').quantity,
    ).toBe('2');
    const low = await request(app.getHttpServer())
      .get('/inventory/low-stock')
      .set(auth(ownerToken))
      .expect(200);
    expect(low.body.items.some((item: { productId: string }) => item.productId === generalId)).toBe(
      true,
    );
    const history = await request(app.getHttpServer())
      .get('/inventory/movements')
      .set(auth(ownerToken))
      .expect(200);
    expect(history.body.total).toBeGreaterThan(5);
    const movementId = history.body.items[0].id as string;
    await expect(
      db.inventoryMovement.update({ where: { id: movementId }, data: { reason: 'tampered' } }),
    ).rejects.toThrow();
  });

  it('enforces permissions, active branch context and tenant warehouse ownership', async () => {
    await request(app.getHttpServer())
      .get('/inventory/balances')
      .set(auth(limitedToken))
      .expect(200);
    await request(app.getHttpServer())
      .post('/inventory/adjustments')
      .set(auth(limitedToken))
      .set('Idempotency-Key', key())
      .send({
        warehouseId,
        direction: 'IN',
        reason: 'Unauthorized',
        lines: [{ productId: generalId, unitId: pcsId, quantity: '1' }],
      })
      .expect(403);
    const foreignBranch = await db.branch.create({
      data: { companyId: foreignCompanyId, code: 'FOREIGN', name: 'Foreign' },
    });
    const foreignWarehouse = await db.warehouse.create({
      data: {
        companyId: foreignCompanyId,
        branchId: foreignBranch.id,
        code: 'FOREIGN',
        name: 'Foreign',
      },
    });
    await request(app.getHttpServer())
      .post('/inventory/opening')
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        warehouseId: foreignWarehouse.id,
        reason: 'Tenant escape',
        lines: [{ productId: generalId, unitId: pcsId, quantity: '1' }],
      })
      .expect(400);
    await db.warehouse.delete({ where: { id: foreignWarehouse.id } });
    await db.branch.delete({ where: { id: foreignBranch.id } });
  });
});
