import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import postgres from 'postgres';
import { neon } from '@neondatabase/serverless';
import { remember } from '@epic-web/remember';
import { instrumentDrizzleClient } from "@kubiks/otel-drizzle";
import * as users from '@/data/users/schema';
import * as projects from '@/data/projects/schema';
import * as member from '@/data/member/schema';
import * as components from '@/data/components/schema';
import * as events from "@/data/events/schema";
import { RedisCache } from "@/db/redis-cache";
import {InMemoryCache} from "@/db/in-memory-cache";


const schema = {
  ...users,
  ...projects,
  ...member,
  ...components,
  ...events,
};

const redisEnabled = process.env.DB_CACHE_STRATEGY;

const cache = remember("redis-cache", () => {
  switch (redisEnabled) {
    case 'redis':
      console.log("Using Redis Cache for DB");
      return new RedisCache();
    default:
      console.log("Using In-Memory Cache for DB. If no ENV variables are set then no caching is used.");
      return new InMemoryCache();
  }
});

function clientFactory() {
  let drizzle, client;

  switch (process.env.DRIZZLE_DATABASE_TYPE) {
    case 'neon':
      drizzle = drizzleNeon;
      client = neon(process.env.DRIZZLE_DATABASE_URL!);
      break;
    default:
      drizzle = drizzlePg;
      let connectionString =
        client = postgres(
          process.env.DRIZZLE_DATABASE_URL!,
          {
            max: process.env.DRIZZLE_DATABASE_MAX_CONNECTIONS ? parseInt(process.env.DRIZZLE_DATABASE_MAX_CONNECTIONS) : 25,
            idle_timeout: 20,
          },
        );
  }

  return drizzle(client, {
    cache,
    schema
  })
}

export const db = remember('db', () =>
  clientFactory(),
);

instrumentDrizzleClient(db);
