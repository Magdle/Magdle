// src/lib/redis.ts
import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is not defined");
}

const client = createClient({
  url: redisUrl,
});

client.on("error", (err) => {
  console.error("Redis error:", err.message);
});

let isConnected = false;

export async function getRedis() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }
  return client;
}
