import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { PERMISSION_CATALOG } from '../src/authorization/permission-catalog';

if (process.env.ALLOW_DEV_SEED !== 'true') {
  throw new Error('Refusing to seed without ALLOW_DEV_SEED=true');
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const key of PERMISSION_CATALOG)
      await tx.permission.upsert({ where: { key }, create: { key }, update: {} });
    const [permissions, ownerRoles] = await Promise.all([
      tx.permission.findMany({
        where: { key: { in: [...PERMISSION_CATALOG] } },
        select: { id: true },
      }),
      tx.role.findMany({
        where: { key: 'owner', isSystem: true },
        select: { id: true, companyId: true },
      }),
    ]);
    for (const role of ownerRoles)
      await tx.rolePermission.createMany({
        data: permissions.map(({ id }) => ({
          companyId: role.companyId,
          roleId: role.id,
          permissionId: id,
        })),
        skipDuplicates: true,
      });
  });
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
