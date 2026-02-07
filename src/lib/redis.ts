// src/lib/redis.ts
import { createClient } from "redis";

type SetOptions = { ex?: number; EX?: number };
type ZItem = { value: string; score: number };

interface RedisLike {
  connect: () => Promise<void>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: SetOptions) => Promise<"OK">;
  del: (key: string) => Promise<number>;
  lPush: (key: string, value: string) => Promise<number>;
  lRange: (key: string, start: number, stop: number) => Promise<string[]>;
  lRem: (key: string, count: number, value: string) => Promise<number>;
  hGet: (key: string, field: string) => Promise<string | null>;
  hGetAll: (key: string) => Promise<Record<string, string>>;
  hSet: (key: string, fieldOrMap: string | Record<string, string>, value?: string) => Promise<number>;
  hSetNX: (key: string, field: string, value: string) => Promise<number>;
  hDel: (key: string, fields: string[]) => Promise<number>;
  zAdd: (key: string, entries: ZItem[]) => Promise<number>;
  zRangeWithScores: (key: string, start: number, stop: number) => Promise<ZItem[]>;
  exists: (key: string) => Promise<number>;
}

class InMemoryRedis implements RedisLike {
  private kv = new Map<string, { value: string; expiresAt: number | null }>();
  private lists = new Map<string, string[]>();
  private hashes = new Map<string, Map<string, string>>();
  private zsets = new Map<string, Map<string, number>>();

  async connect() {
    return;
  }

  private isExpired(key: string) {
    const item = this.kv.get(key);
    if (!item) return true;
    if (item.expiresAt !== null && item.expiresAt <= Date.now()) {
      this.kv.delete(key);
      return true;
    }
    return false;
  }

  async get(key: string) {
    if (this.isExpired(key)) return null;
    return this.kv.get(key)?.value ?? null;
  }

  async set(key: string, value: string, options?: SetOptions) {
    const ttlSeconds = options?.EX ?? options?.ex;
    const expiresAt = typeof ttlSeconds === "number" ? Date.now() + ttlSeconds * 1000 : null;
    this.kv.set(key, { value, expiresAt });
    return "OK" as const;
  }

  async del(key: string) {
    let deleted = 0;
    if (this.kv.delete(key)) deleted += 1;
    if (this.lists.delete(key)) deleted += 1;
    if (this.hashes.delete(key)) deleted += 1;
    if (this.zsets.delete(key)) deleted += 1;
    return deleted;
  }

  async lPush(key: string, value: string) {
    const list = this.lists.get(key) ?? [];
    list.unshift(value);
    this.lists.set(key, list);
    return list.length;
  }

  async lRange(key: string, start: number, stop: number) {
    const list = this.lists.get(key) ?? [];
    const normalizedStop = stop < 0 ? list.length + stop : stop;
    return list.slice(start, normalizedStop + 1);
  }

  async lRem(key: string, count: number, value: string) {
    const list = this.lists.get(key) ?? [];
    let removed = 0;

    if (count === 0) {
      const next = list.filter((item) => {
        if (item === value) {
          removed += 1;
          return false;
        }
        return true;
      });
      this.lists.set(key, next);
      return removed;
    }

    if (count > 0) {
      const next: string[] = [];
      for (const item of list) {
        if (item === value && removed < count) {
          removed += 1;
          continue;
        }
        next.push(item);
      }
      this.lists.set(key, next);
      return removed;
    }

    const absCount = Math.abs(count);
    const reversed = [...list].reverse();
    const next: string[] = [];
    for (const item of reversed) {
      if (item === value && removed < absCount) {
        removed += 1;
        continue;
      }
      next.push(item);
    }
    this.lists.set(key, next.reverse());
    return removed;
  }

  async hGet(key: string, field: string) {
    return this.hashes.get(key)?.get(field) ?? null;
  }

  async hGetAll(key: string) {
    const hash = this.hashes.get(key);
    if (!hash) return {};
    return Object.fromEntries(hash.entries());
  }

  async hSet(key: string, fieldOrMap: string | Record<string, string>, value?: string) {
    const hash = this.hashes.get(key) ?? new Map<string, string>();
    let added = 0;

    if (typeof fieldOrMap === "string") {
      if (value === undefined) {
        throw new Error("hSet requires a value when field is a string");
      }
      if (!hash.has(fieldOrMap)) added += 1;
      hash.set(fieldOrMap, value);
    } else {
      for (const [field, val] of Object.entries(fieldOrMap)) {
        if (!hash.has(field)) added += 1;
        hash.set(field, String(val));
      }
    }

    this.hashes.set(key, hash);
    return added;
  }

  async hSetNX(key: string, field: string, value: string) {
    const hash = this.hashes.get(key) ?? new Map<string, string>();
    if (hash.has(field)) {
      this.hashes.set(key, hash);
      return 0;
    }
    hash.set(field, value);
    this.hashes.set(key, hash);
    return 1;
  }

  async hDel(key: string, fields: string[]) {
    const hash = this.hashes.get(key);
    if (!hash) return 0;
    let deleted = 0;
    for (const field of fields) {
      if (hash.delete(field)) deleted += 1;
    }
    if (hash.size === 0) this.hashes.delete(key);
    return deleted;
  }

  async zAdd(key: string, entries: ZItem[]) {
    const zset = this.zsets.get(key) ?? new Map<string, number>();
    let added = 0;
    for (const entry of entries) {
      if (!zset.has(entry.value)) added += 1;
      zset.set(entry.value, entry.score);
    }
    this.zsets.set(key, zset);
    return added;
  }

  async zRangeWithScores(key: string, start: number, stop: number) {
    const zset = this.zsets.get(key);
    if (!zset) return [];

    const sorted = [...zset.entries()]
      .map(([value, score]) => ({ value, score }))
      .sort((a, b) => a.score - b.score || a.value.localeCompare(b.value));

    const normalizedStop = stop < 0 ? sorted.length + stop : stop;
    return sorted.slice(start, normalizedStop + 1);
  }

  async exists(key: string) {
    if (!this.isExpired(key) && this.kv.has(key)) return 1;
    if (this.lists.has(key)) return 1;
    if (this.hashes.has(key)) return 1;
    if (this.zsets.has(key)) return 1;
    return 0;
  }
}

const redisUrl = process.env.REDIS_URL;
let warnedForFallback = false;

const redisClient = redisUrl
  ? createClient({ url: redisUrl })
  : new InMemoryRedis();

if (redisUrl) {
  redisClient.on("error", (err) => {
    console.error("Redis error:", err.message);
  });
}

let isConnected = false;

export async function getRedis(): Promise<RedisLike> {
  if (!redisUrl && !warnedForFallback) {
    warnedForFallback = true;
    console.warn("REDIS_URL is not defined, using in-memory Redis fallback for local development.");
  }

  if (!isConnected) {
    await redisClient.connect();
    isConnected = true;
  }

  return redisClient as RedisLike;
}
