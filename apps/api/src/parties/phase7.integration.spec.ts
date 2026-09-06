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
const PASSWORD = 'Phase7Password123';

describe('Phase 7 customer and supplier API', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let companyId: string;
  let foreignCompanyId: string;
  let ownerToken: string;
  let limitedToken: string;
  let groupId: string;
  let customerId: string;
  let supplierId: string;
  const suffix = randomUUID().slice(0, 8);
  const companyCode = `P7${suffix}`.toUpperCase();
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });
  const key = () => `phase7-${randomUUID()}`;

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
      db.company.create({ data: { code: companyCode, name: 'Phase 7 Company' } }),
      db.company.create({ data: { code: `X${companyCode}`, name: 'Foreign Party Company' } }),
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
    await db.$transaction([
      db.userRole.create({ data: { companyId, userId: owner.id, roleId: ownerRole.id } }),
      db.userRole.create({ data: { companyId, userId: limited.id, roleId: limitedRole.id } }),
      db.rolePermission.createMany({
        data: permissions.map(({ id }) => ({ companyId, roleId: ownerRole.id, permissionId: id })),
      }),
      db.rolePermission.createMany({
        data: permissions
          .filter(({ key: permission }) => ['customer.view', 'supplier.view'].includes(permission))
          .map(({ id }) => ({ companyId, roleId: limitedRole.id, permissionId: id })),
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
      await db.$executeRawUnsafe(
        'ALTER TABLE "CustomerLedgerEntry" DISABLE TRIGGER "CustomerLedgerEntry_immutable_delete"',
      );
      await db.$executeRawUnsafe(
        'ALTER TABLE "SupplierLedgerEntry" DISABLE TRIGGER "SupplierLedgerEntry_immutable_delete"',
      );
      await db.$transaction([
        db.customerLedgerEntry.deleteMany({ where: { companyId: id } }),
        db.supplierLedgerEntry.deleteMany({ where: { companyId: id } }),
        db.authSession.deleteMany({ where: { companyId: id } }),
        db.auditLog.deleteMany({ where: { companyId: id } }),
      ]);
      await db.$executeRawUnsafe(
        'ALTER TABLE "CustomerLedgerEntry" ENABLE TRIGGER "CustomerLedgerEntry_immutable_delete"',
      );
      await db.$executeRawUnsafe(
        'ALTER TABLE "SupplierLedgerEntry" ENABLE TRIGGER "SupplierLedgerEntry_immutable_delete"',
      );
      await db.$transaction([
        db.customer.deleteMany({ where: { companyId: id } }),
        db.supplier.deleteMany({ where: { companyId: id } }),
        db.customerGroup.deleteMany({ where: { companyId: id } }),
        db.userRole.deleteMany({ where: { companyId: id } }),
        db.rolePermission.deleteMany({ where: { companyId: id } }),
      ]);
      await db.$transaction([
        db.user.deleteMany({ where: { companyId: id } }),
        db.role.deleteMany({ where: { companyId: id } }),
      ]);
      await db.company.delete({ where: { id } });
    }
    await app?.close();
  });

  it('provisions exactly one protected company walk-in customer', async () => {
    const walkIns = await db.customer.findMany({ where: { companyId, isWalkIn: true } });
    expect(walkIns).toHaveLength(1);
    expect(walkIns[0]).toMatchObject({ name: 'Walk-in Customer', isActive: true });
    await request(app.getHttpServer())
      .patch(`/customers/${walkIns[0].id}/status`)
      .set(auth(ownerToken))
      .send({ isActive: false })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/customers/${walkIns[0].id}`)
      .set(auth(ownerToken))
      .send({ name: 'Renamed' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/customers')
      .set(auth(ownerToken))
      .send({ code: 'WALK-IN', name: 'Duplicate walk-in' })
      .expect(400);
  });

  it('manages groups and customers with lifecycle, search, and inactive-group protection', async () => {
    groupId = (
      await request(app.getHttpServer())
        .post('/customer-groups')
        .set(auth(ownerToken))
        .send({ code: 'WHOLESALE', name: 'Wholesale', description: 'Trade customers' })
        .expect(201)
    ).body.id as string;
    customerId = (
      await request(app.getHttpServer())
        .post('/customers')
        .set(auth(ownerToken))
        .send({
          code: 'CUS-001',
          name: 'Rahman Tiles',
          phone: '01700000000',
          groupId,
          creditLimit: '50000.1250',
        })
        .expect(201)
    ).body.id as string;
    const search = await request(app.getHttpServer())
      .get('/customers?search=01700000000&limit=10')
      .set(auth(ownerToken))
      .expect(200);
    expect(search.body.items).toHaveLength(1);
    await request(app.getHttpServer())
      .patch(`/customer-groups/${groupId}/status`)
      .set(auth(ownerToken))
      .send({ isActive: false })
      .expect(200);
    await request(app.getHttpServer())
      .post('/customers')
      .set(auth(ownerToken))
      .send({ code: 'CUS-002', name: 'Blocked Group Customer', groupId })
      .expect(400);
    const detail = await request(app.getHttpServer())
      .get(`/customers/${customerId}`)
      .set(auth(ownerToken))
      .expect(200);
    expect(detail.body.group.id).toBe(groupId);
  });

  it('posts immutable, idempotent customer opening/correction entries and derives balance', async () => {
    const openingKey = key();
    const opening = {
      amount: '100.1234',
      effectiveAt: '2026-01-01T00:00:00.000Z',
      description: 'Imported customer receivable',
    };
    const first = await request(app.getHttpServer())
      .post(`/customers/${customerId}/ledger/opening`)
      .set(auth(ownerToken))
      .set('Idempotency-Key', openingKey)
      .send(opening)
      .expect(201);
    const replay = await request(app.getHttpServer())
      .post(`/customers/${customerId}/ledger/opening`)
      .set(auth(ownerToken))
      .set('Idempotency-Key', openingKey)
      .send(opening)
      .expect(201);
    expect(replay.body.id).toBe(first.body.id);
    await request(app.getHttpServer())
      .post(`/customers/${customerId}/ledger/opening`)
      .set(auth(ownerToken))
      .set('Idempotency-Key', openingKey)
      .send({ ...opening, amount: '200.0000' })
      .expect(409);
    await request(app.getHttpServer())
      .post(`/customers/${customerId}/ledger/opening-corrections`)
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        correctedAmount: '80.4321',
        effectiveAt: '2026-01-02T00:00:00.000Z',
        reason: 'Verified legacy invoice',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/customers/${customerId}/ledger/adjustments`)
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        amount: '-0.1111',
        effectiveAt: '2026-01-03T00:00:00.000Z',
        description: 'Approved customer credit adjustment',
      })
      .expect(201);
    const ledger = await request(app.getHttpServer())
      .get(`/customers/${customerId}/ledger`)
      .set(auth(ownerToken))
      .expect(200);
    expect(ledger.body.balance).toBe('80.3210');
    expect(ledger.body.items).toHaveLength(3);
    await expect(
      db.customerLedgerEntry.update({ where: { id: first.body.id }, data: { amount: '1' } }),
    ).rejects.toThrow(/immutable/i);
  });

  it('serializes concurrent opening posts without creating duplicate financial history', async () => {
    const concurrentCustomer = await request(app.getHttpServer())
      .post('/customers')
      .set(auth(ownerToken))
      .send({ code: 'CUS-CONCURRENT', name: 'Concurrent Opening Customer' })
      .expect(201);
    const payload = {
      amount: '25.0000',
      effectiveAt: '2026-01-01T00:00:00.000Z',
      description: 'Concurrent opening verification',
    };
    const responses = await Promise.all([
      request(app.getHttpServer())
        .post(`/customers/${concurrentCustomer.body.id}/ledger/opening`)
        .set(auth(ownerToken))
        .set('Idempotency-Key', key())
        .send(payload),
      request(app.getHttpServer())
        .post(`/customers/${concurrentCustomer.body.id}/ledger/opening`)
        .set(auth(ownerToken))
        .set('Idempotency-Key', key())
        .send(payload),
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(
      await db.customerLedgerEntry.count({
        where: {
          companyId,
          customerId: concurrentCustomer.body.id,
          type: 'OPENING_BALANCE',
        },
      }),
    ).toBe(1);
  });

  it('manages suppliers and derives payable/advance using the supplier sign convention', async () => {
    supplierId = (
      await request(app.getHttpServer())
        .post('/suppliers')
        .set(auth(ownerToken))
        .send({
          code: 'SUP-001',
          name: 'Ceramics Supply Co',
          contactName: 'Karim',
          phone: '01800000000',
        })
        .expect(201)
    ).body.id as string;
    const found = await request(app.getHttpServer())
      .get('/suppliers?search=Karim')
      .set(auth(ownerToken))
      .expect(200);
    expect(found.body.items[0].id).toBe(supplierId);
    await request(app.getHttpServer())
      .post(`/suppliers/${supplierId}/ledger/opening`)
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        amount: '999.9999',
        effectiveAt: '2026-01-01T00:00:00.000Z',
        description: 'Opening supplier payable',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/suppliers/${supplierId}/ledger/opening-corrections`)
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        correctedAmount: '-25.2500',
        effectiveAt: '2026-01-02T00:00:00.000Z',
        reason: 'Supplier advance confirmed',
      })
      .expect(201);
    const ledger = await request(app.getHttpServer())
      .get(`/suppliers/${supplierId}/ledger`)
      .set(auth(ownerToken))
      .expect(200);
    expect(ledger.body.balance).toBe('-25.2500');
    expect(ledger.body.items[0].debit).not.toBe('0.0000');
  });

  it('enforces permissions and rejects cross-company party and ledger access', async () => {
    await request(app.getHttpServer())
      .patch(`/customers/${customerId}/credit-limit`)
      .set(auth(limitedToken))
      .send({ creditLimit: '10', reason: 'Unauthorized attempt' })
      .expect(403);
    await request(app.getHttpServer())
      .get(`/customers/${customerId}/ledger`)
      .set(auth(limitedToken))
      .expect(403);
    const foreignCustomer = await db.customer.findFirstOrThrow({
      where: { companyId: foreignCompanyId, isWalkIn: true },
    });
    await request(app.getHttpServer())
      .get(`/customers/${foreignCustomer.id}`)
      .set(auth(ownerToken))
      .expect(404);
    await request(app.getHttpServer())
      .post(`/customers/${foreignCustomer.id}/ledger/adjustments`)
      .set(auth(ownerToken))
      .set('Idempotency-Key', key())
      .send({
        amount: '1',
        effectiveAt: '2026-01-01T00:00:00.000Z',
        description: 'Tenant escape attempt',
      })
      .expect(404);
    expect(
      await db.auditLog.count({ where: { companyId, action: { startsWith: 'customer.' } } }),
    ).toBeGreaterThan(0);
  });
});
