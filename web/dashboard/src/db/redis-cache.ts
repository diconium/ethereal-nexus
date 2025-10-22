import Redis from "ioredis";
import {Cache, MutationOption} from "drizzle-orm/cache/core/cache"
import type {CacheConfig} from "drizzle-orm/cache/core/types";

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6380,
  password: process.env.REDIS_PASSWORD,
  cacheStrategy: process.env.REDIS_CACHE_STRATEGY || "explicit",
  localCacheTTL: process.env.IN_MEMORY_CACHE_TTL ? parseInt(process.env.IN_MEMORY_CACHE_TTL) : 3600,
  redisCacheTTL: process.env.REDIS_CACHE_TTL ? parseInt(process.env.REDIS_CACHE_TTL) * 24 * 60 * 60 : 30 * 24 * 60 * 60,
}

interface Entry {
  value: any[];
  expireAt?: number;
}

export class RedisCache extends Cache {
  private store = new Map<string, Entry>();

  private redisClient: Redis;
  private subscriberClient: Redis;


  constructor() {
    super();

    const { host, port, password } = redisConfig;

    this.redisClient = new Redis({
      host,
      port,
      password,
      tls: {}
    });

    this.subscriberClient = new Redis({
      host,
      port,
      password,
      tls: {}
    });

    this.subscriberClient.subscribe('cache:mutate');

    this.subscriberClient.on('message', (channel, message) => {
      if (channel === 'cache:mutate') {
        const parsed = JSON.parse(message);
        console.debug("Deleting cache keys from local store:", parsed);

        const arrayOfKeys = Array.isArray(parsed) ? parsed : [];

        for (const key of arrayOfKeys) {
          this.store.delete(key);
        }
      }
    });
  }

  override strategy(): "explicit" | "all" {
    return redisConfig.cacheStrategy  === "all" ? "all" :  "explicit";
  }


  private buildStructuredKey(key: string, tables?: string[]) {
    const tablesPart = tables?.sort().join(",") ?? "";
    return `cache:${tablesPart}:${key}`;
  }

  override async get(key: string, tables: string[], isTag: boolean, isAutoInvalidate?: boolean) {

    const redisKey = this.buildStructuredKey(key, tables);

    const entry = this.store.get(redisKey);

    if (entry && (!entry.expireAt || entry.expireAt > Date.now())) {
      console.log("Local Cache Hit for key:", redisKey, entry.value);
      return entry.value;
    }

    const redisValue = await this.redisClient.get(redisKey);

    if (!redisValue) {
      return undefined;
    }

    const value = JSON.parse(redisValue);

    this.store.set(redisKey, { value, expireAt: Date.now() + (redisConfig.localCacheTTL * 1000) });

    return value;

  }


  override async put(key: string, response: any, tables: string[], isTag: boolean, config?: CacheConfig) {
    const value = JSON.stringify(response);
    const structuredKey = this.buildStructuredKey(key, tables);

    await this.redisClient.set(structuredKey, value, "EX", redisConfig.redisCacheTTL);

    try {
      let expireAt: number | undefined = undefined;
      if (redisConfig.localCacheTTL != null) {
        expireAt = Date.now() + redisConfig.localCacheTTL * 1000;
      }

      if (!response) {
        return;
      }
      this.store.set(structuredKey, {value: response, expireAt});
    } catch (e) {
      console.error("Error storing cache entry:", e);
    }
  }

  override async onMutate(params: MutationOption): Promise<void>  {
    const tables = Array.isArray(params.tables)
      ? params.tables
      : [params.tables];

    for (const table of tables) {
      const stream = this.redisClient.scanStream({match: `cache:*${table}*:*`, count: 100});
      const keys: string[] = [];
      stream.on("data", async (resultKeys: string[]) => {
        if (resultKeys.length === 0) {
          return;
        }
        await this.redisClient.del(...resultKeys);
        keys.push(...resultKeys)
      });
      await new Promise((resolve) => stream.on("end", resolve));

      if (keys.length > 0) {
        await this.redisClient.publish(
          "cache:mutate",
          JSON.stringify(keys)
        );
      }
    }

    return;
  }
}
