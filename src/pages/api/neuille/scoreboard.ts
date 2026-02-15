import type { APIRoute } from "astro";
import { getNeuillePlayers } from "../../../lib/neuille";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const GET: APIRoute = async () => {
  try {
    const players = await getNeuillePlayers();
    const sorted = [...players].sort((a, b) => (Number(b.elo) || 1000) - (Number(a.elo) || 1000));

    return new Response(JSON.stringify(sorted), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    console.error("Failed to fetch neuille scoreboard:", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
