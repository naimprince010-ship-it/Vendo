import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url:
      process.env.DATABASE_URL ?? 'postgresql://vendo:change_me@localhost:5432/vendo?schema=public',
    shadowDatabaseUrl:
      process.env.SHADOW_DATABASE_URL ??
      'postgresql://vendo:change_me@localhost:5432/vendo_shadow?schema=public',
  },
});
