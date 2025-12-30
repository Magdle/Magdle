import type { APIRoute } from "astro";
import { getRedis } from "../../lib/redis";
import { getParisDateString } from "../../utils";


export const POST: APIRoute = async ({ request }) => {
  const { playerId, attempts, guessIds } = await request.json();
  const normalizedPlayerId = Number(playerId);
  const hasGuessIds = guessIds !== undefined;
  const validGuessIds =
    Array.isArray(guessIds) &&
    guessIds.every((id) => Number.isInteger(id));

  if (
    !Number.isInteger(normalizedPlayerId) ||
    typeof attempts !== "number" ||
    (hasGuessIds && !validGuessIds)
  ) {
    return new Response("Invalid payload", { status: 400 });
  }



  const date = getParisDateString();
  const redis = await getRedis();

  const playerKey = String(normalizedPlayerId);
  const playedKey = `played:${date}:${playerKey}`;
  const scoreKey = `scores:${date}`;
  const guessesKey = `guesses:${date}`;

  const alreadyPlayed = await redis.exists(playedKey);

  if (alreadyPlayed) {
    return new Response(
      JSON.stringify({ error: "already_played" }),
      { status: 409 }
    );
  }

  // Enregistrement
  await redis.zAdd(scoreKey, [{ score: attempts, value: playerKey }]);
  await redis.hSet(
    guessesKey,
    playerKey,
    JSON.stringify(validGuessIds ? guessIds : [])
  );
  await redis.set(playedKey, "1", { EX: 60 * 60 * 24 * 2 }); // expire apres 2 jours

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { "Content-Type": "application/json" } }
  );
};
// hdhgddhd