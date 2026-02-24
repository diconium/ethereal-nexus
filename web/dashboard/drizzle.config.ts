import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config({
  path: '.env.local',
});

export default defineConfig({
  out: './drizzle',
  schema: ['src/data/**/schema.ts'],
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DRIZZLE_DATABASE_URL!,
  },
  verbose: true,
});
