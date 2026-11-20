import { getRole } from "@/lib/access";
import { getNbaEdition } from "@/lib/nba-feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!await getRole()) return Response.json({ error: "Inicia sesión para continuar." }, { status: 401, headers });
  const edition = await getNbaEdition();
  return Response.json(edition, { status: edition.checkedAt === null ? 503 : 200, headers });
}
