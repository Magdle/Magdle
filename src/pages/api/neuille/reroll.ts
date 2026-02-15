import type { APIRoute } from "astro";
import { getNeuillePlayers, pickNeuillePair } from "../../../lib/neuille";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

type RerollPayload = {
  id_clicked?: unknown;
  id_other?: unknown;
  idClicked?: unknown;
  idOther?: unknown;
};

function toInteger(raw: unknown): number | null {
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
}

async function parsePayload(request: Request): Promise<RerollPayload | null> {
  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();

  try {
    if (contentType.includes("application/json")) {
      return (await request.json()) as RerollPayload;
    }

    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const form = await request.formData();
      return {
        id_clicked: form.get("id_clicked"),
        id_other: form.get("id_other"),
        idClicked: form.get("idClicked"),
        idOther: form.get("idOther"),
      };
    }

    return {};
  } catch {
    return null;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const payload = await parsePayload(request);
  if (!payload) {
    return new Response(JSON.stringify({ error: "invalid_payload" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  try {
    const players = await getNeuillePlayers();
    const pair = pickNeuillePair(players, {
      id1: toInteger(payload.idClicked ?? payload.id_clicked),
      id2: toInteger(payload.idOther ?? payload.id_other),
    });

    if (!pair) {
      return new Response(JSON.stringify({ error: "not_enough_players" }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const [item1, item2] = pair;
    return new Response(
      JSON.stringify({
        item1: {
          id: item1.id,
          name: item1.name,
          image: `/neuille/images/${item1.imageId}.jpg`,
        },
        item2: {
          id: item2.id,
          name: item2.name,
          image: `/neuille/images/${item2.imageId}.jpg`,
        },
      }),
      {
        status: 200,
        headers: JSON_HEADERS,
      }
    );
  } catch (error) {
    console.error("Failed to reroll neuille pair:", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
