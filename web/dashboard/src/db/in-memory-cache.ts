import {CacheConfig} from "drizzle-orm/cache/core/types";


export const IN_MEMORY_CACHE_TTL = process.env.IN_MEMORY_CACHE_TTL ? parseInt(process.env.IN_MEMORY_CACHE_TTL) * 1000 : 0; // seconds

/**
 * This is a temporary in-memory cache implementation for Drizzle ORM.
 */

export abstract class CustomCache {
  /** “explicit” means only queries with `.$withCache()` will be cached; “all” means all queries will cache by default */
  strategy(): "explicit" | "all" {
    return "explicit";
  }

  abstract get(key: string): Promise<any[] | undefined>;
  abstract put(
    key: string,
    response: any[],
    tables: string[],
    config?: CacheConfig
  ): Promise<void>;
  abstract invalidate(options: { tables?: string[]; tags?: string | string[] }): Promise<void>;
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

  override strategy(): "explicit" | "all" {
    return "explicit";
  }

  async get(key: string): Promise<any[] | undefined> {
    const entry = this.store.get(key);

    if (!entry) return undefined;

    if (entry.expireAt && Date.now() > entry.expireAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async put(
    key: string,
    response: any[],
    tables: string[],
    config?: { px?: number; ex?: number } // minimal
  ): Promise<void> {

    if (IN_MEMORY_CACHE_TTL === 0) {
      return;
    }

    try {
      let expireAt: number | undefined = undefined;

      if (config?.px != null) {
        expireAt = Date.now() + config.px;
      }

      if (!response) {
        return;
      }

      this.store.set(key, {value: response, tables, expireAt});
    } catch (e) {
     console.error("Error storing cache entry:", e);
    }
  }

  async invalidate({ tables, tags }: { tables?: string[]; tags?: string | string[] }): Promise<void> {
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
  }
}
