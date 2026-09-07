import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { geminiConfigured } from "@/lib/gemini";
import { raceTimeout, TimeoutError } from "@/lib/withTimeout";
import { buildArtistDataSnapshot, generateArtistCreativeProfile, isRosterArtist } from "@/lib/arArtistProfile";
import { saveCreativeProfile } from "@/lib/db/arArtistProfiles";

export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!geminiConfigured()) {
    return NextResponse.json({ error: "GEMINI_API_KEY no está configurado todavía." }, { status: 400 });
  }
  const { name } = await params;
  let artistName: string;
  try {
    artistName = decodeURIComponent(name);
  } catch {
    return NextResponse.json({ error: "Nombre de artista inválido." }, { status: 400 });
  }

  const rosterEntry = await isRosterArtist(artistName);
  if (!rosterEntry) {
    return NextResponse.json({ error: "Ese nombre no corresponde a ningún artista del roster." }, { status: 404 });
  }

  const snapshot = await buildArtistDataSnapshot(rosterEntry.name);

  let creativeProfile;
  try {
    creativeProfile = await raceTimeout(generateArtistCreativeProfile(snapshot), 45_000);
  } catch (err) {
    if (err instanceof TimeoutError) {
      return NextResponse.json({ error: "El agente no respondió a tiempo — probá de nuevo en un rato." }, { status: 504 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido." }, { status: 500 });
  }

  const profile = await saveCreativeProfile(rosterEntry.name, snapshot.sello, snapshot as unknown as Record<string, unknown>, creativeProfile, user.email);
  return NextResponse.json({ profile, snapshot });
}
