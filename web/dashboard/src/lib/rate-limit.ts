import { createHash } from 'node:crypto';
import Redis from 'ioredis';
import { logger } from '@/lib/logger';

type CounterEntry = {
  value: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  current: number;
  remaining: number;
  resetSeconds: number;
};

export type UsageResult = {
  current: number;
  remaining: number;
  resetSeconds: number;
};

export type IdentityStrategy = {
  useIp: boolean;
  useSessionCookie: boolean;
  useFingerprint: boolean;
  fingerprintHeaderName: string;
};

export type IdentityResolution = {
  identities: Array<{ source: 'ip' | 'session' | 'fingerprint'; key: string }>;
  usedIp: boolean;
  usedSessionCookie: boolean;
  usedFingerprint: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __etherealRateLimitStore: Map<string, CounterEntry> | undefined;
  // eslint-disable-next-line no-var
  var __etherealRateLimitRedis: Redis | undefined;
}

const memoryStore = globalThis.__etherealRateLimitStore ?? new Map();
globalThis.__etherealRateLimitStore = memoryStore;

function getRedisClient() {
  if (!process.env.REDIS_HOST) {
    return null;
  }

  if (!globalThis.__etherealRateLimitRedis) {
    const redis = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6380,
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_USE_TLS !== 'false' ? {} : undefined,
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });

    redis.on('error', (error) => {
      logger.error('Rate limit redis client error', error, {
        operation: 'rate-limit-redis-error',
      });
    });

    globalThis.__etherealRateLimitRedis = redis;
  }

  return globalThis.__etherealRateLimitRedis;
}

async function ensureRedisConnection(redis: Redis) {
  await redis.connect().catch(() => undefined);
}

function hashValue(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

function readMemoryCounter(key: string, windowSeconds: number) {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt <= now) {
    const fresh = {
      value: 0,
      resetAt: now + windowSeconds * 1000,
    };
    memoryStore.set(key, fresh);
    return fresh;
  }

  return entry;
}

async function incrementRedisCounter(
  key: string,
  amount: number,
  windowSeconds: number,
) {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Redis unavailable');
  }

  await ensureRedisConnection(redis);

  const namespacedKey = `rate-limit:${key}`;
  const current = await redis.incrby(namespacedKey, amount);
  if (current === amount) {
    await redis.expire(namespacedKey, windowSeconds);
  }

  const ttl = await redis.ttl(namespacedKey);
  return {
    current,
    resetSeconds: ttl > 0 ? ttl : windowSeconds,
  };
}

function incrementMemoryCounter(
  key: string,
  amount: number,
  windowSeconds: number,
) {
  const entry = readMemoryCounter(key, windowSeconds);
  entry.value += amount;
  memoryStore.set(key, entry);
  return {
    current: entry.value,
    resetSeconds: Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000)),
  };
}

async function getRedisTtl(key: string) {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Redis unavailable');
  }

  await ensureRedisConnection(redis);
  return redis.ttl(`rate-limit:${key}`);
}

function getMemoryTtl(key: string) {
  const entry = memoryStore.get(key);
  if (!entry) {
    return -1;
  }

  return Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000));
}

async function getRedisValue(key: string) {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Redis unavailable');
  }

  await ensureRedisConnection(redis);
  const raw = await redis.get(`rate-limit:${key}`);
  return raw ? Number(raw) : 0;
}

function getMemoryValue(key: string) {
  return readMemoryCounter(key, 1).value;
}

async function setRedisValue(key: string, value: number, ttlSeconds: number) {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Redis unavailable');
  }

  await ensureRedisConnection(redis);
  await redis.set(`rate-limit:${key}`, String(value), 'EX', ttlSeconds);
}

