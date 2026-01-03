import type { APIRoute } from "astro";
import { getRedis } from "../../lib/redis";
import { requireAdmin } from "../../lib/adminAuth";

export const POST: APIRoute = async ({ request }) => {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { requestId, reason } = await request.json().catch(() => ({}));
  if (!requestId) return new Response("Missing requestId", { status: 400 });

  const redis = await getRedis();
  const key = `signup:pending:${requestId}`;
  const raw = await redis.get(key);
  if (!raw) return new Response("Not found", { status: 404 });

  // archive optionnel
  await redis.set(
    `signup:rejected:${requestId}`,
    JSON.stringify({ ...JSON.parse(raw), status: "rejected", reason: reason || null }),
    { ex: 60 * 60 * 24 * 7 }
  );

  await redis.del(key);
  await redis.lRem("signup:pending:index", 0, requestId);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
