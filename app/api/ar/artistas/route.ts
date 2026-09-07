import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getRosterArtistEntries } from "@/lib/roster";
import { listArtistProfileKeys, artistKeyFor } from "@/lib/db/arArtistProfiles";

// Roster real (excluye "Remix" y "Streamings" — canales/compilados, no
// artistas de verdad, un análisis de identidad/featuring no tiene sentido
// para ellos) marcado con si ya tiene un análisis generado, para que el
// picker distinga de un vistazo quién ya tiene ficha de quién no.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "ver_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const [roster, profileKeys] = await Promise.all([
    getRosterArtistEntries({ excludeSellos: ["Remix", "Streamings"] }),
    listArtistProfileKeys(),
  ]);
  const artists = roster
    .map((a) => ({ ...a, hasProfile: profileKeys.has(artistKeyFor(a.name)) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ artists });
}
