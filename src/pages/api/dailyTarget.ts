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

  const existingTarget = await redis.hGet(dailyHashKey, today);
  if (existingTarget) {
    const existingId = Number(existingTarget);
    const isNumericId = Number.isFinite(existingId) && String(existingId) === existingTarget;
    return new Response(
      JSON.stringify(isNumericId ? { id: existingId } : { name: existingTarget }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const rawLastPickedHash = await redis.hGetAll(lastPickedHashKey);
  const normalizedLastPicked: Record<string, string> = { ...rawLastPickedHash };
  const migrateSet: Record<string, string> = {};
  const migrateDel: string[] = [];

  for (const [key, val] of Object.entries(rawLastPickedHash)) {
    const numericKey = Number(key);
    const isNumericKey = Number.isInteger(numericKey) && String(numericKey) === key;
    if (isNumericKey) continue;

    const matchByName = championsData.find((c) => c.name === key);
    if (matchByName) {
      const idKey = String(matchByName.id);
      normalizedLastPicked[idKey] = val;
      migrateSet[idKey] = val;
    }
    migrateDel.push(key);
  }

  if (Object.keys(migrateSet).length > 0) {
    await redis.hSet(lastPickedHashKey, migrateSet);
  }
  if (migrateDel.length > 0) {
    await redis.hDel(lastPickedHashKey, migrateDel);
  }

  const lastPickedHash = normalizedLastPicked;
  const weights = [];

  for (const c of championsData) {
    const last = lastPickedHash[String(c.id)];
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

  const lastPickedPayload: Record<string, string> = { [String(finalKey)]: today };
  await redis.hSet(lastPickedHashKey, lastPickedPayload);

  const finalId = Number(finalTarget);
  const isNumeric = Number.isFinite(finalId) && String(finalId) === finalTarget;

  return new Response(
    JSON.stringify(isNumeric ? { id: finalId } : { name: finalKey }),
    { headers: { "Content-Type": "application/json" } }
  );
};
