import type { APIRoute } from "astro";
import { getRedis } from "../../lib/redis";
import championsData from "../../data/champions.json";

const getParisDateString = () => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const y = parts.find(p => p.type === "year")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  const d = parts.find(p => p.type === "day")!.value;

  return `${y}-${m}-${d}`;
};

export const GET: APIRoute = async ({ request }) => {
  const redis = await getRedis();
  const url = new URL(request.url);

  const date = url.searchParams.get("date") ?? getParisDateString();

  // 🎯 ADMIN DU JOUR (depuis Redis)
  const dailyHashKey = "daily:targets";
  const targetsById = await redis.hGetAll(dailyHashKey);
  const targetEntry = Object.entries(targetsById)
    .find(([, storedDate]) => storedDate === date);
  let target = null;
  if (targetEntry) {
    const [targetRef] = targetEntry;
    const targetId = Number(targetRef);
    const isNumericId = Number.isFinite(targetId) && String(targetId) === targetRef;
    target = isNumericId
      ? championsData.find(c => c.id === targetId) ?? null
      : championsData.find(c => c.name === targetRef) ?? null;
  } else {
    const legacyRef = await redis.get(`daily:target:${date}`);
    if (legacyRef) {
      const targetId = Number(legacyRef);
      const isNumericId = Number.isFinite(targetId) && String(targetId) === legacyRef;
      target = isNumericId
        ? championsData.find(c => c.id === targetId) ?? null
        : championsData.find(c => c.name === legacyRef) ?? null;
    }
  }
  // 🏆 SCORES
  const scores = await redis.zRangeWithScores(
    `scores:${date}`,
    0,
    50
  );

  return new Response(
    JSON.stringify({
      date,
      target,
      scores,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
};