import type { APIRoute } from "astro";
import { getRedis } from "../../lib/redis";

const getParisDateString = () => {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(new Date());

  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;

  return `${year}-${month}-${day}`;
};

export const GET: APIRoute = async () => {
  const redis = await getRedis();
  const date = getParisDateString();

  const scores = await redis.zRangeWithScores(`scores:${date}`, 0, 50);

  return new Response(JSON.stringify(scores), {
    headers: { "Content-Type": "application/json" },
  });
};
