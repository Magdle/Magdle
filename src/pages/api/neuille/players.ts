import type { APIRoute } from "astro";
import { getNeuillePlayers } from "../../../lib/neuille";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const GET: APIRoute = async () => {
  try {
    const players = await getNeuillePlayers();
    return new Response(JSON.stringify(players), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    console.error("Failed to fetch neuille players:", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
