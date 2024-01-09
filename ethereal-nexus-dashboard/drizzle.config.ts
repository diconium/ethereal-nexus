import type { Config } from "drizzle-kit";
import * as dotenv from 'dotenv';

dotenv.config({
  path: '.env.local',
});
export default {
  schema: "./src/data/**/schema.ts",
  out: "./drizzle",
  driver: 'pg',
  dbCredentials: {
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: 'postgres',
    ssl: true
  }
} satisfies Config;
