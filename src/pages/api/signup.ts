import type { APIRoute } from "astro";
import { getRedis } from "../../lib/redis";

function cleanString(v: unknown, max = 80) {
  return String(v ?? "").trim().slice(0, max);
}

const parseListToString = (v: unknown) => {
  const parts = String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.join(", ");
};

export const POST: APIRoute = async ({ request }) => {
  const redis = await getRedis();

  const body = await request.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  const name = cleanString(body.name, 80);
  if (name.length < 2) return new Response("Name too short", { status: 400 });

  const birthDate = cleanString(body.birthDate, 20);
  const cheveux = parseListToString(body.cheveux);
  const relationFamille = cleanString(body.relationFamille, 40);
  const pcPref = parseListToString(body.pcPref);
  const region = parseListToString(body.region);
  const neuillitude = cleanString(body.neuillitude, 10);
  const rankLol = cleanString(body.rankLol, 40);
  const boissonPref = cleanString(body.boissonPref, 80);
  const jeuPrefType = cleanString(body.jeuPrefType, 40);
  const comment = cleanString(body.comment, 400);

  const required = {
    birthDate,
    cheveux,
    relationFamille,
    pcPref,
    region,
    neuillitude,
    rankLol,
    boissonPref,
    jeuPrefType,
  };
  const missing = Object.entries(required)
    .filter(([, v]) => !v || !String(v).trim())
    .map(([k]) => k);
  if (missing.length) {
    return new Response(`Missing fields: ${missing.join(", ")}`, { status: 400 });
  }

  const fields = {
    birthDate,
    cheveux,
    RelationFamille: relationFamille,
    PcPref: pcPref,
    régio: region,
    neuillitude,
    RankLol: rankLol,
    BoissonPref: boissonPref,
    JeuPrefType: jeuPrefType,
  };

  const id = `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const payload = {
    id,
    name,
    comment: comment || undefined,
    fields,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  await redis.set(`signup:pending:${id}`, JSON.stringify(payload), { ex: 60 * 60 * 24 * 7 });
  await redis.lPush("signup:pending:index", id);

  return new Response(JSON.stringify({ ok: true, requestId: id }), {
    headers: { "Content-Type": "application/json" },
  });
};
