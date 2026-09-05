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
  await prisma.$transaction(
    PERMISSION_CATALOG.map((key) =>
      prisma.permission.upsert({ where: { key }, create: { key }, update: {} }),
    ),
  );
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