function setMemoryValue(key: string, value: number, ttlSeconds: number) {
  memoryStore.set(key, {
    value,
    resetAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function checkRateLimit(
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  try {
    const result = await incrementRedisCounter(
      options.key,
      1,
      options.windowSeconds,
    );
    return {
      allowed: result.current <= options.limit,
      current: result.current,
      remaining: Math.max(0, options.limit - result.current),
      resetSeconds: result.resetSeconds,
    };
  } catch {
    const result = incrementMemoryCounter(
      options.key,
      1,
      options.windowSeconds,
    );
    return {
      allowed: result.current <= options.limit,
      current: result.current,
      remaining: Math.max(0, options.limit - result.current),
      resetSeconds: result.resetSeconds,
    };
  }
}

export async function incrementUsageCounter(options: {
  key: string;
  amount: number;
  limit: number;
  windowSeconds: number;
}): Promise<UsageResult> {
  try {
    const result = await incrementRedisCounter(
      options.key,
      options.amount,
      options.windowSeconds,
    );
    return {
      current: result.current,
      remaining: Math.max(0, options.limit - result.current),
      resetSeconds: result.resetSeconds,
    };
  } catch {
    const result = incrementMemoryCounter(
      options.key,
      options.amount,
      options.windowSeconds,
    );
    return {
      current: result.current,
      remaining: Math.max(0, options.limit - result.current),
      resetSeconds: result.resetSeconds,
    };
  }
}

export async function getCounterState(key: string) {
  try {
    const current = await getRedisValue(key);
    const ttl = await getRedisTtl(key);
    return { current, resetSeconds: ttl > 0 ? ttl : 0 };
  } catch {
    return {
      current: getMemoryValue(key),
      resetSeconds: Math.max(0, getMemoryTtl(key)),
    };
  }
}

export async function getTemporaryBlock(key: string) {
  const blockKey = `block:${key}`;
  const state = await getCounterState(blockKey);
  return {
    blocked: state.current > 0 && state.resetSeconds > 0,
    resetSeconds: state.resetSeconds,
  };
}

export async function registerViolationAndMaybeBlock(options: {
  key: string;
  threshold: number;
  violationWindowSeconds: number;
  blockDurationSeconds: number;
}) {
  const violationKey = `violations:${options.key}`;
  const blockKey = `block:${options.key}`;

  // Never issue a temporary block against unidentifiable or loopback addresses.
  // Keying a block on 'unknown' or 'localhost' would lock out all requests that
  // share that fallback identity (e.g. every browser tab on a dev machine).
  const keyLower = options.key.toLowerCase();
  const isUnidentifiable =
    keyLower.includes(':unknown') || keyLower.includes(':localhost');

  const usage = await incrementUsageCounter({
    key: violationKey,
    amount: 1,
    limit: options.threshold,
    windowSeconds: options.violationWindowSeconds,
  });

  if (!isUnidentifiable && usage.current >= options.threshold) {
    try {
      await setRedisValue(blockKey, 1, options.blockDurationSeconds);
    } catch {
      setMemoryValue(blockKey, 1, options.blockDurationSeconds);
    }

    return {
      blocked: true,
      resetSeconds: options.blockDurationSeconds,
      violations: usage.current,
    };
  }

  return {
    blocked: false,
    resetSeconds: usage.resetSeconds,
    violations: usage.current,
  };
}

const LOOPBACK = new Set(['::1', '127.0.0.1', '::ffff:127.0.0.1']);

function normaliseIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!trimmed) return null;
  // Normalise all loopback variants to a single stable key so they share
  // one rate-limit bucket and are excluded from temporary blocks.
  return LOOPBACK.has(trimmed) ? 'localhost' : trimmed;
}

export function getClientIp(request: Request) {
  // Next.js exposes the connection address as a non-standard property
  const nextIp = normaliseIp((request as any).ip);
  if (nextIp) return nextIp;

  // Forwarded IP headers are only safe when a trusted proxy strips any
  // client-supplied values before adding its own.
  if (process.env.TRUST_PROXY_IP_HEADERS === 'true') {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      const ip = normaliseIp(forwardedFor.split(',')[0]);
      if (ip) return ip;
    }

    const realIp = normaliseIp(request.headers.get('x-real-ip'));
    if (realIp) return realIp;
  }

  return 'unknown';
}

export function getSessionCookieIdentifier(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  const cookieNames = [
    '__Secure-authjs.session-token',
    'authjs.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.session-token',
  ];

  for (const cookieName of cookieNames) {
    const escapedName = cookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = cookieHeader.match(
      new RegExp(`(?:^|; )${escapedName}=([^;]+)`),
    );
    if (match?.[1]) {
      return hashValue(`${cookieName}:${match[1]}`);
    }
  }

  return null;
}

export function getFingerprintIdentifier(
  request: Request,
  headerName?: string | null,
) {
  const normalizedHeaderName = headerName?.trim();
  if (
    !normalizedHeaderName ||
    !/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(normalizedHeaderName)
  ) {
    return null;
  }

  const value = request.headers.get(normalizedHeaderName);
  if (!value) {
    return null;
  }

  return hashValue(value);
}

