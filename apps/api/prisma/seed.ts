import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

if (process.env.ALLOW_DEV_SEED !== 'true') {
  throw new Error('Refusing to seed without ALLOW_DEV_SEED=true');
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const permissionKeys = [
  'sale.create',
  'sale.view',
  'sale.void',
  'sale.refund',
  'sale.discount',
  'sale.override_price',
  'product.create',
  'product.edit',
  'product.view_cost',
  'inventory.view',
  'inventory.adjust',
  'inventory.transfer',
  'purchase.create',
  'purchase.approve',
  'purchase.receive',
  'customer.create',
  'customer.edit',
  'supplier.create',
  'supplier.edit',
  'cash.open_shift',
  'cash.close_shift',
  'report.view_sales',
  'report.view_profit',
  'settings.manage',
];

async function main(): Promise<void> {
  await prisma.$transaction(
    permissionKeys.map((key) =>
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
