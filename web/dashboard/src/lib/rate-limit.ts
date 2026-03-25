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
  const usage = await incrementUsageCounter({
    key: violationKey,
    amount: 1,
    limit: options.threshold,
    windowSeconds: options.violationWindowSeconds,
  });

  if (usage.current >= options.threshold) {
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

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
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
  if (!headerName) {
    return null;
  }

  const value = request.headers.get(headerName);
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
    identities.push({ source: 'ip', key: `ip:${getClientIp(request)}` });
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
    identities.push({ source: 'ip', key: `ip:${getClientIp(request)}` });
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
