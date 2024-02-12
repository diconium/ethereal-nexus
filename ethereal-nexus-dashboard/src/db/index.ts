import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as users from '@/data/users/schema';
import * as projects from '@/data/projects/schema';
import * as member from '@/data/member/schema';
import * as components from '@/data/components/schema';
import { remember } from '@epic-web/remember';

const queryClient = postgres(
  `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${
    process.env.PGHOST
  }:${process.env.PGPORT}/${process.env.PGDATABASE || 'postgres'}`,
  {
    max: 30,
    idle_timeout: 20,
    ssl: false,
  },
);

export const db = remember('db', () =>
  drizzle(queryClient, {
    schema: {
      ...users,
      ...projects,
      ...member,
      ...components,
    },
  }),
);
