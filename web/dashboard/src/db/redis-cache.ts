import { Table, getTableName, is } from "drizzle-orm";
import Redis from "ioredis";
import {CacheConfig} from "drizzle-orm/cache/core/types";

export abstract class Cache {
  /** “explicit” means only queries with `.$withCache()` will be cached; “all” means all queries will cache by default */
  strategy(): "explicit" | "all" {
    return "all";
  }

  abstract get(key: string): Promise<any[] | undefined>;
  abstract put(
    key: string,
    response: any[],
    tables: string[],
    config?: CacheConfig
  ): Promise<void>;
  abstract onMutate(options: { tables?: string[]; tags?: string | string[] }): Promise<void>;
}


export class RedisCache extends Cache {
  private usedTablesPerKey: Record<string, string[]> = {};

  private redisClient: Redis;
  private subscriberClient: Redis;


  constructor() {
    super();

    this.redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6380,
      password: process.env.REDIS_PASSWORD,
      tls: {}
    });

    this.subscriberClient = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6380,
      password: process.env.REDIS_PASSWORD,
      tls: {}
    });

    this.subscriberClient.subscribe('cache:mutate', (err, count) => {
      if (err) {
        console.error('Redis subscribe error:', err);
      } else {
        console.log("Subscribed to Redis channel 'cache:mutate', subscription count:", count);
      }
    });

    this.subscriberClient.on('message', (channel, message) => {
      if (channel === 'cache:mutate') {
        console.log("Processing cache:mutate message:", message);
      }
    });
  }

  override strategy(): "explicit" | "all" {
    return "explicit";
  }

  async get(key: string) {
    const value = await this.redisClient.get(key);
    const parsed = value ? JSON.parse(value) : undefined;
    return parsed;
  }

  async put(key: string, response: any, tables: string[]) {
    await this.redisClient.set(key, JSON.stringify(response), "EX", 600); // 5 minutes TTL
    for (const table of tables) {
      if (!this.usedTablesPerKey[table]) this.usedTablesPerKey[table] = [];
      this.usedTablesPerKey[table].push(key);
    }

    try {
      const pubResult = await this.redisClient.publish('cache:mutate', JSON.stringify({ keys: [key] }));
      console.log('Published cache:mutate event for key', key, 'result:', pubResult);
    } catch (e) {
      console.error('Error publishing cache:mutate event:', e);
    }
  }

  async onMutate({tables}: { tables?: string[]; tags?: string | string[] }) {
    const tablesArray = Array.isArray(tables) ? tables : [tables];
    let keysToDelete: string[] = [];
    for (const table of tablesArray) {
      const tableName = is(table, Table) ? getTableName(table) : table;
      const keys = this.usedTablesPerKey[tableName! as string] ?? [];
      for (const key of keys) {
        await this.redisClient.del(key);
        keysToDelete.push(key);
      }
      this.usedTablesPerKey[tableName!] = [];
    }
    // Publish mutation event
    if (keysToDelete.length > 0) {
      try {
        const pubResult = await this.redisClient.publish('cache:mutate', JSON.stringify({ keys: keysToDelete }));
        console.log('Published cache:mutate event for keys', keysToDelete, 'result:', pubResult);
      } catch (e) {
        console.error('Error publishing cache:mutate event:', e);
      }
    }
  }
}
