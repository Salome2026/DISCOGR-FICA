import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { geminiConfigured } from "@/lib/gemini";
import { raceTimeout, TimeoutError } from "@/lib/withTimeout";
import { getRankingLatest } from "@/lib/db/listeners";
import { buildArtistDataSnapshot, isRosterArtist } from "@/lib/arArtistProfile";
import { buildArtistCandidatePool, generateArtistOpportunityProfile } from "@/lib/arArtistStrategy";
import { saveOpportunityProfile } from "@/lib/db/arArtistProfiles";

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

  // Un solo fetch de la tabla de ranking, compartido entre el snapshot y el
  // candidatePool — evitá pedirla dos veces por request.
  const ranking = await getRankingLatest();
  const [snapshot, pool] = await Promise.all([
    buildArtistDataSnapshot(rosterEntry.name, ranking),
    buildArtistCandidatePool(rosterEntry.name, ranking),
  ]);

  let opportunityProfile;
  try {
    opportunityProfile = await raceTimeout(generateArtistOpportunityProfile(snapshot, pool), 45_000);
  } catch (err) {
    if (err instanceof TimeoutError) {
      return NextResponse.json({ error: "El agente no respondió a tiempo — probá de nuevo en un rato." }, { status: 504 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido." }, { status: 500 });
  }

  const profile = await saveOpportunityProfile(rosterEntry.name, snapshot.sello, snapshot as unknown as Record<string, unknown>, opportunityProfile, user.email);
  return NextResponse.json({ profile, snapshot });
}
