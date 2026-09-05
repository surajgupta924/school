import Redis from 'ioredis';
import { config } from '../config/index.js';

let redis = null;
let redisAvailable = false;

export function getRedis() {
  return redis;
}

export function isRedisReady() {
  return redisAvailable;
}

export async function connectRedis() {
  try {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 1500,
      retryStrategy: () => null,
    });

    redis.on('error', () => {
      redisAvailable = false;
    });

    await Promise.race([
      redis.connect().then(() => redis.ping()),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 2000)),
    ]);
    redisAvailable = true;
    console.log('Redis connected');
  } catch {
    redisAvailable = false;
    if (redis) {
      try {
        redis.disconnect();
      } catch {
        /* ignore */
      }
    }
    redis = null;
    console.warn('Redis unavailable — using in-memory cache fallback');
  }
}

const memoryCache = new Map();

export async function cacheGet(key) {
  if (redisAvailable && redis) {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet(key, value, ttlSeconds = 60) {
  if (redisAvailable && redis) {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return;
  }
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheDel(patternOrKey) {
  if (redisAvailable && redis) {
    if (patternOrKey.includes('*')) {
      const keys = await redis.keys(patternOrKey);
      if (keys.length) await redis.del(...keys);
    } else {
      await redis.del(patternOrKey);
    }
    return;
  }
  if (patternOrKey.includes('*')) {
    const prefix = patternOrKey.replace('*', '');
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) memoryCache.delete(key);
    }
  } else {
    memoryCache.delete(patternOrKey);
  }
}
