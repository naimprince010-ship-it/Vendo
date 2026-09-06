import 'dotenv/config';
import { hash, argon2id } from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { PERMISSION_CATALOG } from '../src/authorization/permission-catalog';

if (process.env.ALLOW_DEV_BOOTSTRAP !== 'true') {
  throw new Error('Refusing to bootstrap without ALLOW_DEV_BOOTSTRAP=true');
}

const required = (key: string): string => {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
};

const connectionString = required('DATABASE_URL');
const companyCode = required('BOOTSTRAP_COMPANY_CODE').toUpperCase();
const companyName = required('BOOTSTRAP_COMPANY_NAME');
const ownerEmail = required('BOOTSTRAP_OWNER_EMAIL').toLowerCase();
const ownerPassword = required('BOOTSTRAP_OWNER_PASSWORD');
if (
  ownerPassword.length < 12 ||
  !/[a-z]/.test(ownerPassword) ||
  !/[A-Z]/.test(ownerPassword) ||
  !/\d/.test(ownerPassword)
) {
  throw new Error(
    'BOOTSTRAP_OWNER_PASSWORD must be 12+ characters with upper, lower, and numeric characters',
  );
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main(): Promise<void> {
  const passwordHash = await hash(ownerPassword, {
    type: argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  await prisma.$transaction(async (tx) => {
    const company = await tx.company.upsert({
      where: { code: companyCode },
      create: { code: companyCode, name: companyName },
      update: { name: companyName },
    });
    const walkIn = await tx.customer.findFirst({
      where: { companyId: company.id, isWalkIn: true },
      select: { id: true },
    });
    if (!walkIn) {
      const reservedCode = await tx.customer.findUnique({
        where: { companyId_code: { companyId: company.id, code: 'WALK-IN' } },
        select: { id: true },
      });
      await tx.customer.create({
        data: {
          companyId: company.id,
          code: reservedCode
            ? `WALK-IN-${company.id.replaceAll('-', '').slice(0, 8).toUpperCase()}`
            : 'WALK-IN',
          name: 'Walk-in Customer',
          isWalkIn: true,
        },
      });
    }
    for (const key of PERMISSION_CATALOG) {
      await tx.permission.upsert({ where: { key }, create: { key }, update: {} });
    }
    const ownerRole = await tx.role.upsert({
      where: { companyId_key: { companyId: company.id, key: 'owner' } },
      create: { companyId: company.id, key: 'owner', name: 'Owner', isSystem: true },
      update: { name: 'Owner', isSystem: true },
    });
    const permissions = await tx.permission.findMany({ select: { id: true } });
    await tx.rolePermission.createMany({
      data: permissions.map(({ id }) => ({
        companyId: company.id,
        roleId: ownerRole.id,
        permissionId: id,
      })),
      skipDuplicates: true,
    });
    const existing = await tx.user.findUnique({
      where: { companyId_email: { companyId: company.id, email: ownerEmail } },
    });
    const owner = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: { firstName: 'Owner', status: 'ACTIVE' },
        })
      : await tx.user.create({
          data: {
            companyId: company.id,
            email: ownerEmail,
            firstName: 'Owner',
            passwordHash,
          },
        });
    await tx.userRole.upsert({
      where: { userId_roleId: { userId: owner.id, roleId: ownerRole.id } },
      create: { companyId: company.id, userId: owner.id, roleId: ownerRole.id },
      update: {},
    });
  });
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
