import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getAssignment, listAllAssignments, upsertAssignment } from "@/lib/db/pmArtistAssignments";
import { getArtist } from "@/lib/db/artists";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "administrar_asignaciones_pm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const assignments = await listAllAssignments();
  const enriched = await Promise.all(
    assignments.map(async (a) => {
      const artist = await getArtist(a.artistId);
      return { ...a, photoUrl: artist?.photoUrl ?? null, sello: artist?.sello ?? null };
    })
  );
  return NextResponse.json({ assignments: enriched });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "administrar_asignaciones_pm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { artistId, artistName, pmEmail, reason } = body as {
    artistId?: string; artistName?: string; pmEmail?: string; reason?: string;
  };
  if (!artistId || !artistName || !pmEmail) {
    return NextResponse.json({ error: "Faltan campos obligatorios: artista y PM." }, { status: 400 });
  }

  const existing = await getAssignment(artistId);
  if (existing && existing.pmEmail === pmEmail) {
    return NextResponse.json({ error: "Ese artista ya está asignado a ese PM." }, { status: 400 });
  }
  if (existing && existing.pmEmail !== pmEmail && !reason?.trim()) {
    return NextResponse.json({ error: "Hay que indicar el motivo para transferir este artista." }, { status: 400 });
  }

  const assignment = await upsertAssignment(
    { artistId, artistName, pmEmail, reason: reason?.trim() || null },
    user.email
  );
  return NextResponse.json({ assignment });
}
