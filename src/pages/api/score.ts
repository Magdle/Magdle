import type { APIRoute } from "astro";
import { getRedis } from "../../lib/redis";
import { getParisDateString } from "../../utils";


export const POST: APIRoute = async ({ request }) => {
  const { playerName, attempts } = await request.json();

  if (!playerName || typeof attempts !== "number") {
    return new Response("Invalid payload", { status: 400 });
  }

  const date = getParisDateString();
  const redis = await getRedis();

  const playedKey = `played:${date}:${playerName}`;
  const scoreKey = `scores:${date}`;

  const alreadyPlayed = await redis.exists(playedKey);

  if (alreadyPlayed) {
    return new Response(
      JSON.stringify({ error: "already_played" }),
      { status: 409 }
    );
  }

  // Enregistrement
  await redis.zAdd(scoreKey, [{ score: attempts, value: playerName }]);
  await redis.set(playedKey, "1", { EX: 60 * 60 * 24 * 2 }); // expire après 2 jours

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { "Content-Type": "application/json" } }
  );
};
