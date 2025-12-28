import type { APIRoute } from "astro";
import { getRedis } from "../../lib/redis";
import championsData from "../../data/champions.json";
import planningDataRaw from "../../data/planning.json";
const planningData = planningDataRaw as Record<string, string>;

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

const decodeName = (encoded: string) =>
  decodeURIComponent(escape(atob(encoded)));

export const GET: APIRoute = async ({ request }) => {
  const redis = await getRedis();
  const url = new URL(request.url);

  const date = url.searchParams.get("date") ?? getParisDateString();

  // 🎯 ADMIN DU JOUR
  const encryptedName = planningData[date];
  let target = null;

  if (encryptedName) {
    const name = decodeName(encryptedName);
    target = championsData.find(
      c => c.name.toLowerCase() === name.toLowerCase()
    ) ?? null;
  }

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
    { headers: { "Content-Type": "application/json" } }
  );
};