export function buildIdentityResolution(
  request: Request,
  strategy: IdentityStrategy,
): IdentityResolution {
  const identities: IdentityResolution['identities'] = [];
  let usedIp = false;
  let usedSessionCookie = false;
  let usedFingerprint = false;

  if (strategy.useIp) {
    const clientIp = getClientIp(request);
    const ipKey =
      clientIp === 'unknown'
        ? `unknown:${hashValue(
            [
              request.headers.get('user-agent') ?? '',
              request.headers.get('accept-language') ?? '',
            ].join('|'),
          )}`
        : clientIp;
    identities.push({ source: 'ip', key: `ip:${ipKey}` });
    usedIp = true;
  }

  if (strategy.useSessionCookie) {
    const session = getSessionCookieIdentifier(request);
    if (session) {
      identities.push({ source: 'session', key: `session:${session}` });
      usedSessionCookie = true;
    }
  }

  if (strategy.useFingerprint) {
    const fingerprint = getFingerprintIdentifier(
      request,
      strategy.fingerprintHeaderName,
    );
    if (fingerprint) {
      identities.push({
        source: 'fingerprint',
        key: `fingerprint:${fingerprint}`,
      });
      usedFingerprint = true;
    }
  }

  if (!identities.length) {
    const clientIp = getClientIp(request);
    const ipKey =
      clientIp === 'unknown'
        ? `unknown:${hashValue(
            [
              request.headers.get('user-agent') ?? '',
              request.headers.get('accept-language') ?? '',
            ].join('|'),
          )}`
        : clientIp;
    identities.push({ source: 'ip', key: `ip:${ipKey}` });
    usedIp = true;
  }

  return {
    identities,
    usedIp,
    usedSessionCookie,
    usedFingerprint,
  };
}

export function estimateTokenCount(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

// ---------------------------------------------------------------------------
// Block inspection + management (admin dashboard use)
// ---------------------------------------------------------------------------

export type BlockEntry = {
  /** The full rate-limit key, e.g. "search:my-slug:ip:1.2.3.4" */
  key: string;
  /** Seconds remaining until the block expires */
  resetSeconds: number;
};

/**
 * Returns all active block entries whose key starts with the given prefix.
 * Uses Redis SCAN when available, falls back to the in-memory store.
 */
export async function listActiveBlocks(scopePrefix: string): Promise<BlockEntry[]> {
  const blockKeyPrefix = `block:${scopePrefix}`;
  const redisPrefix = `rate-limit:${blockKeyPrefix}`;

  const redis = getRedisClient();
  if (redis) {
    try {
      await ensureRedisConnection(redis);
      const keys: string[] = [];
      let cursor = '0';
      do {
        const [nextCursor, batch] = await redis.scan(
          cursor,
          'MATCH',
          `${redisPrefix}*`,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        keys.push(...batch);
      } while (cursor !== '0');

      const entries: BlockEntry[] = [];
      for (const redisKey of keys) {
        const value = await redis.get(redisKey);
        if (value == null || value === '0') continue;
        const ttl = await redis.ttl(redisKey);
        if (ttl <= 0) continue;
        // Strip the "rate-limit:" namespace prefix to get the logical key
        const logicalKey = redisKey.slice('rate-limit:'.length).slice('block:'.length);
        entries.push({ key: logicalKey, resetSeconds: ttl });
      }
      return entries;
    } catch {
      // Fall through to in-memory
    }
  }

  // In-memory fallback
  const now = Date.now();
  const entries: BlockEntry[] = [];
  for (const [storeKey, entry] of memoryStore.entries()) {
    if (!storeKey.startsWith(blockKeyPrefix)) continue;
    if (entry.value <= 0 || entry.resetAt <= now) continue;
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);
    entries.push({ key: storeKey.slice('block:'.length), resetSeconds });
  }
  return entries;
}

/**
 * Deletes all block (and violation) keys whose logical key starts with the
 * given prefix.  Returns the number of keys cleared.
 */
export async function clearBlocks(scopePrefix: string): Promise<number> {
  const patterns = [`block:${scopePrefix}`, `violations:${scopePrefix}`];
  let cleared = 0;

  const redis = getRedisClient();
  if (redis) {
    try {
      await ensureRedisConnection(redis);
      for (const pattern of patterns) {
        const redisPattern = `rate-limit:${pattern}*`;
        let cursor = '0';
        do {
          const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', redisPattern, 'COUNT', 100);
          cursor = nextCursor;
          if (keys.length > 0) {
            await redis.del(...keys);
            cleared += keys.length;
          }
        } while (cursor !== '0');
      }
      return cleared;
    } catch {
      // Fall through to in-memory
    }
  }

  // In-memory fallback
  for (const pattern of patterns) {
    for (const key of [...memoryStore.keys()]) {
      if (key.startsWith(pattern)) {
        memoryStore.delete(key);
        cleared++;
      }
    }
  }
  return cleared;
}
