import type { APIRoute } from "astro";
import { getRedis } from "../../lib/redis";
import { requireAdmin } from "../../lib/adminAuth";

export const GET: APIRoute = async ({ request }) => {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const redis = await getRedis();
  const ids = (await redis.lRange("signup:pending:index", 0, -1)) ?? [];

  const items = [];
  for (const id of ids) {
    const raw = await redis.get(`signup:pending:${id}`);
    if (raw) items.push(JSON.parse(raw));
  }

  // Option : tri par date
  items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" },
  });
};
