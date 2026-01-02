import type { APIRoute } from "astro";
import championsData from "../../data/champions.json";
import { getRedis } from "../../lib/redis";
import { getParisDateString } from "../../utils";


const getWeight = (daysSinceLastPick: number | null) => {
  if (daysSinceLastPick === null) return 1;        // jamais choisi
  return Math.max(0.05, Math.min(1, daysSinceLastPick / 10));
};

function pickWeighted(
  champions: typeof championsData,
  weights: number[]
) {
  const total = weights.reduce((a, b) => a + b, 0);
  let rnd = Math.random() * total;

  for (let i = 0; i < champions.length; i++) {
    rnd -= weights[i];
    if (rnd <= 0) return champions[i];
  }

  return champions[champions.length - 1];
}



export const GET: APIRoute = async () => {
  const redis = await getRedis();
  const today = getParisDateString();

  const dailyHashKey = "daily:targets";
  const lastPickedHashKey = "daily:lastPicked";

  // 1️⃣ Déjà calculé ?
  const existingTarget = await redis.hGet(dailyHashKey, today);
  if (existingTarget) {
    const existingId = Number(existingTarget);
    const isNumericId = Number.isFinite(existingId) && String(existingId) === existingTarget;
    return new Response(
      JSON.stringify(isNumericId ? { id: existingId } : { name: existingTarget }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const legacyHash = await redis.hGetAll(dailyHashKey);
  const legacyEntry = Object.entries(legacyHash)
    .find(([, date]) => date === today);
  if (legacyEntry) {
    const [legacyTarget] = legacyEntry;
    await redis.hSet(dailyHashKey, today, legacyTarget);
    const legacyId = Number(legacyTarget);
    const isNumericId = Number.isFinite(legacyId) && String(legacyId) === legacyTarget;
    return new Response(
      JSON.stringify(isNumericId ? { id: legacyId } : { name: legacyTarget }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const legacyTarget = await redis.get(`daily:target:${today}`);
  if (legacyTarget) {
    await redis.hSet(dailyHashKey, today, legacyTarget);
    const legacyId = Number(legacyTarget);
    const isNumericId = Number.isFinite(legacyId) && String(legacyId) === legacyTarget;
    return new Response(
      JSON.stringify(isNumericId ? { id: legacyId } : { name: legacyTarget }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // 2) Calcul pondéré (lecture des lastPicked en 1 seul hGetAll)
  let lastPickedHash = await redis.hGetAll(lastPickedHashKey);

  if (Object.keys(lastPickedHash).length === 0) {
    const legacyKeys = championsData.flatMap((c) => [
      `daily:lastPicked:${c.id}`,
      `daily:lastPicked:${c.name}`,
    ]);
    const legacyValues = await redis.mGet(legacyKeys);
    const migrated: Record<string, string> = {};
    for (let i = 0; i < championsData.length; i++) {
      const byId = legacyValues[i * 2];
      const byName = legacyValues[i * 2 + 1];
      const val = byId ?? byName;
      if (val) {
        migrated[String(championsData[i].id)] = val;
        migrated[championsData[i].name] = val;
      }
    }
    if (Object.keys(migrated).length > 0) {
      await redis.hSet(lastPickedHashKey, migrated);
      lastPickedHash = migrated;
    }
  }
  const weights = [];

  for (const c of championsData) {
    const last = lastPickedHash[String(c.id)] ?? lastPickedHash[c.name];
    if (!last) {
      weights.push(1);
    } else {
      const diffDays =
        (new Date(today).getTime() - new Date(last).getTime()) /
        (1000 * 60 * 60 * 24);
      weights.push(getWeight(Math.floor(diffDays)));
    }
  }

  const selected = pickWeighted(championsData, weights);

  // 3️⃣ Sauvegarde
  const candidate = String(selected.id);
  const inserted = await redis.hSetNX(dailyHashKey, today, candidate);
  const finalTarget = inserted ? candidate : await redis.hGet(dailyHashKey, today);
  const finalKey = finalTarget ?? candidate;

  const targetChampion = championsData.find((c) => String(c.id) === String(finalKey));
  const lastPickedPayload: Record<string, string> = { [String(finalKey)]: today };
  if (targetChampion?.name) lastPickedPayload[targetChampion.name] = today;
  await redis.hSet(lastPickedHashKey, lastPickedPayload);

  const finalId = Number(finalTarget);
  const isNumeric = Number.isFinite(finalId) && String(finalId) === finalTarget;

  return new Response(
    JSON.stringify(isNumeric ? { id: finalId } : { name: finalKey }),
    { headers: { "Content-Type": "application/json" } }
  );
};
