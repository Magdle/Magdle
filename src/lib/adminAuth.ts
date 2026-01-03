export function requireAdmin(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token || token !== import.meta.env.ADMIN_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}

