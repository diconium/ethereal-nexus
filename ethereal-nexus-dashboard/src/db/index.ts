import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const queryClient = postgres(
  `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${
    process.env.PGHOST
  }:${process.env.PGPORT}/${process.env.PGDATABASE || 'postgres'}`,
  {
    ssl: false,
  },
);
export const db = drizzle(queryClient);
