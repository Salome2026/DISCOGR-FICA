import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { spotifyConfigured, searchArtistByName } from "@/lib/spotify";
import { listAllArtists, updateArtistManagementFields } from "@/lib/db/artists";

// Backfills a profile photo (from the label's own connected Spotify account)
// for every artist row that doesn't have one yet — same safety principle as
// the Chartmetric-based app/api/booking/artists/sync-photos: only accepts an
// exact (normalized) name match, so a short/generic stage name never ends up
// with a stranger's face instead of no photo at all.
export async function POST() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.email || !hasPermission(user, "administrar_usuarios")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!(await spotifyConfigured())) {
    return NextResponse.json({ error: "Spotify no está conectado." }, { status: 400 });
  }

  const artists = await listAllArtists();
  const missing = artists.filter((a) => !a.photoUrl);

  const matched: string[] = [];
  const notFound: string[] = [];

  for (const artist of missing) {
    try {
      const match = await searchArtistByName(artist.name);
      if (!match?.imageUrl) {
        notFound.push(artist.name);
        continue;
      }
      await updateArtistManagementFields(artist.id, artist.name, { photoUrl: match.imageUrl }, user.email);
      matched.push(artist.name);
    } catch {
      notFound.push(artist.name);
    }
  }

  return NextResponse.json({ matched, notFound });
}
