// src/pages/api/redis-test.ts
import type { APIRoute } from "astro";
import { getRedis } from "../../lib/redis";

export const GET: APIRoute = async () => {
  const redis = await getRedis();

  await redis.set("test", "ok");
  const value = await redis.get("test");

  return new Response(JSON.stringify({ value }));
};
