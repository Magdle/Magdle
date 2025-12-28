import type { APIRoute } from "astro";
import { getRedis } from "../../lib/redis";

export const GET: APIRoute = async () => {
  const redis = await getRedis();

  const value = await redis.get("nom");

  return new Response(
    JSON.stringify({ nom: value }),
    { headers: { "Content-Type": "application/json" } }
  );
};
