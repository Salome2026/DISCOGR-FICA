import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { searchPublishingArtists } from "@/lib/db/publishingArtists";

// A PM searching for a person here only ever sees id + display name — the
// rest of the Publishing ficha (DNI, dirección, contacto, etc.) stays behind
// ver_publishing, which PMs don't have.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "crear_split_editorial")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const people = await searchPublishingArtists(q);
  return NextResponse.json({ people: people.map((p) => ({ id: p.id, nombreArtistico: p.nombreArtistico })) });
}
