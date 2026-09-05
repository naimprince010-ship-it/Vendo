import { randomUUID } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PERMISSIONS, PERMISSION_CATALOG } from '../authorization/permission-catalog';
import { DatabaseService } from '../database/database.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

const PASSWORD = 'ValidPassword123';
const NEW_PASSWORD = 'ChangedPassword456';

jest.setTimeout(30_000);

const cookieValue = (response: request.Response): string => {
  const header = response.headers['set-cookie'];
  const cookie = Array.isArray(header) ? header[0] : header;
  if (!cookie) throw new Error('refresh cookie missing');
  return cookie.split(';')[0];
};

describe('Phase 3 authentication and authorization API', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let passwords: PasswordService;
  let tokens: TokenService;
  let jwt: JwtService;
  let companyId: string;
  let otherCompanyId: string;
  let adminId: string;
  let limitedId: string;
  let inactiveId: string;
  let adminRoleId: string;
  let limitedRoleId: string;
  let otherRoleId: string;
  let adminAccess = '';
  let limitedAccess = '';

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    database = app.get(DatabaseService);
    passwords = app.get(PasswordService);
    tokens = app.get(TokenService);
    jwt = app.get(JwtService);

    const suffix = randomUUID().slice(0, 8).toUpperCase();
    const [company, otherCompany] = await Promise.all([
      database.company.create({ data: { code: `AUTH${suffix}`, name: 'Auth Test Company' } }),
      database.company.create({ data: { code: `OTHER${suffix}`, name: 'Other Test Company' } }),
    ]);
    companyId = company.id;
    otherCompanyId = otherCompany.id;
    for (const key of PERMISSION_CATALOG) {
      await database.permission.upsert({ where: { key }, create: { key }, update: {} });
    }
    const allPermissions = await database.permission.findMany({ select: { id: true, key: true } });
    const userView = allPermissions.find(({ key }) => key === PERMISSIONS.USER_VIEW);
    if (!userView) throw new Error('user.view permission missing');

    const [adminRole, limitedRole, otherRole] = await Promise.all([
      database.role.create({ data: { companyId, key: 'admin', name: 'Admin' } }),
      database.role.create({ data: { companyId, key: 'limited', name: 'Limited' } }),
      database.role.create({
        data: { companyId: otherCompanyId, key: 'foreign', name: 'Foreign' },
      }),
    ]);
    adminRoleId = adminRole.id;
    limitedRoleId = limitedRole.id;
    otherRoleId = otherRole.id;
    await database.rolePermission.createMany({
      data: [
        ...allPermissions.map(({ id }) => ({ companyId, roleId: adminRoleId, permissionId: id })),
        { companyId, roleId: limitedRoleId, permissionId: userView.id },
      ],
    });

    const passwordHash = await passwords.hash(PASSWORD);
    const [admin, limited, inactive] = await Promise.all([
      database.user.create({
        data: { companyId, email: 'admin@example.test', passwordHash, firstName: 'Admin' },
      }),
      database.user.create({
        data: { companyId, email: 'limited@example.test', passwordHash, firstName: 'Limited' },
      }),
      database.user.create({
        data: {
          companyId,
          email: 'inactive@example.test',
          passwordHash,
          firstName: 'Inactive',
          status: 'DISABLED',
        },
      }),
    ]);
    adminId = admin.id;
    limitedId = limited.id;
    inactiveId = inactive.id;
    await database.userRole.createMany({
      data: [
        { companyId, userId: adminId, roleId: adminRoleId },
        { companyId, userId: limitedId, roleId: limitedRoleId },
      ],
    });
  });

  afterAll(async () => {
    if (database) {
      await database.authSession.updateMany({
        where: { companyId: { in: [companyId, otherCompanyId] } },
        data: { replacedById: null },
      });
      await database.passwordResetToken.deleteMany({
        where: { companyId: { in: [companyId, otherCompanyId] } },
      });
      await database.authSession.deleteMany({
        where: { companyId: { in: [companyId, otherCompanyId] } },
      });
      await database.auditLog.deleteMany({
        where: { companyId: { in: [companyId, otherCompanyId] } },
      });
      await database.userRole.deleteMany({
        where: { companyId: { in: [companyId, otherCompanyId] } },
      });
      await database.rolePermission.deleteMany({
        where: { companyId: { in: [companyId, otherCompanyId] } },
      });
      await database.user.deleteMany({ where: { companyId: { in: [companyId, otherCompanyId] } } });
      await database.role.deleteMany({ where: { companyId: { in: [companyId, otherCompanyId] } } });
      await database.company.deleteMany({ where: { id: { in: [companyId, otherCompanyId] } } });
    }
    await app?.close();
  });

  it('rejects invalid credentials and inactive accounts without enumeration details', async () => {
    const company = await database.company.findUniqueOrThrow({ where: { id: companyId } });
    const invalid = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      companyCode: company.code,
      email: 'missing@example.test',
      password: PASSWORD,
    });
    const inactive = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      companyCode: company.code,
      email: 'inactive@example.test',
      password: PASSWORD,
    });
    expect(invalid.status).toBe(401);
    expect(inactive.status).toBe(401);
    expect(invalid.body.message).toBe('Invalid credentials');
    expect(inactive.body.message).toBe('Invalid credentials');
  });

  it('logs in, stores only a refresh hash, and returns no credential internals', async () => {
    const company = await database.company.findUniqueOrThrow({ where: { id: companyId } });
    const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      companyCode: company.code,
      email: 'admin@example.test',
      password: PASSWORD,
    });
    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toBeUndefined();
    expect(response.body.user.passwordHash).toBeUndefined();
    adminAccess = response.body.accessToken as string;
    const rawRefresh = cookieValue(response).split('=')[1];
    const session = await database.authSession.findFirstOrThrow({
      where: { userId: adminId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    expect(session.refreshTokenHash).toHaveLength(64);
    expect(session.refreshTokenHash).not.toBe(rawRefresh);
    expect(session.refreshTokenHash).toBe(tokens.hashOpaqueToken(rawRefresh));
  });

  it('protects endpoints and rejects invalid or expired access tokens', async () => {
    expect((await request(app.getHttpServer()).get('/api/v1/auth/me')).status).toBe(401);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', 'Bearer invalid')
      ).status,
    ).toBe(401);
    const session = await database.authSession.findFirstOrThrow({
      where: { userId: adminId, revokedAt: null },
    });
    const expired = await jwt.signAsync(
      { sub: adminId, cid: companyId, sid: session.id, ver: 0, typ: 'access' },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
        expiresIn: -1,
      },
    );
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${expired}`)
      ).status,
    ).toBe(401);
    const valid = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminAccess}`);
    expect(valid.status).toBe(200);
    expect(valid.body.passwordHash).toBeUndefined();
  });

  it('enforces current permissions and cannot accept a cross-company role', async () => {
    const company = await database.company.findUniqueOrThrow({ where: { id: companyId } });
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      companyCode: company.code,
      email: 'limited@example.test',
      password: PASSWORD,
    });
    limitedAccess = login.body.accessToken as string;
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${limitedAccess}`)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/roles')
          .set('Authorization', `Bearer ${limitedAccess}`)
      ).status,
    ).toBe(403);
    const foreign = await request(app.getHttpServer())
      .post(`/api/v1/users/${limitedId}/roles`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ roleId: otherRoleId });
    expect(foreign.status).toBe(400);
  });

  it('applies administrative role changes to an already-issued access token', async () => {
    await database.rolePermission.create({
      data: {
        companyId,
        roleId: limitedRoleId,
        permissionId: (
          await database.permission.findUniqueOrThrow({ where: { key: PERMISSIONS.ROLE_VIEW } })
        ).id,
      },
    });
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/roles')
          .set('Authorization', `Bearer ${limitedAccess}`)
      ).status,
    ).toBe(200);
    await database.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId: limitedRoleId,
          permissionId: (
            await database.permission.findUniqueOrThrow({ where: { key: PERMISSIONS.ROLE_VIEW } })
          ).id,
        },
      },
    });
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/roles')
          .set('Authorization', `Bearer ${limitedAccess}`)
      ).status,
    ).toBe(403);
  });

  it('implements tenant-scoped user, role, permission, status, and password administration', async () => {
    const createdRole = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ key: 'phase3-test-role', name: 'Phase 3 Test Role' });
    expect(createdRole.status).toBe(201);
    const roleId = createdRole.body.id as string;
    const updatedRole = await request(app.getHttpServer())
      .patch(`/api/v1/roles/${roleId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'Updated Phase 3 Role' });
    expect(updatedRole.status).toBe(200);
    expect(updatedRole.body.name).toBe('Updated Phase 3 Role');

    const permissionList = await request(app.getHttpServer())
      .get('/api/v1/permissions')
      .set('Authorization', `Bearer ${adminAccess}`);
    expect(permissionList.status).toBe(200);
    const userViewId = (permissionList.body as Array<{ id: string; key: string }>).find(
      ({ key }) => key === PERMISSIONS.USER_VIEW,
    )?.id;
    expect(userViewId).toBeDefined();
    expect(
      (
        await request(app.getHttpServer())
          .put(`/api/v1/roles/${roleId}/permissions`)
          .set('Authorization', `Bearer ${adminAccess}`)
          .send({ permissionIds: [userViewId] })
      ).status,
    ).toBe(200);

    const createdUser = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({
        email: 'managed@example.test',
        firstName: 'Managed',
        password: PASSWORD,
        roleIds: [roleId],
      });
    expect(createdUser.status).toBe(201);
    expect(createdUser.body.passwordHash).toBeUndefined();
    const userId = createdUser.body.id as string;

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ firstName: 'Updated' });
    expect(updated.status).toBe(200);
    expect(updated.body.firstName).toBe('Updated');
    expect(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/users/${userId}/password`)
          .set('Authorization', `Bearer ${adminAccess}`)
          .send({ newPassword: NEW_PASSWORD })
      ).status,
    ).toBe(204);
    expect(
      (
        await request(app.getHttpServer())
          .delete(`/api/v1/users/${userId}/roles/${roleId}`)
          .set('Authorization', `Bearer ${adminAccess}`)
      ).status,
    ).toBe(204);
    expect(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/users/${userId}/roles`)
          .set('Authorization', `Bearer ${adminAccess}`)
          .send({ roleId })
      ).status,
    ).toBe(204);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/users/${userId}/status`)
          .set('Authorization', `Bearer ${adminAccess}`)
          .send({ status: 'DISABLED' })
      ).status,
    ).toBe(200);
  });

  it('rotates refresh credentials and revokes the family when an old credential is reused', async () => {
    const company = await database.company.findUniqueOrThrow({ where: { id: companyId } });
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      companyCode: company.code,
      email: 'admin@example.test',
      password: PASSWORD,
    });
    const firstCookie = cookieValue(login);
    const rotated = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', firstCookie);
    expect(rotated.status).toBe(200);
    const secondCookie = cookieValue(rotated);
    expect(secondCookie).not.toBe(firstCookie);
    expect(
      (await request(app.getHttpServer()).post('/api/v1/auth/refresh').set('Cookie', firstCookie))
        .status,
    ).toBe(401);
    expect(
      (await request(app.getHttpServer()).post('/api/v1/auth/refresh').set('Cookie', secondCookie))
        .status,
    ).toBe(401);
  });

  it('revokes the current session on logout', async () => {
    const company = await database.company.findUniqueOrThrow({ where: { id: companyId } });
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      companyCode: company.code,
      email: 'admin@example.test',
      password: PASSWORD,
    });
    const access = login.body.accessToken as string;
    expect(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/logout')
          .set('Authorization', `Bearer ${access}`)
      ).status,
    ).toBe(204);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${access}`)
      ).status,
    ).toBe(401);
  });

  it('changes a password, revokes sessions, and rejects the old password', async () => {
    const company = await database.company.findUniqueOrThrow({ where: { id: companyId } });
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      companyCode: company.code,
      email: 'admin@example.test',
      password: PASSWORD,
    });
    const access = login.body.accessToken as string;
    const changed = await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${access}`)
      .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
    expect(changed.status).toBe(204);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${access}`)
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app.getHttpServer()).post('/api/v1/auth/login').send({
          companyCode: company.code,
          email: 'admin@example.test',
          password: PASSWORD,
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app.getHttpServer()).post('/api/v1/auth/login').send({
          companyCode: company.code,
          email: 'admin@example.test',
          password: NEW_PASSWORD,
        })
      ).status,
    ).toBe(200);
  });

  it('keeps reset requests generic and atomically consumes a hashed reset token', async () => {
    const company = await database.company.findUniqueOrThrow({ where: { id: companyId } });
    const existing = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .send({
        companyCode: company.code,
        email: 'admin@example.test',
      });
    const missing = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .send({
        companyCode: company.code,
        email: 'missing@example.test',
      });
    expect(existing.status).toBe(202);
    expect(missing.status).toBe(202);
    expect(existing.body).toEqual(missing.body);

    const rawToken = tokens.createOpaqueToken();
    const reset = await database.passwordResetToken.create({
      data: {
        companyId,
        userId: adminId,
        tokenHash: tokens.hashOpaqueToken(rawToken),
        expiresAt: tokens.passwordResetExpiry(),
      },
    });
    expect(reset.tokenHash).not.toBe(rawToken);
    const complete = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/complete')
      .send({
        companyCode: company.code,
        token: rawToken,
        newPassword: PASSWORD,
      });
    expect(complete.status).toBe(204);
    expect(
      (await database.passwordResetToken.findUniqueOrThrow({ where: { id: reset.id } })).usedAt,
    ).not.toBeNull();
  });

  it('rate limits repeated login attempts', async () => {
    const company = await database.company.findUniqueOrThrow({ where: { id: companyId } });
    let sawTooManyRequests = false;
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          companyCode: company.code,
          email: `unknown-${attempt}@example.test`,
          password: PASSWORD,
        });
      if (response.status === 429) {
        sawTooManyRequests = true;
        break;
      }
    }
    expect(sawTooManyRequests).toBe(true);
  });

  it('keeps unrelated inactive test identity company-scoped', async () => {
    expect(
      await database.user.count({ where: { id: inactiveId, companyId, status: 'DISABLED' } }),
    ).toBe(1);
  });
});
