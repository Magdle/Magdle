import type { APIRoute } from "astro";
import { getRedis } from "../../lib/redis";
import { requireAdmin } from "../../lib/adminAuth";

const GH = "https://api.github.com";

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
}

export const POST: APIRoute = async ({ request }) => {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { requestId } = await request.json();
  if (!requestId) return new Response("Missing requestId", { status: 400 });

  const redis = await getRedis();
  const raw = await redis.get(`signup:pending:${requestId}`);
  if (!raw) return new Response("Not found", { status: 404 });

  const pending = JSON.parse(raw);
  const name = String(pending.name || "").trim();
  if (name.length < 2) return new Response("Invalid name", { status: 400 });

  const token = import.meta.env.GITHUB_TOKEN as string;
  const owner = import.meta.env.GITHUB_OWNER as string;
  const repo = import.meta.env.GITHUB_REPO as string;
  const base = (import.meta.env.GITHUB_DEFAULT_BRANCH as string) || "main";
  const filePath = (import.meta.env.CHAMPIONS_JSON_PATH as string) || "src/data/champions.json";

  // 1) SHA de main
  const refRes = await fetch(`${GH}/repos/${owner}/${repo}/git/ref/heads/${base}`, {
    headers: ghHeaders(token),
  });
  const refJson = await refRes.json();
  const baseSha = refJson.object.sha;

  // 2) nouvelle branche
  const branch = `signup/${requestId}`;
  await fetch(`${GH}/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers: ghHeaders(token),
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  });

  // 3) lire champions.json
  const fileRes = await fetch(`${GH}/repos/${owner}/${repo}/contents/${filePath}?ref=${base}`, {
    headers: ghHeaders(token),
  });
  if (!fileRes.ok) {
    const txt = await fileRes.text();
    return new Response(txt || `Failed to load ${filePath}`, { status: 500 });
  }
  const fileJson = await fileRes.json();
  const fileSha = fileJson.sha;
  const contentStr = Buffer.from(fileJson.content ?? "", "base64")
    .toString("utf-8")
    .replace(/^\uFEFF/, ""); // strip potential BOM (UTF-8 with BOM)
  let champions;
  try {
    champions = JSON.parse(contentStr);
  } catch (err) {
    console.error("Invalid champions.json content", err);
    return new Response("Invalid champions.json", { status: 500 });
  }

  // 4) dédupe + ajout
  const exists = champions.some((c: any) => String(c.name).toLowerCase() === name.toLowerCase());
  if (exists) return new Response("Already exists", { status: 409 });

  const maxId = champions.reduce((m: number, c: any) => Math.max(m, Number(c.id) || 0), 0);
  const newEntry = { id: maxId + 1, name, ...pending.fields };
  champions.push(newEntry);

  const newStr = JSON.stringify(champions, null, 2) + "\n";
  const newB64 = Buffer.from(newStr, "utf-8").toString("base64");

  // 5) commit fichier sur branche
  await fetch(`${GH}/repos/${owner}/${repo}/contents/${filePath}`, {
    method: "PUT",
    headers: ghHeaders(token),
    body: JSON.stringify({
      message: `Add player: ${name}`,
      content: newB64,
      sha: fileSha,
      branch,
    }),
  });

  // 6) créer PR
  const prRes = await fetch(`${GH}/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: ghHeaders(token),
    body: JSON.stringify({
      title: `Add player: ${name}`,
      head: branch,
      base,
      body: `Signup request approved: ${requestId}`,
    }),
  });

  const prJson = await prRes.json();

  // 7) retirer du pending
  await redis.del(`signup:pending:${requestId}`);
  await redis.lRem("signup:pending:index", 0, requestId);

  return new Response(JSON.stringify({ ok: true, prUrl: prJson.html_url }), {
    headers: { "Content-Type": "application/json" },
  });
};
