import type { APIRoute } from "astro";
import { getRedis } from "../../lib/redis";

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();

  if (!data.nom) {
    return new Response("Missing nom", { status: 400 });
  }

  const redis = await getRedis();

  await redis.set("nom", data.nom);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { "Content-Type": "application/json" } }
  );
};
