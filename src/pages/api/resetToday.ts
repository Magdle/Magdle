import type { APIRoute } from "astro";
import { getRedis } from "../../lib/redis";

const getParisDateString = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" })
  );
  return d.toISOString().slice(0, 10);
};

export const POST: APIRoute = async () => {
  const redis = await getRedis();
  const date = getParisDateString();

  const scoreKey = `scores:${date}`;

  // ⚠️ Upstash ne supporte pas DEL played:date:*
  // donc il faut lister les clés
  const playedKeys = await redis.keys(`played:${date}:*`);

  if (playedKeys.length > 0) {
    await redis.del(...playedKeys);
  }

  await redis.del(scoreKey);

  return new Response(
    JSON.stringify({ success: true, date }),
    { headers: { "Content-Type": "application/json" } }
  );
};
