import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getArtistProfile } from "@/lib/db/arArtistProfiles";
import { buildArtistDataSnapshot, isRosterArtist } from "@/lib/arArtistProfile";

export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "ver_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { name } = await params;
  let artistNameFromUrl: string;
  try {
    artistNameFromUrl = decodeURIComponent(name);
  } catch {
    return NextResponse.json({ error: "Nombre de artista inválido." }, { status: 400 });
  }

  // Resuelve al nombre canónico real del catálogo antes de armar el
  // snapshot — participants/artist_display son case-sensitive, así que
  // "Lit Killah" tipeado en la URL no matchearía nada si el catálogo lo
  // tiene guardado como "LIT killah". Si no es un artista del roster (nombre
  // viejo, typo, o un perfil ya generado para alguien que salió del roster),
  // se sigue usando el nombre de la URL tal cual — la vista igual muestra lo
  // que haya, solo con menos precisión.
  const rosterEntry = await isRosterArtist(artistNameFromUrl);
  const artistName = rosterEntry?.name ?? artistNameFromUrl;

  const [profile, snapshot] = await Promise.all([
    getArtistProfile(artistName),
    buildArtistDataSnapshot(artistName),
  ]);

  return NextResponse.json({ profile, snapshot });
}
