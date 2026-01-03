import type { APIRoute } from "astro";
import { getRedis } from "../../lib/redis";

function cleanString(v: unknown, max = 80) {
  return String(v ?? "").trim().slice(0, max);
}

const parseList = (v: unknown) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export const POST: APIRoute = async ({ request }) => {
  const redis = await getRedis();

  const body = await request.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  const name = cleanString(body.name, 80);
  if (name.length < 2) return new Response("Name too short", { status: 400 });

  const birthDate = cleanString(body.birthDate, 20) || null;
  const cheveux = parseList(body.cheveux);
  const relationFamille = cleanString(body.relationFamille, 40) || "";
  const pcPref = parseList(body.pcPref);
  const region = parseList(body.region);
  const neuillitude = cleanString(body.neuillitude, 10) || "";
  const rankLol = cleanString(body.rankLol, 40) || "";
  const boissonPref = cleanString(body.boissonPref, 80) || "";
  const jeuPrefType = cleanString(body.jeuPrefType, 40) || "";

  const fields = {
    birthDate: birthDate || undefined,
    cheveux: cheveux.length ? cheveux : undefined,
    RelationFamille: relationFamille || undefined,
    PcPref: pcPref.length ? pcPref : undefined,
    régio: region.length ? region : undefined,
    neuillitude: neuillitude || undefined,
    RankLol: rankLol || undefined,
    BoissonPref: boissonPref || undefined,
    JeuPrefType: jeuPrefType || undefined,
  };

  const id = `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const payload = {
    id,
    name,
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
