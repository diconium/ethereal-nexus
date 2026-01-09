import Redis, { RedisOptions } from "ioredis";
import {Cache, MutationOption} from "drizzle-orm/cache/core/cache"
import type {CacheConfig} from "drizzle-orm/cache/core/types";
import { logger } from '@/lib/logger';

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6380,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  useTls: process.env.REDIS_USE_TLS !== 'false',
  cacheStrategy: process.env.REDIS_CACHE_STRATEGY || "explicit",
  localCacheTTL: process.env.IN_MEMORY_CACHE_TTL ? parseInt(process.env.IN_MEMORY_CACHE_TTL) : 3600,
  redisCacheTTL: process.env.REDIS_CACHE_TTL ? parseInt(process.env.REDIS_CACHE_TTL) * 24 * 60 * 60 : 30 * 24 * 60 * 60,
  keyPrefix: process.env.REDIS_KEY_PREFIX || process.env.APP_ENV || process.env.NODE_ENV || 'default',
}

// Log Redis configuration on module load
logger.info('Redis cache configuration loaded', {
  operation: 'redis-config-load',
  host: redisConfig.host,
  port: redisConfig.port,
  useTls: redisConfig.useTls,
  cacheStrategy: redisConfig.cacheStrategy,
  localCacheTTL: redisConfig.localCacheTTL,
  redisCacheTTL: redisConfig.redisCacheTTL,
  keyPrefix: redisConfig.keyPrefix,
  hasPassword: !!redisConfig.password,
});

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

    const { host, port, password, useTls } = redisConfig;

    logger.info('Initializing Redis cache', {
      operation: 'redis-cache-init',
      host,
      port,
      useTls,
      cacheStrategy: redisConfig.cacheStrategy,
      localCacheTTL: redisConfig.localCacheTTL,
      redisCacheTTL: redisConfig.redisCacheTTL,
      keyPrefix: redisConfig.keyPrefix,
    });

    const redisOptions: RedisOptions = {
      host,
      port,
      password,
    };

    // TLS is enabled by default for production (Azure/AWS Redis)
    // Explicitly disable for local development
    if (useTls) {
      redisOptions.tls = {};
    }

    this.redisClient = new Redis(redisOptions);
    this.subscriberClient = new Redis(redisOptions);

    // Log connection events
    this.redisClient.on('connect', () => {
      logger.info('Redis client connected', { operation: 'redis-connect' });
    });

    this.redisClient.on('ready', () => {
      logger.info('Redis client ready', { operation: 'redis-ready' });
    });

    this.redisClient.on('error', (err) => {
      logger.error('Redis client error', err, { operation: 'redis-error' });
    });

    this.redisClient.on('close', () => {
      logger.warn('Redis client connection closed', { operation: 'redis-close' });
    });

    this.subscriberClient.on('connect', () => {
      logger.info('Redis subscriber connected', { operation: 'redis-subscriber-connect' });
    });

    this.subscriberClient.on('error', (err) => {
      logger.error('Redis subscriber error', err, { operation: 'redis-subscriber-error' });
    });

    this.subscriberClient.subscribe('cache:mutate');

    this.subscriberClient.on('message', (channel, message) => {
      if (channel === 'cache:mutate') {
        try {
          const parsed = JSON.parse(message);
          const arrayOfKeys = Array.isArray(parsed) ? parsed : [];

          logger.info('Received cache invalidation message', {
            operation: 'redis-cache-invalidate-received',
            channel,
            keyCount: arrayOfKeys.length,
            keys: arrayOfKeys,
            localStoreSize: this.store.size,
          });

          let invalidatedCount = 0;
          for (const key of arrayOfKeys) {
            if (this.store.has(key)) {
              this.store.delete(key);
              invalidatedCount++;
            }
          }

          logger.info('Cache keys invalidated from local store', {
            operation: 'redis-cache-invalidate-complete',
            totalKeys: arrayOfKeys.length,
            invalidatedCount,
            remainingStoreSize: this.store.size,
          });
        } catch (err) {
          logger.error('Failed to process cache invalidation message', err as Error, {
            operation: 'redis-cache-invalidate-error',
            channel,
            message,
          });
        }
      }
    });
  }

  override strategy(): "explicit" | "all" {
    return redisConfig.cacheStrategy  === "all" ? "all" :  "explicit";
  }


  private buildStructuredKey(key: string, tables?: string[]) {
    const tablesPart = tables?.sort().join(",") ?? "";
    return `${redisConfig.keyPrefix}:cache:${tablesPart}:${key}`;
  }

  override async get(key: string, tables: string[], isTag: boolean, isAutoInvalidate?: boolean) {
    const redisKey = this.buildStructuredKey(key, tables);
    const now = Date.now();

    // Check local cache first
    const entry = this.store.get(redisKey);
    if (entry && (!entry.expireAt || entry.expireAt > now)) {
      logger.debug('Local cache hit', {
        operation: 'redis-cache-get',
        cacheLevel: 'local',
        key: redisKey,
        tables: tables?.join(','),
        isTag,
        isAutoInvalidate,
        expiresIn: entry.expireAt ? Math.round((entry.expireAt - now) / 1000) : null,
        localStoreSize: this.store.size,
      });
      return entry.value;
    }

    if (entry && entry.expireAt && entry.expireAt <= now) {
      logger.debug('Local cache entry expired', {
        operation: 'redis-cache-get',
        cacheLevel: 'local',
        key: redisKey,
        expiredAgo: Math.round((now - entry.expireAt) / 1000),
      });
      this.store.delete(redisKey);
    }

    // Check Redis cache
    try {
      const startTime = Date.now();
      const redisValue = await this.redisClient.get(redisKey);
      const duration = Date.now() - startTime;

      if (!redisValue) {
        logger.debug('Cache miss', {
          operation: 'redis-cache-get',
          cacheLevel: 'redis',
          key: redisKey,
          tables: tables?.join(','),
          isTag,
          isAutoInvalidate,
          duration,
        });
        return undefined;
      }

      const value = JSON.parse(redisValue);
      const expireAt = now + (redisConfig.localCacheTTL * 1000);

      this.store.set(redisKey, { value, expireAt });

      logger.debug('Redis cache hit', {
        operation: 'redis-cache-get',
        cacheLevel: 'redis',
        key: redisKey,
        tables: tables?.join(','),
        isTag,
        isAutoInvalidate,
        duration,
        promotedToLocal: true,
        localExpiresIn: redisConfig.localCacheTTL,
        localStoreSize: this.store.size,
      });

      return value;
    } catch (err) {
      logger.error('Failed to get cache entry from Redis', err as Error, {
        operation: 'redis-cache-get-error',
        key: redisKey,
        tables: tables?.join(','),
        isTag,
        isAutoInvalidate,
      });
      return undefined;
    }
  }


  override async put(key: string, response: any, tables: string[], isTag: boolean, config?: CacheConfig) {
    if (!response) {
      logger.debug('Skipping cache put - no response', {
        operation: 'redis-cache-put',
        key,
        tables: tables?.join(','),
        isTag,
      });
      return;
    }

    const value = JSON.stringify(response);
    const structuredKey = this.buildStructuredKey(key, tables);
    const ttl = redisConfig.redisCacheTTL;

    try {
      const startTime = Date.now();
      await this.redisClient.set(structuredKey, value, "EX", ttl);
      const duration = Date.now() - startTime;

      logger.debug('Cache entry stored in Redis', {
        operation: 'redis-cache-put',
        cacheLevel: 'redis',
        key: structuredKey,
        tables: tables?.join(','),
        isTag,
        ttl,
        valueSize: value.length,
        duration,
      });

      // Store in local cache
      let expireAt: number | undefined = undefined;
      if (redisConfig.localCacheTTL != null) {
        expireAt = Date.now() + redisConfig.localCacheTTL * 1000;
      }

      this.store.set(structuredKey, { value: response, expireAt });

      logger.debug('Cache entry stored in local store', {
        operation: 'redis-cache-put',
        cacheLevel: 'local',
        key: structuredKey,
        tables: tables?.join(','),
        isTag,
        localTTL: redisConfig.localCacheTTL,
        localStoreSize: this.store.size,
      });
    } catch (err) {
      logger.error('Failed to store cache entry', err as Error, {
        operation: 'redis-cache-put-error',
        key: structuredKey,
        tables: tables?.join(','),
        isTag,
        valueSize: value.length,
        ttl,
      });
    }
  }

  override async onMutate(params: MutationOption): Promise<void>  {
    const tables = Array.isArray(params.tables)
      ? params.tables
      : [params.tables];

    logger.info('Starting cache invalidation', {
      operation: 'redis-cache-mutate-start',
      tables,
      tableCount: tables.length,
    });

    const overallStartTime = Date.now();
    let totalKeysInvalidated = 0;

    for (const table of tables) {
      try {
        const tableStartTime = Date.now();
        const pattern = `${redisConfig.keyPrefix}:cache:*${table}*:*`;
        const stream = this.redisClient.scanStream({ match: pattern, count: 100 });
        const keys: string[] = [];

        stream.on("data", async (resultKeys: string[]) => {
          if (resultKeys.length === 0) {
            return;
          }

          logger.debug('Found keys to invalidate', {
            operation: 'redis-cache-mutate-scan',
            table,
            pattern,
            keysFound: resultKeys.length,
            keys: resultKeys,
          });

          try {
            await this.redisClient.del(...resultKeys);
            keys.push(...resultKeys);
            totalKeysInvalidated += resultKeys.length;

            logger.debug('Keys deleted from Redis', {
              operation: 'redis-cache-mutate-delete',
              table,
              deletedCount: resultKeys.length,
            });
          } catch (err) {
            logger.error('Failed to delete keys from Redis', err as Error, {
              operation: 'redis-cache-mutate-delete-error',
              table,
              keys: resultKeys,
            });
          }
        });

        await new Promise((resolve) => stream.on("end", resolve));

        const tableDuration = Date.now() - tableStartTime;

        if (keys.length > 0) {
          try {
            await this.redisClient.publish(
              "cache:mutate",
              JSON.stringify(keys)
            );

            logger.info('Published cache invalidation message', {
              operation: 'redis-cache-mutate-publish',
              table,
              pattern,
              keysInvalidated: keys.length,
              duration: tableDuration,
            });
          } catch (err) {
            logger.error('Failed to publish cache invalidation message', err as Error, {
              operation: 'redis-cache-mutate-publish-error',
              table,
              keys,
            });
          }
        } else {
          logger.debug('No keys found to invalidate', {
            operation: 'redis-cache-mutate-scan',
            table,
            pattern,
            duration: tableDuration,
          });
        }
      } catch (err) {
        logger.error('Failed to invalidate cache for table', err as Error, {
          operation: 'redis-cache-mutate-table-error',
          table,
        });
      }
    }

    const overallDuration = Date.now() - overallStartTime;

    logger.info('Cache invalidation completed', {
      operation: 'redis-cache-mutate-complete',
      tables,
      tableCount: tables.length,
      totalKeysInvalidated,
      duration: overallDuration,
    });

    return;
  }
}
