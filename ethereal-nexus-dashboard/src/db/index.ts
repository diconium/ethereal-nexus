import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as users from '@/data/users/schema';
import * as projects from '@/data/projects/schema';
import * as member from '@/data/member/schema';

const queryClient = postgres(
  `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${
    process.env.PGHOST
  }:${process.env.PGPORT}/${process.env.PGDATABASE || 'postgres'}`,
  {
    ssl: true,
  }
);

export const db = drizzle(queryClient, { schema: { ...users, ...projects, ...member } });
