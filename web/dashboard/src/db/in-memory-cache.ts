import { CacheConfig } from 'drizzle-orm/cache/core/types';
import { logger } from '@/lib/logger';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('in-memory-cache');

export const IN_MEMORY_CACHE_TTL = process.env.IN_MEMORY_CACHE_TTL
  ? parseInt(process.env.IN_MEMORY_CACHE_TTL) * 1000
  : 0; // seconds

/**
 * This is a temporary in-memory cache implementation for Drizzle ORM.
 */

export abstract class CustomCache {
  /** “explicit” means only queries with `.$withCache()` will be cached; “all” means all queries will cache by default */
  strategy(): 'explicit' | 'all' {
    return 'explicit';
  }

  abstract get(key: string): Promise<any[] | undefined>;
  abstract put(
    key: string,
    response: any[],
    tables: string[],
    config?: CacheConfig,
  ): Promise<void>;
  abstract onMutate(options: {
    tables?: string[];
    tags?: string | string[];
  }): Promise<void>;
}

interface Entry {
  value: any[];
  tables: string[];
  tags?: string[];
  expireAt?: number;
}

export class InMemoryCache extends CustomCache {
  private store = new Map<string, Entry>();

  constructor() {
    super();
  }

  override strategy(): 'explicit' | 'all' {
    return 'explicit';
  }

  async get(key: string): Promise<any[] | undefined> {
    return tracer.startActiveSpan(
      'cache.get',
      { attributes: { 'cache.key': key, 'cache.type': 'in-memory' } },
      async (span) => {
        try {
          const entry = this.store.get(key);

          if (!entry) {
            span.setAttribute('cache.hit', false);
            return undefined;
          }

          if (entry.expireAt && Date.now() > entry.expireAt) {
            this.store.delete(key);
            span.setAttribute('cache.hit', false);
            span.setAttribute('cache.expired', true);
            return undefined;
          }

          span.setAttribute('cache.hit', true);
          return entry.value;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  async put(
    key: string,
    response: any[],
    tables: string[],
    config?: { px?: number; ex?: number }, // minimal
  ): Promise<void> {
    return tracer.startActiveSpan(
      'cache.put',
      {
        attributes: {
          'cache.key': key,
          'cache.tables': tables.join(','),
          'cache.type': 'in-memory',
        },
      },
      async (span) => {
        try {
          if (IN_MEMORY_CACHE_TTL === 0) {
            return;
          }

          let expireAt: number | undefined = undefined;

          if (config?.px != null) {
            expireAt = Date.now() + config.px;
          }

          if (!response) {
            return;
          }

          this.store.set(key, { value: response, tables, expireAt });
        } catch (e) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (e as Error).message,
          });
          logger.error('Failed to store cache entry in memory', e as Error, {
            operation: 'in-memory-cache-put',
            key,
            tables: tables?.join(','),
          });
        } finally {
          span.end();
        }
      },
    );
  }

  async onMutate({
    tables,
    tags,
  }: {
    tables?: string[];
    tags?: string | string[];
  }): Promise<void> {
    return tracer.startActiveSpan(
      'cache.onMutate',
      {
        attributes: {
          'cache.tables': tables?.join(','),
          'cache.tags': Array.isArray(tags) ? tags.join(',') : tags,
          'cache.type': 'in-memory',
        },
      },
      async (span) => {
        try {
          for (const [key, entry] of this.store.entries()) {
            if (tables) {
              // if any table in entry.tables is in the “tables” to invalidate, remove entry
              if (entry.tables.some((t) => tables.includes(t))) {
                this.store.delete(key);
                continue;
              }
            }
            if (tags && entry.tags) {
              const tagsToInvalidate = Array.isArray(tags) ? tags : [tags];
              if (entry.tags.some((t) => tagsToInvalidate.includes(t))) {
                this.store.delete(key);
              }
            }
          }
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }
}
