import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { upsertAssignment } from "@/lib/db/pmArtistAssignments";
import { getArtist } from "@/lib/db/artists";

// No transactions exist anywhere in this codebase (confirmed by grep) — same
// loop-of-upserts precedent as reorderArtistChartPositions(). Each artist is
// its own atomic UPSERT; a partial failure leaves some already transferred,
// which is acceptable here the same way it already is there.
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "administrar_asignaciones_pm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { toPmEmail, artistIds, reason } = body as {
    toPmEmail?: string; artistIds?: string[]; reason?: string;
  };
  if (!toPmEmail || !Array.isArray(artistIds) || artistIds.length === 0) {
    return NextResponse.json({ error: "Faltan campos obligatorios: artistas y PM de destino." }, { status: 400 });
  }
  if (!reason?.trim()) {
    return NextResponse.json({ error: "Hay que indicar el motivo del cambio." }, { status: 400 });
  }

  const results = [];
  for (const artistId of artistIds) {
    const artist = await getArtist(artistId);
    const artistName = artist?.name ?? artistId;
    results.push(await upsertAssignment({ artistId, artistName, pmEmail: toPmEmail, reason: reason.trim() }, user.email));
  }
  return NextResponse.json({ assignments: results });
}
