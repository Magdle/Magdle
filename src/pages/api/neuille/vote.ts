import type { APIRoute } from "astro";
import { voteNeuille } from "../../../lib/neuille";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

type VotePayload = {
  id_clicked?: unknown;
  id_other?: unknown;
  idClicked?: unknown;
  idOther?: unknown;
  draw?: unknown;
};

function toInteger(raw: unknown): number | null {
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
}

function toDrawFlag(raw: unknown): boolean {
  if (raw === true || raw === 1 || raw === "1") return true;
  if (typeof raw === "string") return raw.toLowerCase() === "true";
  return false;
}

async function parsePayload(request: Request): Promise<VotePayload | null> {
  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();

  try {
    if (contentType.includes("application/json")) {
      return (await request.json()) as VotePayload;
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
        draw: form.get("draw"),
      };
    }

    const raw = await request.text();
    if (!raw) return {};
    const params = new URLSearchParams(raw);
    return {
      id_clicked: params.get("id_clicked"),
      id_other: params.get("id_other"),
      idClicked: params.get("idClicked"),
      idOther: params.get("idOther"),
      draw: params.get("draw"),
    };
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

  const idClicked = toInteger(payload.idClicked ?? payload.id_clicked);
  const idOther = toInteger(payload.idOther ?? payload.id_other);
  const draw = toDrawFlag(payload.draw);

  if (idClicked === null || idOther === null || idClicked === idOther) {
    return new Response(JSON.stringify({ error: "invalid_ids" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  try {
    const result = await voteNeuille({ idClicked, idOther, draw });
    if (!result) {
      return new Response(JSON.stringify({ error: "players_not_found" }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }

    return new Response(
      JSON.stringify({
        winner: {
          id: result.clicked.id,
          old_elo: result.clicked.oldElo,
          new_elo: result.clicked.newElo,
        },
        loser: {
          id: result.other.id,
          old_elo: result.other.oldElo,
          new_elo: result.other.newElo,
        },
        draw: result.draw,
      }),
      {
        status: 200,
        headers: JSON_HEADERS,
      }
    );
  } catch (error) {
    console.error("Failed to update neuille elo:", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
