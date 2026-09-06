import { randomUUID } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PasswordService } from '../auth/password.service';
import { PERMISSION_CATALOG } from '../authorization/permission-catalog';
import { DatabaseService } from '../database/database.service';

jest.setTimeout(30_000);

const PASSWORD = 'Phase4Password123';

describe('Phase 4 organization and location API', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let companyId: string;
  let foreignCompanyId: string;
  let ownerId: string;
  let limitedUserId: string;
  let foreignBranchId: string;
  let ownerToken: string;
  let limitedToken: string;
  let branchId: string;
  let warehouseId: string;
  let registerId: string;
  const suffix = randomUUID().slice(0, 8);
  const companyCode = `P4${suffix}`.toUpperCase();

  const login = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ companyCode, email, password: PASSWORD })
      .expect(200);
    return response.body.accessToken as string;
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    database = app.get(DatabaseService);
    const passwords = app.get(PasswordService);

    await database.$transaction(
      PERMISSION_CATALOG.map((key) =>
        database.permission.upsert({ where: { key }, update: {}, create: { key } }),
      ),
    );
    const [company, foreignCompany] = await Promise.all([
      database.company.create({ data: { code: companyCode, name: 'Phase 4 Company' } }),
      database.company.create({ data: { code: `X${companyCode}`, name: 'Foreign Company' } }),
    ]);
    companyId = company.id;
    foreignCompanyId = foreignCompany.id;
    const passwordHash = await passwords.hash(PASSWORD);
    const [owner, limited, ownerRole, limitedRole] = await database.$transaction([
      database.user.create({
        data: {
          companyId,
          email: `owner-${suffix}@example.invalid`,
          passwordHash,
          firstName: 'Owner',
        },
      }),
      database.user.create({
        data: {
          companyId,
          email: `limited-${suffix}@example.invalid`,
          passwordHash,
          firstName: 'Limited',
        },
      }),
      database.role.create({ data: { companyId, key: `owner-${suffix}`, name: 'Owner' } }),
      database.role.create({ data: { companyId, key: `limited-${suffix}`, name: 'Limited' } }),
    ]);
    ownerId = owner.id;
    limitedUserId = limited.id;
    const permissions = await database.permission.findMany({ select: { id: true } });
    await database.$transaction([
      database.userRole.create({ data: { companyId, userId: ownerId, roleId: ownerRole.id } }),
      database.userRole.create({
        data: { companyId, userId: limitedUserId, roleId: limitedRole.id },
      }),
      database.rolePermission.createMany({
        data: permissions.map(({ id }) => ({ companyId, roleId: ownerRole.id, permissionId: id })),
      }),
    ]);
    const foreignBranch = await database.branch.create({
      data: { companyId: foreignCompanyId, code: 'FOREIGN', name: 'Foreign Branch' },
    });
    foreignBranchId = foreignBranch.id;
    ownerToken = await login(owner.email);
    limitedToken = await login(limited.email);
  });

  afterAll(async () => {
    if (companyId) {
      await database.$transaction([
        database.authSession.deleteMany({ where: { companyId } }),
        database.auditLog.deleteMany({ where: { companyId } }),
        database.userBranch.deleteMany({ where: { companyId } }),
        database.register.deleteMany({ where: { companyId } }),
        database.warehouse.deleteMany({ where: { companyId } }),
        database.branch.deleteMany({ where: { companyId } }),
        database.userRole.deleteMany({ where: { companyId } }),
        database.rolePermission.deleteMany({ where: { companyId } }),
      ]);
      await database.$transaction([
        database.customer.deleteMany({ where: { companyId } }),
        database.user.deleteMany({ where: { companyId } }),
        database.role.deleteMany({ where: { companyId } }),
      ]);
      await database.company.delete({ where: { id: companyId } });
    }
    if (foreignCompanyId) {
      await database.branch.deleteMany({ where: { companyId: foreignCompanyId } });
      await database.customer.deleteMany({ where: { companyId: foreignCompanyId } });
      await database.company.delete({ where: { id: foreignCompanyId } });
    }
    await app?.close();
  });

  it('reads and updates only the authenticated company profile', async () => {
    const read = await request(app.getHttpServer())
      .get('/company')
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(read.body).toMatchObject({ id: companyId, code: companyCode });

    const updated = await request(app.getHttpServer())
      .patch('/company')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Phase 4 Updated', currencyCode: 'BDT', timezone: 'Asia/Dhaka' })
      .expect(200);
    expect(updated.body.name).toBe('Phase 4 Updated');

    await request(app.getHttpServer())
      .patch('/company')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ companyId: foreignCompanyId, name: 'Escape attempt' })
      .expect(400);
    expect(
      (await database.company.findUniqueOrThrow({ where: { id: foreignCompanyId } })).name,
    ).toBe('Foreign Company');
  });

  it('rejects company updates without permission', async () => {
    await request(app.getHttpServer())
      .patch('/company')
      .set('authorization', `Bearer ${limitedToken}`)
      .send({ name: 'Unauthorized' })
      .expect(403);
  });

  it('creates, lists, updates, and protects company-scoped branches', async () => {
    const created = await request(app.getHttpServer())
      .post('/branches')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ code: 'main', name: 'Main Branch', phone: '0123456789' })
      .expect(201);
    branchId = created.body.id as string;
    expect(created.body).toMatchObject({ companyId, code: 'MAIN', isActive: true });

    const list = await request(app.getHttpServer())
      .get('/branches?limit=10')
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(list.body).toMatchObject({ total: 1 });

    await request(app.getHttpServer())
      .post('/branches')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ code: 'MAIN', name: 'Duplicate' })
      .expect(409);

    const updated = await request(app.getHttpServer())
      .patch(`/branches/${branchId}`)
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Main Showroom' })
      .expect(200);
    expect(updated.body.name).toBe('Main Showroom');

    await request(app.getHttpServer())
      .get(`/branches/${foreignBranchId}`)
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });

  it('grants and revokes explicit branch access with tenant and permission checks', async () => {
    await request(app.getHttpServer())
      .post(`/users/${limitedUserId}/branches`)
      .set('authorization', `Bearer ${limitedToken}`)
      .send({ branchId })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/users/${limitedUserId}/branches`)
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ branchId: foreignBranchId })
      .expect(400);

    const granted = await request(app.getHttpServer())
      .post(`/users/${limitedUserId}/branches`)
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ branchId })
      .expect(201);
    expect(granted.body).toMatchObject({ accessMode: 'EXPLICIT' });
    expect(granted.body.branches).toHaveLength(1);

    await request(app.getHttpServer())
      .get('/branches/active-context')
      .set('authorization', `Bearer ${limitedToken}`)
      .set('x-branch-id', branchId)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/users/${limitedUserId}/branches/${branchId}`)
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get('/branches/active-context')
      .set('authorization', `Bearer ${limitedToken}`)
      .set('x-branch-id', branchId)
      .expect(403);
  });

  it('allows branch.access_all but rejects foreign and inactive active contexts', async () => {
    await request(app.getHttpServer())
      .get('/branches/active-context')
      .set('authorization', `Bearer ${ownerToken}`)
      .set('x-branch-id', branchId)
      .expect(200);
    await request(app.getHttpServer())
      .get('/branches/active-context')
      .set('authorization', `Bearer ${ownerToken}`)
      .set('x-branch-id', foreignBranchId)
      .expect(403);
  });

  it('manages warehouses while enforcing branch/company ownership', async () => {
    const created = await request(app.getHttpServer())
      .post('/warehouses')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ branchId, code: 'WH-MAIN', name: 'Main Warehouse' })
      .expect(201);
    warehouseId = created.body.id as string;
    expect(created.body).toMatchObject({ companyId, branchId, code: 'WH-MAIN' });

    await request(app.getHttpServer())
      .post('/warehouses')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ branchId: foreignBranchId, code: 'BAD-WH', name: 'Foreign' })
      .expect(400);

    const updated = await request(app.getHttpServer())
      .patch(`/warehouses/${warehouseId}`)
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Primary Warehouse' })
      .expect(200);
    expect(updated.body.name).toBe('Primary Warehouse');

    await request(app.getHttpServer())
      .patch(`/warehouses/${warehouseId}/status`)
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ isActive: false })
      .expect(200);
  });

  it('manages registers while enforcing branch/company ownership', async () => {
    const created = await request(app.getHttpServer())
      .post('/registers')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ branchId, code: 'REG-01', name: 'Front Counter' })
      .expect(201);
    registerId = created.body.id as string;
    expect(created.body).toMatchObject({ companyId, branchId, code: 'REG-01' });

    await request(app.getHttpServer())
      .post('/registers')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ branchId: foreignBranchId, code: 'BAD-REG', name: 'Foreign' })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/registers/${registerId}`)
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Main Counter' })
      .expect(200);
    const deactivated = await request(app.getHttpServer())
      .patch(`/registers/${registerId}/status`)
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ isActive: false })
      .expect(200);
    expect(deactivated.body.isActive).toBe(false);
  });

  it('rejects inactive branches for active context and new locations', async () => {
    await request(app.getHttpServer())
      .patch(`/branches/${branchId}/status`)
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ isActive: false })
      .expect(200);
    await request(app.getHttpServer())
      .get('/branches/active-context')
      .set('authorization', `Bearer ${ownerToken}`)
      .set('x-branch-id', branchId)
      .expect(403);
    await request(app.getHttpServer())
      .post('/warehouses')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ branchId, code: 'WH-INACTIVE', name: 'Rejected' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/registers')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ branchId, code: 'REG-INACTIVE', name: 'Rejected' })
      .expect(400);
  });

  it('records all critical Phase 4 mutations in the company audit trail', async () => {
    const actions = await database.auditLog.findMany({
      where: { companyId },
      select: { action: true },
    });
    const keys = new Set(actions.map(({ action }) => action));
    for (const action of [
      'company.updated',
      'branch.created',
      'branch.updated',
      'branch.status.changed',
      'user.branch.granted',
      'user.branch.revoked',
      'warehouse.created',
      'warehouse.updated',
      'warehouse.status.changed',
      'register.created',
      'register.updated',
      'register.status.changed',
    ]) {
      expect(keys.has(action)).toBe(true);
    }
  });
});
